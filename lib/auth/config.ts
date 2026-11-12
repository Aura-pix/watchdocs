import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

const result = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID ?? "",
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? "",
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }

      if (profile) {
        const githubProfile = profile as {
          id?: string | number;
          login?: string;
          email?: string | null;
        };

        if (githubProfile.id !== undefined) {
          token.githubId = String(githubProfile.id);
        }
        if (githubProfile.login) {
          token.login = githubProfile.login;
        }
        if (githubProfile.email) {
          token.email = githubProfile.email;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.githubId =
          typeof token.githubId === "string" ? token.githubId : undefined;
        session.user.login =
          typeof token.login === "string" ? token.login : undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export default result;
