import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isDbConfigured } from "@/lib/db";
import { ensureUser } from "./users";

export async function requireAppUser() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/app");
  }

  if (!isDbConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const user = await ensureUser({
    githubId: session.user.githubId,
    login: session.user.login,
    email: session.user.email,
  });

  if (!user) {
    throw new Error("Could not load the current user.");
  }

  return user;
}
