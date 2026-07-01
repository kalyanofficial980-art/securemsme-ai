import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "SecureMSME AI",
    timestamp: new Date().toISOString(),
  });
}
