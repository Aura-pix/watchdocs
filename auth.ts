import type { NextAuthResult, Session } from "next-auth";

let instance: Promise<NextAuthResult> | null = null;

export function getAuth(): Promise<NextAuthResult> {
  if (!instance) {
    instance = import("./lib/auth/config").then((mod) => mod.default);
  }
  return instance;
}

export async function auth(): Promise<Session | null> {
  return (await getAuth()).auth();
}
