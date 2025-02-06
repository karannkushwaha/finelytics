"use server";
import { prismaDB } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/utils/auth";
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
    const loggedInUser = await getAuthenticatedUser();

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
    const loggedInUser = await getAuthenticatedUser();
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

export const bulkDeleteTransactions = async (transactionIds) => {
  try {
    const loggedInUser = await getAuthenticatedUser();

    const transactions = await prismaDB.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId: loggedInUser.id,
      },
    });

    const accountBalanceChanges = transactions.reduce((acc, transaction) => {
      const change =
        transaction.type === "EXPENSE"
          ? transaction.amount
          : -transaction.amount;
      acc[transaction.accountId] = (acc[transaction.accountId] || 0) + change;
      return acc;
    }, {});

    await prismaDB.$transaction(async (tx) => {
      await tx.transaction.deleteMany({
        where: {
          id: { in: transactionIds },
          userId: loggedInUser.id,
        },
      });

      await Promise.all(
        Object.entries(accountBalanceChanges).map(
          ([accountId, balanceChange]) =>
            tx.account.update({
              where: { id: accountId },
              data: {
                balance: {
                  increment: balanceChange,
                },
              },
            })
        )
      );
    });

    revalidatePath("/dashboard");
    revalidatePath("/account/[id]");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in bulkDeleteTransactions:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred",
    };
  }
};
