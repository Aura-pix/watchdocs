import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { auth } from "@/auth";
import { isAuthConfigured } from "@/lib/auth/env";
import { isDbConfigured } from "@/lib/db";
import { isGitHubAppConfigured } from "@/lib/github/config";
import { connectInstallation } from "@/lib/github/installations";
import { ensureUser } from "@/lib/app/users";

export async function GET(request: NextRequest): Promise<Response> {
  const url = new URL(request.url);
  const callbackPath = `${url.pathname}${url.search}`;

  if (!isAuthConfigured()) {
    return NextResponse.redirect(new URL("/login?reason=auth", url));
  }

  const session = await auth();
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie:
      url.protocol === "https:" ||
      request.headers.get("x-forwarded-proto") === "https",
  });
  const accessToken =
    token && typeof token.accessToken === "string"
      ? token.accessToken
      : undefined;

  if (!session?.user || !accessToken) {
    const loginUrl = new URL("/login", url);
    loginUrl.searchParams.set("callbackUrl", callbackPath);
    return NextResponse.redirect(loginUrl);
  }

  if (!isDbConfigured() || !isGitHubAppConfigured()) {
    return NextResponse.redirect(new URL("/app?installError=config", url));
  }

  const installationId = Number(url.searchParams.get("installation_id"));
  if (!Number.isInteger(installationId) || installationId <= 0) {
    return NextResponse.redirect(new URL("/app?installError=missing", url));
  }

  try {
    const user = await ensureUser({
      githubId: session.user.githubId,
      login: session.user.login,
      email: session.user.email,
    });

    if (!user) {
      throw new Error("Could not load the current user.");
    }

    await connectInstallation({
      installationId,
      userId: user.id,
      userAccessToken: accessToken,
    });
  } catch (error) {
    console.error("GitHub installation setup failed:", error);
    return NextResponse.redirect(new URL("/app?installError=failed", url));
  }

  return NextResponse.redirect(new URL("/app?installed=1", url));
}
