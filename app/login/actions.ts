"use server";

import { getAuth } from "@/auth";
import { safeCallbackUrl } from "@/lib/auth/callback";

export async function signInWithGitHub(formData: FormData): Promise<void> {
  const { signIn } = await getAuth();
  await signIn("github", {
    redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
  });
}
