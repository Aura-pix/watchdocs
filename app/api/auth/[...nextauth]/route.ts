import type { NextRequest } from "next/server";
import { getAuth } from "@/auth";
import { isAuthConfigured } from "@/lib/auth/env";

function notConfigured(): Response {
  return new Response("Authentication is not configured.", { status: 503 });
}

export async function GET(request: NextRequest) {
  if (!isAuthConfigured()) return notConfigured();
  const { handlers } = await getAuth();
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  if (!isAuthConfigured()) return notConfigured();
  const { handlers } = await getAuth();
  return handlers.POST(request);
}
