import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminClientPortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login as admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin")
    redirect("/dashboard?message=Admin access required");

  const { data: links } = await supabase
    .from("client_portal_links")
    .select(
      "id, title, client_name, client_email, access_level, status, view_count, expires_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: events } = await supabase
    .from("client_portal_access_events")
    .select("id, event_type, severity, title, details, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">
          Client portal observability
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor shareable report links, views, expiry, revokes and access
          events.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Shareable links</h2>
          <div className="mt-6 grid gap-4">
            {links?.length ? (
              links.map((link) => (
                <div
                  key={link.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-black">{link.title}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {link.access_level} · views {link.view_count} · expires{" "}
                        {new Date(link.expires_at).toLocaleString()}
                      </p>
                      {link.client_email ? (
                        <p className="mt-1 text-sm text-slate-600">
                          {link.client_email}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black">
                      {link.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No client portal links yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Access events</h2>
          <div className="mt-6 grid gap-4">
            {events?.length ? (
              events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <p className="text-xs font-black uppercase text-slate-500">
                    {event.event_type} ·{" "}
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                  <h3 className="mt-1 font-black">{event.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {event.details}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No client portal events yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
