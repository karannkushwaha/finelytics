import { PrismaClient } from "@prisma/client";
export const prismaDB = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prismaDB;
}
