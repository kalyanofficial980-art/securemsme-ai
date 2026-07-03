import { NextResponse } from "next/server";
import { z } from "zod";
import { getPassiveToolCommand } from "@/lib/passive-audit-connector";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const schema = z.object({
  websiteUrl: z.string().min(3).max(300),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Please login before generating audit commands." },
      { status: 401 },
    );
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid website URL." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({
      command: getPassiveToolCommand(parsed.data.websiteUrl),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not generate passive audit command.",
      },
      { status: 400 },
    );
  }
}
