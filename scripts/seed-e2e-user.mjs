import { existsSync, readFileSync, writeFileSync } from "node:fs";
import crypto from "node:crypto";

const envPath = ".env.local";

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const out = {};
  const text = readFileSync(filePath, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    out[key] = value;
  }
  return out;
}

function upsertEnvValues(values) {
  let text = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(text)) text = text.replace(re, line);
    else text += `${text.endsWith("\n") || text.length === 0 ? "" : "\n"}${line}\n`;
  }
  writeFileSync(envPath, text);
}

const env = { ...parseEnvFile(envPath), ...process.env };

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_SERVICE_KEY ||
  env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  console.error("Add it from Supabase Project Settings → API → service_role key, then rerun this command.");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const email = `e2e-${stamp}-${crypto.randomBytes(3).toString("hex")}@securemsme.test`;
const password = `E2E@${crypto.randomBytes(12).toString("base64url")}1a!`;

const endpoint = `${supabaseUrl.replace(/\/$/, "")}/auth/v1/admin/users`;

const res = await fetch(endpoint, {
  method: "POST",
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      purpose: "playwright-e2e",
      app: "securemsme-ai",
    },
  }),
});

const bodyText = await res.text();

if (!res.ok) {
  console.error("Supabase E2E user create failed.");
  console.error(`Status: ${res.status}`);
  console.error(bodyText);
  process.exit(1);
}

upsertEnvValues({
  E2E_EMAIL: email,
  E2E_PASSWORD: password,
  E2E_AUTH_READY: "true",
});

console.log("Created confirmed E2E Supabase user:");
console.log(email);
console.log("Saved E2E_EMAIL and E2E_PASSWORD into .env.local");
