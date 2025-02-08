"use server";
import { prismaDB } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/utils/auth";
import { revalidatePath } from "next/cache";

const serializeTransaction = (obj) => ({
  ...obj,
  amount: obj.amount?.toNumber(),
});

export const createTransaction = async (data) => {
  try {
    const loggedInUser = await getAuthenticatedUser();

    const account = await prismaDB.account.findUniqueOrThrow({
      where: { id: data.accountId, userId: loggedInUser.id },
    });

    const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
    const newBalance = account.balance + balanceChange;

    const transaction = await prismaDB.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          ...data,
          userId: loggedInUser.id,
          nextRecurringDate: getNextRecurringDate(data),
        },
      });

      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: newBalance },
      });

      return newTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);

    return { success: true, data: serializeTransaction(transaction) };
  } catch (error) {
    console.error("Error creating account:", error);
    return { success: false, message: error.message || "An error occurred" };
  }
};

const getNextRecurringDate = ({ isRecurring, recurringInterval, date }) => {
  if (!isRecurring || !recurringInterval) return null;
  const nextDate = new Date(date);
  const intervalMap = {
    DAILY: () => nextDate.setDate(nextDate.getDate() + 1),
    WEEKLY: () => nextDate.setDate(nextDate.getDate() + 7),
    MONTHLY: () => nextDate.setMonth(nextDate.getMonth() + 1),
    YEARLY: () => nextDate.setFullYear(nextDate.getFullYear() + 1),
  };

  intervalMap[recurringInterval]?.();
  return nextDate;
};
