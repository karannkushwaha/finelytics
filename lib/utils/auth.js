"use server";
import { prismaDB } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export const getAuthenticatedUser = async () => {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized: User not authenticated.");
  }

  const loggedInUser = await prismaDB.user.findUnique({
    where: {
      clerkUserId: userId,
    },
  });

  if (!loggedInUser) {
    throw new Error("User not found in the database.");
  }

  return loggedInUser;
};
