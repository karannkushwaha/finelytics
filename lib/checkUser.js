import { currentUser } from "@clerk/nextjs/server";
import { prismaDB } from "./prisma";

export const checkUser = async (req, res, next) => {
  const user = await currentUser();
  if (!user) {
    return null;
  }
  try {
    const loggedInUser = await prismaDB.user.findUnique({
      where: {
        clerkUserId: user.id,
      },
    });
    if (loggedInUser) {
      return loggedInUser;
    }

    const name = `${user.firstName} ${user.lastName}`;
    const newUser = await prismaDB.user.create({
      data: {
        clerkUserId: user.id,
        name,
        imageUrl: user.imageUrl,
        email: user.emailAddresses[0].emailAddress,
      },
    });
    return newUser;
  } catch (error) {
    console.log("Error:", error);
  }
};
