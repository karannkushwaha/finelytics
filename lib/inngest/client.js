import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "finelytics",
  name: "Finelytics",
  retryFunction: async (attempt) => ({
    delay: Math.pow(2, attempt) * 1000,
    maxAttempts: 2,
  }),
});
