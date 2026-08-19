import Link from "next/link";
import type { ReactNode } from "react";

export const legalPages = [
  { key: "terms", title: "Terms and Conditions", href: "/legal/terms" },
  { key: "privacy", title: "Privacy Policy", href: "/legal/privacy" },
  {
    key: "acceptable-use",
    title: "Acceptable Use Policy",
    href: "/legal/acceptable-use",
  },
  {
    key: "responsible-disclosure",
    title: "Responsible Disclosure Policy",
    href: "/legal/responsible-disclosure",
  },
  { key: "refund", title: "Refund & Cancellation Policy", href: "/legal/refund" },
  {
    key: "data-processing",
    title: "Data Processing Notice",
    href: "/legal/data-processing",
  },
  { key: "cookie", title: "Cookie Policy", href: "/legal/cookie" },
  {
    key: "security-policy",
    title: "Security Policy",
    href: "/legal/security-policy",
  },
  { key: "disclaimer", title: "Security Disclaimer", href: "/legal/disclaimer" },
];

export const legalDocs: Record<string, { title: string; sections: string[] }> = {
  terms: {
    title: "Terms and Conditions",
    sections: [
      "VeyraSec may be used only for websites, domains, applications and systems that you own, manage, or are explicitly authorized to assess.",
      "The service is designed for safe public checks, ownership-controlled deeper review, reporting, remediation workflows and retest evidence. You must not use it for unauthorized access, brute force, destructive exploitation, disruption, credential theft or data extraction.",
      "Security scores and reports are decision-support outputs. VeyraSec does not guarantee complete security, does not guarantee every vulnerability will be found, and does not provide a penetration-test certificate or legal compliance certification unless a separate written engagement explicitly says otherwise.",
      "At launch, paid plans may be activated through an assisted billing workflow after payment reference review. Never submit card numbers, CVVs, OTPs, UPI PINs, bank passwords, private keys or account secrets to VeyraSec support or billing fields.",
      "Plan access, scan limits and paid features may depend on the selected plan, successful payment verification, account status and applicable service limits. Abuse or unauthorized scanning may result in suspension or termination.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    sections: [
      "VeyraSec may process account identifiers, website URLs, scan metadata, security findings, reports, ownership-verification state, support messages, payment-reference information and service logs needed to operate the product.",
      "We use this information to authenticate users, run authorized security workflows, generate and retain reports, track remediation and retests, enforce plan limits, review assisted payments, improve reliability and provide support.",
      "Do not upload passwords, OTPs, card numbers, private keys, session cookies, confidential customer records or production secrets unless a future written enterprise agreement specifically supports that data type and workflow.",
      "Google OAuth and infrastructure providers may process limited technical and account information necessary to provide authentication, hosting, database and related service functions under their own applicable terms and privacy practices.",
      "Users are responsible for adding only websites and security information they are authorized to process and for sharing reports only with authorized recipients. Reasonable data-access, correction or deletion requests can be submitted through the VeyraSec contact channel, subject to security, fraud-prevention and legal retention requirements.",
    ],
  },
  "acceptable-use": {
    title: "Acceptable Use Policy",
    sections: [
      "You may use VeyraSec for authorized website security review, remediation planning, client reporting, retest evidence and related defensive security workflows.",
      "You must not use the service for unauthorized scanning, brute force, malware delivery, credential theft, access-control bypass, destructive exploitation, denial of service, harassment, privacy abuse or unlawful activity.",
      "Before running deeper workflows, you must satisfy the product's ownership or permission controls and ensure you have authority to assess the target.",
      "Violations may lead to feature restrictions, suspension, cancellation, report removal or other protective action. VeyraSec may cooperate with valid legal process where required.",
    ],
  },
  "responsible-disclosure": {
    title: "Responsible Disclosure Policy",
    sections: [
      "If you identify a potential security issue in VeyraSec itself, report it through the product contact or support channel and clearly mark the report as a security disclosure.",
      "Act in good faith, avoid privacy violations and service disruption, and do not access, alter or delete data that does not belong to you.",
      "Provide enough technical detail to reproduce the issue safely and allow reasonable time for investigation and remediation before public disclosure.",
      "This policy does not create a bug-bounty or reward obligation unless VeyraSec separately publishes or agrees to one in writing.",
    ],
  },
  refund: {
    title: "Refund & Cancellation Policy",
    sections: [
      "During the assisted-billing launch phase, paid access is activated only after the submitted payment reference is reviewed and approved. An unverifiable, duplicate or mismatched payment request may be rejected without plan activation.",
      "A customer may request cancellation of future renewal or paid access through the VeyraSec support/contact workflow. Assisted billing does not automatically debit a customer unless a future recurring-payment flow is explicitly enabled and authorized.",
      "Refund requests should include the account, plan, payment reference and reason. Eligibility is reviewed based on payment status, plan activation, usage, consumed scan capacity, completed reports, custom work and any rights that cannot lawfully be excluded.",
      "Completed security work, consumed scan capacity, generated reports and custom/manual services may be non-refundable except where a refund is required by applicable law or separately agreed in writing.",
      "Never send card details, CVVs, OTPs, UPI PINs or bank passwords when requesting billing support or a refund.",
    ],
  },
  "data-processing": {
    title: "Data Processing Notice",
    sections: [
      "VeyraSec processes website URLs, scan results, findings, reports, remediation state, retest comparisons, ownership state and related account data to provide the service.",
      "Users control which websites they add and are responsible for having authority to process the related security information.",
      "The standard workflow is designed around public website signals and does not require customers to provide passwords, private keys or confidential production datasets.",
      "Reasonable export or deletion requests can be submitted through support, subject to account-security checks and retention needed for fraud prevention, billing records or legal obligations.",
    ],
  },
  cookie: {
    title: "Cookie Policy",
    sections: [
      "VeyraSec may use cookies or similar browser storage for authentication sessions, security, preferences and essential product operation.",
      "Authentication and security cookies may be required for login and dashboard features to function correctly.",
      "If optional analytics are enabled, they should be configured to avoid unnecessary personal-data collection and used to improve product reliability and usability.",
      "Browser controls may allow you to block cookies, but disabling required cookies can break authentication or account functionality.",
    ],
  },
  "security-policy": {
    title: "Security Policy",
    sections: [
      "VeyraSec uses authenticated access, database row-level security, server-side authorization checks, ownership controls and safe-by-design scanning boundaries.",
      "Deeper review remains gated behind verified ownership or permission controls, while standard scans are limited to safe public checks.",
      "The service is designed to avoid brute force, login bypass, destructive exploitation and private-data access in the standard workflow.",
      "Security issues affecting VeyraSec should be submitted through the contact channel as a responsible disclosure. Do not place credentials, tokens, private keys or payment secrets in support messages.",
    ],
  },
  disclaimer: {
    title: "Security Disclaimer",
    sections: [
      "VeyraSec does not guarantee that any website, application, company or system is completely secure.",
      "A scan or report does not guarantee that every vulnerability, exposure, configuration issue or future security problem has been identified.",
      "Scores, findings, dashboards, recommendations and retest comparisons are security decision-support information and are not legal, regulatory or compliance certification.",
      "Use VeyraSec only for targets you own, manage or are explicitly authorized to assess.",
    ],
  },
};

export function LegalIndex() {
  return (
    <section className="space-y-8">
      <div className="border border-slate-300 bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Legal center</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-slate-950">VeyraSec legal and trust policies</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Operational launch policies for authorized use, privacy, billing, security and responsible disclosure. These pages should receive professional legal review as the business and jurisdictions expand.
        </p>
      </div>
      <div className="grid border-t border-slate-300 md:grid-cols-2 lg:grid-cols-3">
        {legalPages.map((page) => (
          <Link key={page.key} href={page.href} className="border-b border-slate-200 bg-white p-6 hover:bg-slate-50 md:border-r">
            <h2 className="text-base font-semibold text-slate-950">{page.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Read current VeyraSec launch policy.</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function LegalDocumentPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-4xl space-y-7">
      <div className="border border-slate-300 bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Last updated 19 August 2026</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-slate-950">{title}</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          VeyraSec launch policy. This operational text is not a substitute for professional legal advice and should be reviewed as the business, payment model and jurisdictions expand.
        </p>
      </div>
      <div className="border border-slate-300 bg-white p-8 text-slate-700">{children}</div>
      <div className="border-l-2 border-blue-700 bg-white px-6 py-4 text-sm leading-6 text-slate-600">
        VeyraSec provides security decision-support information, not a guarantee of complete security or legal compliance. Use the service only with proper authorization.
      </div>
      <div className="flex flex-wrap gap-5 text-sm font-medium">
        <Link href="/legal" className="text-blue-700 hover:text-blue-800">All policies</Link>
        <Link href="/contact" className="text-blue-700 hover:text-blue-800">Contact VeyraSec</Link>
        <Link href="/trust" className="text-blue-700 hover:text-blue-800">Trust & safety</Link>
      </div>
    </article>
  );
}
