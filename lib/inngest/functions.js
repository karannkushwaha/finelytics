import { sendEmail } from "@/actions/send-email";
import { prismaDB } from "../prisma";
import { inngest } from "./client";
import EmailTemplate from "@/emails/template";
import { Description } from "@radix-ui/react-dialog";

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
        const expenses = await prismaDB.transaction.aggregate({
          where: {
            userId: budget.userId,
            accountId: defaultAccount.id,
            type: "EXPENSE",
            date: {
              gte: startOfMonth,
              lte: endOfMonth,
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
              { lastProcessed: null },
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

    // Send event for each recurring transaction in batches
    if (recurringTransactions.length > 0) {
      const events = recurringTransactions.map((transaction) => ({
        name: "transaction.recurring.process",
        data: {
          transactionId: transaction.id,
          userId: transaction.userId,
        },
      }));

      // Send events directly using inngest.send()
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
              ...transaction,
              description: `${transaction.description} (Recurring)`,
              date: new Date(),
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
              lastProcessed: new Date(),
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
