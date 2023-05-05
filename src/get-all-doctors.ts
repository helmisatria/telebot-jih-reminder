import { Page } from "playwright-chromium";
import { prisma } from "./app";

export const getAllDoctors = async (page: Page) => {
  // Get the list of doctor options
  const options = await page.$$('select[name="ddDaftarDokter"] option');

  const allDoctorNames = await Promise.all(
    options.map(async (option) => {
      const text = await option.innerText();
      return text;
    })
  );

  // sort ascending
  const ALL_DOCTOR_NAMES = allDoctorNames.sort();

  const savedDoctors = await prisma.doctor.findMany();
  const upsertDoctors = ALL_DOCTOR_NAMES.filter((name) => {
    return (
      !name.includes("Select") &&
      !savedDoctors.some((doctor) => doctor.name === name)
    );
  }).map((name) => {
    return prisma.doctor.create({
      data: { name },
    });
  });

  Promise.all(upsertDoctors);

  return { ALL_DOCTOR_NAMES, options };
};
