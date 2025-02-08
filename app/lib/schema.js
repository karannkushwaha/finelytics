import { z } from "zod";

const ERROR_MESSAGES = {
  REQUIRED: "This field is required",
  INVALID_TYPE: "Invalid account type",
  INVALID_BALANCE: "Initial balance must be a positive number",
  INVALID_AMOUNT: "Amount must be a positive number",
  INVALID_DATE: "Invalid or missing date",
  RECURRING_INTERVAL_REQUIRED:
    "Recurring interval is required for recurring transactions",
};

export const accountSchema = z.object({
  name: z.string().trim().min(1, ERROR_MESSAGES.REQUIRED),
  type: z.enum(["CURRENT", "SAVINGS"], {
    errorMap: () => ({ message: ERROR_MESSAGES.INVALID_TYPE }),
  }),
  balance: z
    .string()
    .trim()
    .min(1, ERROR_MESSAGES.INVALID_BALANCE)
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: ERROR_MESSAGES.INVALID_BALANCE,
    })
    .transform((val) => parseFloat(val)),
  isDefault: z.boolean().default(false),
});

export const transactionSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z
      .string()
      .trim()
      .min(1, ERROR_MESSAGES.INVALID_AMOUNT)
      .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: ERROR_MESSAGES.INVALID_AMOUNT,
      })
      .transform((val) => parseFloat(val)),
    description: z.string().optional(),
    date: z.preprocess(
      (val) => (val instanceof Date ? val : new Date(val)),
      z.date().refine((date) => !isNaN(date.getTime()), {
        message: ERROR_MESSAGES.INVALID_DATE,
      })
    ),
    accountId: z.string().trim().min(1, ERROR_MESSAGES.REQUIRED),
    category: z.string().trim().min(1, ERROR_MESSAGES.REQUIRED),
    isRecurring: z.boolean().default(false),
    recurringInterval: z
      .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isRecurring && !data.recurringInterval) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: ERROR_MESSAGES.RECURRING_INTERVAL_REQUIRED,
        path: ["recurringInterval"],
      });
    }
  });
