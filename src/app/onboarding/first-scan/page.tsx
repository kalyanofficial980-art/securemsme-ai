import { redirect } from "next/navigation";

export default function LegacyFirstScanOnboardingPage() {
  redirect("/websites/new?message=Add your website here, then run the first production scan.");
}
