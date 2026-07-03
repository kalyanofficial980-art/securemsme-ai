const SENSITIVE_PATHS = [
  "/admin",
  "/login",
  "/wp-admin",
  "/api",
  "/graphql",
  "/debug",
  "/.env",
  "/backup.zip",
  "/config.php",
];

export function maskSensitivePath(path: string) {
  if (!path) return path;

  if (SENSITIVE_PATHS.some((p) => path.toLowerCase().startsWith(p))) {
    return "/[hidden in client-safe report]";
  }

  return path;
}

export function formatEmptyMetric(value: number | null | undefined, hasRun: boolean) {
  if (!hasRun) return "Not measured yet";
  if (value === null || value === undefined) return "Not measured yet";
  return String(value);
}

export function clientSafeFinding(finding: any) {
  return {
    ...finding,
    path: finding?.path ? maskSensitivePath(finding.path) : finding?.path,
    surface: finding?.surface ? maskSensitivePath(finding.surface) : finding?.surface,
    evidence: Array.isArray(finding?.evidence)
      ? finding.evidence.map((item: string) => maskSensitivePath(item))
      : finding?.evidence,
  };
}
