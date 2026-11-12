import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import fs from "node:fs";
import path from "node:path";
import { getDb, isDbConfigured } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface WaitlistPayload {
  email?: unknown;
  repoUrl?: unknown;
  apiType?: unknown;
  painPoint?: unknown;
  source?: unknown;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function describeApi(payload: WaitlistPayload): string | null {
  const parts = [
    asText(payload.apiType),
    asText(payload.painPoint),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" | ") : null;
}

async function sendConfirmation(email: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.WAITLIST_FROM_EMAIL;
  if (!apiKey || !from) return;

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: email,
      subject: "You are on the Watchdocs waitlist",
      text: [
        "Thanks for joining the Watchdocs waitlist.",
        "",
        "Watchdocs opens a pull request when your API changes and your docs are out of date. We are onboarding a small group of API teams first, and we will reach out when your spot opens.",
        "",
        "Nothing merges on its own.",
      ].join("\n"),
    });

    if (result.error) {
      console.error("Waitlist confirmation email failed:", result.error);
    }
  } catch (error) {
    console.error("Waitlist confirmation email failed:", error);
  }
}

async function storeInDevFile(entry: Record<string, unknown>): Promise<void> {
  const filePath = path.join(process.cwd(), "waitlist.json");
  let current: unknown[] = [];

  if (fs.existsSync(filePath)) {
    current = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown[];
  }

  current.push(entry);
  fs.writeFileSync(filePath, JSON.stringify(current, null, 2));
}

export async function POST(req: Request) {
  let payload: WaitlistPayload;

  try {
    payload = (await req.json()) as WaitlistPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = asText(payload.email).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const apiDescription = describeApi(payload);
  const repoUrl = asText(payload.repoUrl) || null;
  const source = asText(payload.source) || "landing";

  if (isDbConfigured()) {
    try {
      const db = getDb();
      const existing = await db
        .select({ id: waitlist.id })
        .from(waitlist)
        .where(eq(waitlist.email, email))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          message: "You are already on the waitlist.",
        });
      }

      await db.insert(waitlist).values({
        email,
        repoUrl,
        apiDescription,
        source,
      });
    } catch (error) {
      console.error("Waitlist database insert failed:", error);
      return NextResponse.json(
        { error: "Could not save your spot. Please try again." },
        { status: 500 },
      );
    }

    await sendConfirmation(email);
    return NextResponse.json({ success: true, message: "Added to waitlist" });
  }

  if (process.env.NODE_ENV === "production") {
    console.error("DATABASE_URL is not configured; waitlist signups are offline.");
    return NextResponse.json(
      { error: "Waitlist is temporarily unavailable." },
      { status: 503 },
    );
  }

  try {
    await storeInDevFile({
      email,
      repoUrl,
      apiDescription,
      source,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Local waitlist write failed:", error);
    return NextResponse.json(
      { error: "Could not save your spot. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Added to waitlist (local development store)",
  });
}
