import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      githubId?: string;
      login?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    githubId?: string;
    login?: string;
  }
}
