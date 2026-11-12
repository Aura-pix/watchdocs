"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getAuth } from "@/auth";
import { getDb } from "@/lib/db";
import { installations, users } from "@/lib/db/schema";
import { requireAppUser } from "./session";

export async function deleteAccountAction(formData: FormData): Promise<void> {
  const user = await requireAppUser();
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (confirmation !== user.login) {
    redirect(
      `/app/settings?error=${encodeURIComponent(
        `Type ${user.login} to confirm deletion.`,
      )}`,
    );
  }

  const db = getDb();
  await db.delete(installations).where(eq(installations.userId, user.id));
  await db.delete(users).where(eq(users.id, user.id));

  const { signOut } = await getAuth();
  await signOut({ redirectTo: "/" });
}
