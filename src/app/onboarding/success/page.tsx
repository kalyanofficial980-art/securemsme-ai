import { redirect } from "next/navigation";

export default function LegacyOnboardingSuccessPage() {
  redirect("/dashboard?message=Setup is ready. Add a website, scan it, and activate a paid plan when needed.");
}
