import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
// @ts-expect-error
prisma.$on("error", (e) => {
  console.log("Prisma Error: " + e);
});
// @ts-expect-error
prisma.$on("warn", (e) => {
  console.log("Prisma Warn: " + e);
});

export default prisma;
