"use server";

import { prismaDB } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const serializeTransaction = (transaction) => {
  return {
    ...transaction,
    balance: transaction.balance?.toNumber(),
    amount: transaction.amount?.toNumber(),
  };
};

export const createAccount = async (userData) => {
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

    const balanceFloat = parseFloat(userData.balance);
    if (isNaN(balanceFloat)) {
      throw new Error("Invalid balance");
    }
    const existingAccount = await prismaDB.account.findMany({
      where: {
        userId: loggedInUser.id,
      },
    });

    const shouldBeDefault =
      existingAccount.length === 0 ? true : userData.isDefault;
    if (shouldBeDefault) {
      await prismaDB.account.updateMany({
        where: {
          userId: loggedInUser.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const newAccount = await prismaDB.account.create({
      data: {
        ...userData,
        balance: balanceFloat,
        userId: loggedInUser.id,
        isDefault: shouldBeDefault,
      },
    });
    revalidatePath("/dashboard");
    return {
      success: true,
      message: "Account created successfully",
      userId: loggedInUser.id,
      account: serializeTransaction(newAccount),
    };
  } catch (error) {
    console.error("Error in createAccount:", error);
    return {
      success: false,
      message: error.message || "Failed to create account",
    };
  }
};

export const getUserAccounts = async () => {
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

    const accounts = await prismaDB.account.findMany({
      where: {
        userId: loggedInUser.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });
    return {
      success: true,
      account: accounts.map(serializeTransaction),
    };
  } catch (error) {
    console.error("Error in getAccounts:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch accounts",
    };
  }
};
