import { sendEmail } from "@/actions/send-email";
import { prismaDB } from "../prisma";
import { inngest } from "./client";
import EmailTemplate from "@/emails/template";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const checkBudgetAlert = inngest.createFunction(
  { name: "Check Budget Alerts" },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    const budgets = await step.run("fetch-budget", async () => {
      return await prismaDB.budget.findMany({
        include: {
          user: {
            include: {
              accounts: {
                where: { isDefault: true },
              },
            },
          },
        },
      });
    });
    for (const budget of budgets) {
      const defaultAccount = budget.user.accounts[0];
      if (!defaultAccount) continue;
      await step.run(`check-budget-${budget.id}`, async () => {
        const startDate = new Date();
        startDate.setDate(1);
        const expenses = await prismaDB.transaction.aggregate({
          where: {
            userId: budget.userId,
            accountId: defaultAccount.id,
            type: "EXPENSE",
            date: {
              gte: startDate,
              // lte: endOfMonth,
            },
          },
          _sum: {
            amount: true,
          },
        });
        const totalExpenses = expenses._sum.amount?.toNumber() || 0;
        const budgetAmount = budget.amount;
        const percentageUsed = (totalExpenses / budgetAmount) * 100;
        if (
          percentageUsed >= 80 &&
          (!budget.lastAlertSent ||
            isNewMonth(new Date(budget.lastAlertSent), new Date()))
        ) {
          await sendEmail({
            to: budget.user.email,
            subject: `Budget Alert for ${defaultAccount.name}`,
            react: EmailTemplate({
              userName: budget.user.name,
              type: "budget-alert",
              data: {
                percentageUsed,
                budgetAmount: parseInt(budgetAmount).toFixed(1),
                totalExpenses: parseInt(totalExpenses).toFixed(1),
                accountName: defaultAccount.name,
              },
            }),
          });

          await prismaDB.budget.update({
            where: { id: budget.id },
            data: { lastAlertSent: new Date() },
          });
        }
      });
    }
  }
);

const isNewMonth = (lastAlertDate, currentDate) => {
  return (
    lastAlertDate.getMonth() !== currentDate.getMonth() ||
    lastAlertDate.getFullYear() !== currentDate.getFullYear()
  );
};

export const triggerRecurringTransactions = inngest.createFunction(
  {
    id: "trigger-recurring-transactions", // Unique ID,
    name: "Trigger Recurring Transactions",
  },
  { cron: "0 0 * * *" }, // Daily at midnight
  async ({ step }) => {
    const recurringTransactions = await step.run(
      "fetch-recurring-transactions",
      async () => {
        return await prismaDB.transaction.findMany({
          where: {
            isRecurring: true,
            status: "COMPLETED",
            OR: [
              { lastProcessedDate: null },
              {
                nextRecurringDate: {
                  lte: new Date(),
                },
              },
            ],
          },
        });
      }
    );

    if (recurringTransactions.length > 0) {
      const events = recurringTransactions.map((transaction) => ({
        name: "transaction.recurring.process",
        data: {
          transactionId: transaction.id,
          userId: transaction.userId,
        },
      }));

      await inngest.send(events);
    }

    return { triggered: recurringTransactions.length };
  }
);

export const processRecurringTransactions = inngest.createFunction(
  {
    id: "process-recurring-transactions",
    throttle: {
      limit: 10,
      period: "1m",
      key: "event.data.userId",
    },
  },
  { event: "transaction.recurring.process" },
  async ({ event, step }) => {
    try {
      const { transactionId, userId } = event?.data || {};
      if (!transactionId || !userId) {
        return { error: "Missing required event data" };
      }

      await step.run("process-transaction", async () => {
        const transaction = await prismaDB.transaction.findUnique({
          where: { id: transactionId, userId },
          include: { account: true },
        });

        if (!transaction || !isTransactionDue(transaction)) return;

        await prismaDB.$transaction(async (tx) => {
          await tx.transaction.create({
            data: {
              type: transaction.type,
              amount: transaction.amount,
              description: `${transaction.description} (Recurring)`,
              date: new Date(),
              category: transaction.category,
              userId: transaction.userId,
              accountId: transaction.accountId,
              isRecurring: false,
            },
          });

          const balanceChange =
            transaction.type === "EXPENSE"
              ? -transaction.amount.toNumber()
              : transaction.amount.toNumber();

          await tx.account.update({
            where: { id: transaction.accountId },
            data: { balance: { increment: balanceChange } },
          });

          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              lastProcessedDate: new Date(),
              nextRecurringDate: calculateNextRecurringDate(
                transaction.nextRecurringDate,
                transaction.recurringInterval
              ),
            },
          });
        });
      });

      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  }
);

const isTransactionDue = (transaction) =>
  !transaction.lastProcessed ||
  new Date(transaction.nextRecurringDate) <= new Date();

const calculateNextRecurringDate = (startDate, interval) => {
  const date = new Date(startDate);
  if (isNaN(date)) return null;

  const intervals = {
    DAILY: () => date.setDate(date.getDate() + 1),
    WEEKLY: () => date.setDate(date.getDate() + 7),
    MONTHLY: () => date.setMonth(date.getMonth() + 1),
    YEARLY: () => date.setFullYear(date.getFullYear() + 1),
  };

  intervals[interval]?.();
  return date;
};

export const generateMonthlyReports = inngest.createFunction(
  {
    id: "generate-monthly-reports",
    name: "Generate Monthly Reports",
  },
  { cron: "0 0 1 * *" }, // Runs on the first day of each month
  async ({ step }) => {
    try {
      // Fetch users with accounts
      const users = await step.run("fetch-users", async () => {
        return prismaDB.user.findMany({
          select: { id: true, name: true, email: true }, // Fetch only required fields
        });
      });

      if (!users.length) return { processed: 0, message: "No users found" };

      // Process user reports concurrently
      await Promise.all(
        users.map(async (user) => {
          try {
            await step.run(`generate-report-${user.id}`, async () => {
              const lastMonth = new Date();
              lastMonth.setMonth(lastMonth.getMonth() - 1);

              const stats = await getMonthlyStats(user.id, lastMonth);
              if (!stats) return;

              const monthName = lastMonth.toLocaleString("default", {
                month: "long",
              });
              const insights = await generateFinancialInsights(
                stats,
                monthName
              );

              await sendEmail({
                to: user.email,
                subject: `Your Monthly Financial Report - ${monthName}`,
                react: EmailTemplate({
                  userName: user.name,
                  type: "monthly-report",
                  data: { stats, month: monthName, insights },
                }),
              });
            });
          } catch (error) {
            console.error(`Error generating report for ${user.email}:`, error);
          }
        })
      );

      return { processed: users.length, success: true };
    } catch (error) {
      console.error("Error in generateMonthlyReports:", error);
      return { processed: 0, success: false };
    }
  }
);

const generateFinancialInsights = async (stats, month) => {
  try {
    const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAi.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Analyze this financial data and provide 3 concise, actionable insights.
      Focus on spending patterns and practical advice.
      Keep it friendly and conversational.

      Financial Data for ${month}:
      - Total Income: ₹${stats.totalIncome.toFixed(2)}
      - Total Expenses: ₹${stats.totalExpenses.toFixed(2)}
      - Net Income: ₹${(stats.totalIncome - stats.totalExpenses).toFixed(2)}
      - Expense Categories: ${Object.entries(stats.byCategory)
        .map(([category, amount]) => `${category}: ₹${amount.toFixed(2)}`)
        .join(", ")}

      Format the response as a JSON array of strings, like this:
      ["insight 1", "insight 2", "insight 3"]
    `;

    const result = await model.generateContent([prompt]);
    const responseText = result.response
      .text()
      .replace(/```(?:json)?\n?/g, "")
      .trim();

    return JSON.parse(responseText);
  } catch (error) {
    console.error("Error generating financial insights:", error);
    return [
      "Your highest expense category this month might need attention.",
      "Consider setting up a budget for better financial management.",
      "Track your recurring expenses to identify potential savings.",
    ];
  }
};

// Fetches and calculates monthly statistics for a user
const getMonthlyStats = async (userId, month) => {
  try {
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
    const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const transactions = await prismaDB.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      select: { amount: true, type: true, category: true },
    });

    if (!transactions.length) return null;

    return transactions.reduce(
      (stats, { amount, type, category }) => {
        const value = amount.toNumber();
        if (type === "EXPENSE") {
          stats.totalExpenses += value;
          stats.byCategory[category] =
            (stats.byCategory[category] || 0) + value;
        } else {
          stats.totalIncome += value;
        }
        return stats;
      },
      {
        totalExpenses: 0,
        totalIncome: 0,
        byCategory: {},
        transactionCount: transactions.length,
      }
    );
  } catch (error) {
    console.error(`Error fetching monthly stats for user ${userId}:`, error);
    return null;
  }
};
