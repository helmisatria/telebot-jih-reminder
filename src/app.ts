import { chromium, Browser, BrowserContext, Page } from "playwright-chromium";

import express, { Request, Response } from "express";
import TelegramBot from "node-telegram-bot-api";

import { PrismaClient } from "@prisma/client";
import { getAllDoctors } from "./get-all-doctors";
import { getUserQueueInfo } from "./get-user-queue";

import { config } from "dotenv";

config();

// No need to pass any parameters as we will handle the updates with Express
const TOKEN = process.env.TELEGRAM_TOKEN as string;
const API_HOST = process.env.API_HOST as string;
const ITERATION_DELAY_MS = Number(process.env.ITERATION_DELAY_MS) || 60_000; // 1 minute

export const prisma = new PrismaClient();
export const bot = new TelegramBot(TOKEN);

// This informs the Telegram servers of the new webhook.
bot.setWebHook(`${API_HOST}/bot${TOKEN}`);

bot.setMyCommands([
  { command: "/start", description: "Start the bot" },
  { command: "/doctor", description: "List all doctors" },
  { command: "/queue", description: "Check the queue" },
]);

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  await prisma.user.upsert({
    where: { chat_id: chatId.toString() },
    update: {
      name: msg.from?.first_name ?? "" + msg.from?.last_name ?? "" ?? "Unknown",
      username: msg.from?.username ?? "",
    },
    create: {
      chat_id: String(chatId),
      name: msg.from?.first_name ?? "" + msg.from?.last_name ?? "" ?? "Unknown",
      username: msg.from?.username ?? "",
    },
  });
});

bot.onText(/\/queue/, async (msg) => {
  const chatId = msg.chat.id;

  const sendInvalidPatternMessage = () => {
    // correct format: /queue <doctor-number <your-queue-number>. Like: /queue 12 143-24
    bot.sendMessage(
      chatId,
      `Mohon maaf, format yang Anda gunakan salah. Berikut adalah contoh format yang benar:
${"```\n/queue <nomor-dokter> <nomor-antrean-anda>\nContoh: /queue 12 143-24\n```"}`,
      { parse_mode: "Markdown" }
    );
  };

  if (!msg.text) {
    return sendInvalidPatternMessage();
  }

  const [, doctorNumber, userQueueId] = msg.text.split(" ");

  if (!doctorNumber || !userQueueId) {
    return sendInvalidPatternMessage();
  }

  const foundDoctor = await prisma.doctor.findUnique({
    where: { id: Number(doctorNumber) },
  });

  if (!foundDoctor) {
    bot.sendMessage(
      chatId,
      'Maaf, nomor dokter yang Anda masukkan salah. Silakan coba lagi dengan mengetikkan "/doctor" untuk melihat daftar dokter yang tersedia'
    );
    return;
  }

  await prisma.user.update({
    where: { chat_id: String(chatId) },
    data: {
      doctor_id: String(foundDoctor.id),
      queue_id: userQueueId,
      queue_current: null,
    },
  });

  bot.sendMessage(
    chatId,
    `Got it. I will check the queue for you and inform you when your queue is changed`
  );
});

bot.onText(/\/doctor/, async (msg) => {
  const chatId = msg.chat.id;

  const ALL_DOCTOR_NAMES = await prisma.doctor.findMany();

  if (ALL_DOCTOR_NAMES.length === 0) {
    bot.sendMessage(chatId, "Please wait while we fetch the doctors list");
    return;
  }

  // send message all doctor names with the array index (exclude first item)
  const message = ALL_DOCTOR_NAMES.map((doctor) => {
    return `${doctor.id}. ${doctor.name}`;
  });

  bot.sendMessage(chatId, message.join("\n"));
});

const app: express.Application = express();

// parse the updates to JSON
app.use(express.json());

// We are receiving updates at the route below!
app.post(`/bot${TOKEN}`, (req: Request, res: Response) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get("/", (req: Request, res: Response) => {
  res.send("Hello!");
});

// Start Express Server
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Express server is listening on ${port}`);
});

async function checkQueue() {
  const browser: Browser = await chromium.launch({
    // headless: false,
  });
  const context: BrowserContext = await browser.newContext();
  const page: Page = await context.newPage();

  // Navigate to the JIH hospital queue info website
  await page.goto("https://infoantrian.rs-jih.co.id/");

  const { ALL_DOCTOR_NAMES, options } = await getAllDoctors(page);

  await prisma.user.findMany().then(async (users) => {
    return users.forEach(async (user) => {
      const startTime = Date.now();

      await getUserQueueInfo({
        page,
        user,
        ALL_DOCTOR_NAMES,
        browser,
        guruOptionsElements: options,
      });

      const endTime = Date.now();
      const timeInSeconds = (endTime - startTime) / 1000;

      console.log(
        `getUserQueueInfo for user ${
          user.username || user.chat_id
        }: ${timeInSeconds} seconds`
      );
    });
  });
}

console.log("ITERATION_DELAY_MS -->", ITERATION_DELAY_MS);

setInterval(async () => {
  await checkQueue();
}, ITERATION_DELAY_MS);
