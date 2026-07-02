import { NextResponse } from "next/server";
import { processDueWorkerJobs } from "@/lib/cron-worker-processor";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const configuredSecret = process.env.CRON_WORKER_SECRET;
  const headerSecret = request.headers.get("x-cron-secret") || "";
  const auth = request.headers.get("authorization") || "";

  if (!configuredSecret) return false;
  return (
    headerSecret === configuredSecret || auth === `Bearer ${configuredSecret}`
  );
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    worker: "securemsme-cron-worker",
    message:
      "Use POST with x-cron-secret or Authorization Bearer token to process due jobs.",
  });
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      {
        status: "unauthorized",
        message: "Missing or invalid CRON_WORKER_SECRET.",
      },
      { status: 401 },
    );
  }

  let maxJobs = 5;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      maxJobs?: number;
    };
    if (typeof body.maxJobs === "number") maxJobs = body.maxJobs;
  } catch {
    maxJobs = 5;
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const result = await processDueWorkerJobs(
      supabaseAdmin as unknown as Parameters<typeof processDueWorkerJobs>[0],
      {
        maxJobs,
        triggerSource: "api-cron",
        workerName: "securemsme-api-cron-worker",
      },
    );

    return NextResponse.json({ status: "ok", result });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Unknown cron worker error",
      },
      { status: 500 },
    );
  }
}
