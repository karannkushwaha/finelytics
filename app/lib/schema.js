import { z } from "zod";

const ERROR_MESSAGES = {
  REQUIRED: "This field is required",
  INVALID_TYPE: "Invalid account type",
  INVALID_BALANCE: "Initial balance is required",
};

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(["CURRENT", "SAVINGS"], {
    errorMap: () => ({ message: ERROR_MESSAGES.INVALID_TYPE }),
  }),
  balance: z
    .string()
    .trim()
    .min(1, ERROR_MESSAGES.INVALID_BALANCE)
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: ERROR_MESSAGES.INVALID_BALANCE,
    }),
  isDefault: z.boolean().default(false),
});

// id           String        @id @default(uuid())
//   name         String
//   type         AccountType
//   balance      Decimal       @default(0)
//   isDefault    Boolean       @default(false)
//   userId       String
//   user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
//   transactions Transaction[]
//   createdAt    DateTime      @default(now())
//   updatedAt    DateTime      @updatedAt

//   @@index([userId])
//   @@map("accounts")
