import { NextResponse } from "next/server";
import { buildLeadCsv } from "@/lib/final-launch-ops-engine";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    return new NextResponse("Forbidden", { status: 403 });

  const { data: demoRequests } = await supabase
    .from("public_demo_requests_v2")
    .select(
      "full_name, work_email, company_name, website_url, lead_status, lead_score, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  const { data: supportTickets } = await supabase
    .from("support_contact_tickets_v2")
    .select(
      "full_name, email, company_name, website_url, ticket_status, support_score, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = [
    ...(demoRequests || []).map((x: any) => ({
      type: "demo",
      name: x.full_name,
      email: x.work_email,
      company: x.company_name,
      website: x.website_url,
      status: x.lead_status,
      score: x.lead_score,
      created_at: x.created_at,
    })),
    ...(supportTickets || []).map((x: any) => ({
      type: "support",
      name: x.full_name,
      email: x.email,
      company: x.company_name,
      website: x.website_url,
      status: x.ticket_status,
      score: x.support_score,
      created_at: x.created_at,
    })),
  ];

  await supabase
    .from("launch_crm_exports_v2")
    .insert({
      export_type: "all",
      export_status: "downloaded",
      row_count: rows.length,
      generated_by: user.id,
      payload: { source: "admin-lead-crm-export" },
    });

  return new NextResponse(buildLeadCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="securemsme-leads.csv"',
    },
  });
}
