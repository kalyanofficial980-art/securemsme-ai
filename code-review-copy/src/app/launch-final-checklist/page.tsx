import { redirect } from "next/navigation";

export default function LaunchFinalChecklistRedirect() {
  redirect("/admin/launch-ops");
}
