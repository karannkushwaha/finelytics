import { seedTransactions } from "@/actions/seed";

export const GET = async () => {
  const result = await seedTransactions();
  return Response.json(result);
};
export const POST = async (url, data) => {};
