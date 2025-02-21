import { seedTransactions } from "@/actions/seed";

export const GET = async () => {
  const result = await seedTransactions();
  return Response.json(result);
};

export const POST = async (url, data) => {
  // Example usage of url and data
  console.log("URL:", url);
  console.log("Data:", data);

  // Add your logic here
  return Response.json({ message: "POST request received" });
};
