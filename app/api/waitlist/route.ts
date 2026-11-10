import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.email || typeof data.email !== "string") {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const entry = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    // TODO: Connect to real DB (PostgreSQL, Supabase) or Email Service (Resend, Loops)
    // For local validation, write to waitlist.json
    try {
      const filePath = path.join(process.cwd(), "waitlist.json");
      let current: unknown[] = [];
      if (fs.existsSync(filePath)) {
        current = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      }
      current.push(entry);
      fs.writeFileSync(filePath, JSON.stringify(current, null, 2));
    } catch {
      // Ignore filesystem errors in read-only serverless environments
      console.log("Waitlist entry captured:", entry);
    }

    return NextResponse.json({ success: true, message: "Added to waitlist" });
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
