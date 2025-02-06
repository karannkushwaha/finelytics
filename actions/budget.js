"use server";
import { prismaDB } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/utils/auth";
import { revalidatePath } from "next/cache";

export const getCurrentBudget = async (accountId) => {
  try {
    const loggedInUser = await getAuthenticatedUser();
    const budget = await prismaDB.budget.findFirst({
      where: {
        userId: loggedInUser.id,
      },
    });

    const currentDate = new Date();
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );
    if (!accountId) {
      throw new Error("accountId is required");
    }

    const expenses = await prismaDB.transaction.aggregate({
      where: {
        userId: loggedInUser.id,
        type: "EXPENSE",
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        accountId,
      },
      _sum: {
        amount: true,
      },
    });

    return {
      budget: budget ? { ...budget, amount: budget.amount.toNumber() } : null,
      currentExpenses: expenses._sum.amount
        ? expenses._sum.amount.toNumber()
        : 0,
    };
  } catch (error) {
    console.error("Error fetching budget and expenses:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred.",
    };
  }
};

export const updateBudget = async (amount) => {
  try {
    if (typeof amount !== "number" || amount < 0) {
      throw new Error("Invalid amount: Amount must be a positive number.");
    }
    const loggedInUser = await getAuthenticatedUser();
    const budget = await prismaDB.budget.upsert({
      where: {
        userId: loggedInUser.id,
      },
      update: {
        amount,
      },
      create: {
        userId: loggedInUser.id,
        amount,
      },
    });

    revalidatePath("/dashboard");

    return {
      success: true,
      data: { ...budget, amount: budget.amount.toNumber() },
    };
  } catch (error) {
    console.error("Error updating budget:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred.",
    };
  }
};
