"use server";
import aj from "@/lib/arcjet";
import { prismaDB } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/utils/auth";
import { request } from "@arcjet/next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const serializeTransaction = (obj) => ({
  ...obj,
  amount: obj.amount?.toNumber(),
});

export const createTransaction = async (data) => {
  try {
    const loggedInUser = await getAuthenticatedUser();

    const req = await request();
    const decision = await aj.protect(req, {
      userId: loggedInUser.id,
      requested: 1,
    });
    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason;
        console.error({
          code: "RATE_LIMIT_EXCEEDED",
          details: {
            remaining: remaining,
            resetInSeconds: reset,
          },
        });
        throw new Error("Too many requests. Please try again later.");
      }
      throw new Error("Request Blocked.");
    }

    const account = await prismaDB.account.findUniqueOrThrow({
      where: { id: data.accountId, userId: loggedInUser.id },
    });

    const balanceChange =
      data.type === "EXPENSE"
        ? -parseFloat(data.amount)
        : parseFloat(data.amount);
    const newBalance = parseFloat(account.balance) + balanceChange;

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

export const scanReceipt = async (file, retries = 3) => {
  if (!file || !(file instanceof Blob)) {
    throw new Error("Invalid file input. Expected a Blob object.");
  }

  for (let i = 0; i < retries; i++) {
    try {
      const model = genAi.getGenerativeModel({ model: "gemini-1.5-flash" });
      const base64String = await convertFileToBase64(file);
      const prompt = `
        Analyze this receipt image and extract the following information in JSON format:
        - Total amount (just the number, converted to INR if in another currency using the latest exchange rate, and ensure the amount is positive)
        - Date (in ISO format)
        - Description or items purchased (brief summary)
        - Merchant/store name
        - Suggested category (one of: housing, transportation, groceries, utilities, entertainment, food, shopping, healthcare, education, personal, travel, insurance, gifts, bills, other-expense)

        Only respond with valid JSON in this exact format:
        {
          "amount": number, // Amount in INR (converted if needed)
          "date": "ISO date string",
          "description": "string",
          "merchantName": "string",
          "category": "string"
        }

        - If the amount is in a different currency, convert it to INR using the latest exchange rate.
        - Ensure the amount is always positive.
        - If it's not a receipt, return an empty object.
      `;

      const result = await model.generateContent([
        {
          inlineData: {
            data: base64String,
            mimeType: file.type,
          },
        },
        { text: prompt },
      ]);

      const response = await result.response;
      const text = response.text();
      const cleanedText = cleanResponseText(text);

      try {
        const data = JSON.parse(cleanedText);
        if (Object.keys(data).length === 0) {
          return {
            success: true,
            data: {},
            message: "The input is not a receipt.",
          };
        }

        return {
          success: true,
          data: {
            amount: parseFloat(data.amount),
            date: new Date(data.date),
            description: data.description,
            category: data.category,
            merchantName: data.merchantName,
          },
        };
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError);
        return {
          success: false,
          message: "Failed to parse the response as JSON.",
        };
      }
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === retries - 1) {
        return {
          success: false,
          message:
            error.message || "An error occurred while scanning the receipt.",
        };
      }
      // Wait for 2 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
};

const convertFileToBase64 = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
};

const cleanResponseText = (text) => {
  return text.replace(/```(?:json)?\n?/g, "").trim();
};

export const getTransaction = async (id) => {
  try {
    const loggedInUser = await getAuthenticatedUser();
    const transaction = await prismaDB.transaction.findUnique({
      where: { id, userId: loggedInUser.id },
    });

    if (!transaction) throw new Error("Transaction not found.");

    return serializeTransaction(transaction);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return {
      success: false,
      message:
        error.message || "An error occurred while fetching the transaction.",
    };
  }
};

export const updateTransaction = async (id, data) => {
  try {
    const loggedInUser = await getAuthenticatedUser();
    const originalTransaction = await prismaDB.transaction.findUnique({
      where: { id, userId: loggedInUser.id },
      include: { account: true },
    });

    if (!originalTransaction) throw new Error("Transaction not found.");

    if (!data.amount || isNaN(data.amount)) {
      throw new Error("Invalid amount.");
    }

    if (!data.accountId) {
      throw new Error("Account ID is required.");
    }

    const oldAmount = originalTransaction.amount
      ? originalTransaction.amount.toNumber()
      : 0;
    const newAmount = parseFloat(data.amount);
    const oldBalanceChange =
      originalTransaction.type === "EXPENSE" ? -oldAmount : oldAmount;
    const newBalanceChange = data.type === "EXPENSE" ? -newAmount : newAmount;
    const netBalanceChange = newBalanceChange - oldBalanceChange;

    const updatedTransaction = await prismaDB.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id, userId: loggedInUser.id },
        data: {
          ...data,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: { increment: netBalanceChange } },
      });

      return updated;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);

    return { success: true, data: serializeTransaction(updatedTransaction) };
  } catch (error) {
    console.error("Error updating transaction:", error);
    return {
      success: false,
      message:
        error.message || "An error occurred while updating the transaction.",
    };
  }
};
