"use server";
import { prismaDB } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const serializeTransaction = (obj) => {
  return {
    ...obj,
    balance: obj.balance?.toNumber(),
    amount: obj.amount?.toNumber(),
  };
};

export const updateDefaultAccount = async (accountId) => {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const loggedInUser = await prismaDB.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });
    if (!loggedInUser) {
      throw new Error("User not found");
    }

    const existingAccounts = await prismaDB.account.findMany({
      where: {
        userId: loggedInUser.id,
      },
    });

    const targetAccount = existingAccounts.find((acc) => acc.id === accountId);
    if (!targetAccount) {
      throw new Error("Account not found");
    }

    await prismaDB.account.updateMany({
      where: {
        userId: loggedInUser.id,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    const updatedAccount = await prismaDB.account.update({
      where: {
        id: accountId,
        userId: loggedInUser.id,
      },
      data: {
        isDefault: true,
      },
    });

    revalidatePath("/dashboard");

    return {
      success: true,
      data: serializeTransaction(updatedAccount),
    };
  } catch (err) {
    console.error("Error updating default account:", err);
    return {
      success: false,
      message: err.message || "An unexpected error occurred",
    };
  }
};

export const getAccountWithTransactions = async (accountId) => {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const loggedInUser = await prismaDB.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });
    if (!loggedInUser) {
      throw new Error("User not found");
    }

    const account = await prismaDB.account.findUnique({
      where: {
        id: accountId,
        userId: loggedInUser.id,
      },
      include: {
        transactions: {
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    return {
      success: true,
      data: {
        ...serializeTransaction(account),
        transactions: account.transactions.map(serializeTransaction),
      },
    };
  } catch (err) {
    console.error("Error fetching account with transactions:", err);
    return {
      success: false,
      message: err.message || "An unexpected error occurred",
    };
  }
};
