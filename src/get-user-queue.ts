import { User } from "@prisma/client";
import { Browser, ElementHandle, Page } from "playwright-chromium";
import { bot, prisma } from "./app";

export const getUserQueueInfo = async ({
  page,
  user,
  ALL_DOCTOR_NAMES,
  guruOptionsElements,
}: {
  page: Page;
  user: User;
  browser: Browser;
  ALL_DOCTOR_NAMES: string[];
  guruOptionsElements: ElementHandle<HTMLElement | SVGElement>[];
}) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: Number(user.doctor_id) },
  });

  if (!user.queue_id) {
    console.log(`Queue ID has not been set yet for the user: ${user.id}`);
    return;
  }

  if (!doctor?.name) {
    console.log("Doctor not found");
    return;
  }

  if (ALL_DOCTOR_NAMES.every((name) => !name?.includes?.(doctor?.name))) {
    console.log("Doctor not found");
    return;
  }

  for (const option of guruOptionsElements) {
    const text = await option.innerText().catch(() => null);
    if (text?.includes?.(doctor?.name)) {
      await option.evaluate(
        (option) => ((option as HTMLOptionElement).selected = true)
      );
      break;
    }
  }

  // Click on the "Refresh" button to reveal the list of next patients
  await page.click("#Button1");

  // wait until "Ticket Number" found
  const queues = await page
    .waitForSelector("#dg_next .ItemGrid span", {
      timeout: 3000,
    })
    .catch(async () => {
      console.log(`No queue found for user: ${user.id}`);
    });

  if (!queues) {
    return;
  }

  // Get the list of next patients
  const nextPatients = await page.$$eval(
    "#dg_next .ItemGrid span",
    (patients) => patients.map((patient) => patient.textContent)
  );

  // Get the list of skipped patients
  const skippedPatients = await page.$$eval(
    "#dg_skip .ItemGrid span",
    (patients) => patients.map((patient) => patient.textContent)
  );

  // Get current patient from #lblCurrent
  const currentPatient = await page.$eval(
    "#lblCurrent",
    (el) => el.textContent
  );

  // Get the list of finished patients
  const finishedPatients = (
    await page.$$eval("#dg_finished .ItemGrid span", (patients) =>
      patients.map((patient, index) => {
        if (index % 2 === 0) {
          // If the index is even, it's the ticket number
          return `${patient.textContent}, `;
        } else {
          // If the index is odd, it's the finish time
          return `${patient.textContent}\n`;
        }
      })
    )
  )
    .join("")
    .split("\n")
    .filter((patient) => patient);

  // Next patients that already checked in will have a "*" in front of their ticket number
  const checkedInPatients = nextPatients.filter(
    (patient) => !patient?.includes("*")
  );

  // All patients that havent checked in yet
  const notCheckedInPatients = nextPatients.filter((patient) =>
    patient?.includes("*")
  );

  // console.log("skippedPatients -->", skippedPatients);
  // console.log("finishedPatients -->", finishedPatients);
  // console.log("checkedInPatients -->", checkedInPatients);

  // Find the index of the patient with the ticket number
  const isCheckedIn = nextPatients.findIndex(
    (patient) => patient === user.queue_id
  );

  const nextPatientsToCheckOnQueue = isCheckedIn
    ? checkedInPatients
    : nextPatients;

  const myQueue =
    nextPatientsToCheckOnQueue.findIndex((patient) =>
      patient?.includes(user.queue_id ?? "")
    ) + 1;

  let numAheadNotChecked = 0;
  for (const patient of notCheckedInPatients) {
    const patientQueue = patient?.split("-")[1];
    if (
      patientQueue &&
      parseInt(patientQueue) < Number(user.queue_id.split("-")[1])
    ) {
      numAheadNotChecked++;
    } else {
      break;
    }
  }

  // Log the list of next patients
  // console.log(nextPatients);

  await prisma.user
    .update({
      where: { id: user.id },
      data: { queue_current: myQueue },
    })
    .then(() => {
      console.log("User queue_current updated successfully");
    })
    .catch((e) => {
      console.error("Error updating user queue_current");
    });

  console.log("myQueue -->", myQueue);
  if (user.queue_current !== myQueue && myQueue > 0) {
    const patientsFinished = finishedPatients.length;
    const patientsSkipped = skippedPatients.length;

    const totalPatientsInQueue = patientsSkipped + checkedInPatients.length;
    const isCheckedIn = checkedInPatients.some((patient) =>
      patient?.includes?.(user.queue_id ?? "")
    );

    const message = `🏥 Queue update for Jogja International Hospital:
  
  -    🏥 Position: *${myQueue}*/${totalPatientsInQueue} ${
      !isCheckedIn ? "(You're not checked in yet.)" : ""
    }
  -    👩‍⚕️ Doctor: ${doctor?.name}
  -    📋 Your Queue ID: ${user.queue_id}
  -    🚑 Current patient being handled: ${
    currentPatient ?? "No patient being handled"
  }
  
  -    👀 Patients seen: ${patientsFinished}
  -    😔 Patients missed: ${patientsSkipped}
  -    👥 Patients ahead of you: ${myQueue - 1}
  -    ⏳ Patients with smaller queue numbers ahead of you and haven't checked in yet: ${numAheadNotChecked}
  
  Hang in there! 😊👍    
    
  `;
    bot.sendMessage(user.chat_id, message, { parse_mode: "Markdown" });
  }
};
