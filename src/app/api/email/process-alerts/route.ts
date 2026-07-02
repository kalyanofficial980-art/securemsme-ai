import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/email/process-alerts",
    message:
      "POST with EMAIL_WORKER_SECRET is reserved for production cron/provider processing. Use report email-delivery page for development.",
  });
}

export async function POST(request: Request) {
  const configuredSecret =
    process.env.EMAIL_WORKER_SECRET || process.env.CRON_WORKER_SECRET;
  const providedSecret = request.headers.get("x-worker-secret") || "";

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized or EMAIL_WORKER_SECRET missing." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    message:
      "Email worker secret accepted. Service-role batch processor can be connected in the next production deployment layer.",
    currentScope:
      "Part 49 provides real provider send path through authenticated server actions and provider tracking.",
  });
}
