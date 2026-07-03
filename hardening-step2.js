const fs = require("fs");

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  fs.writeFileSync(file, text, "utf8");
}

function addImport(text) {
  const importLine = 'import { validatePublicHttpUrl } from "@/lib/security/ssrf";\n';

  if (text.includes('validatePublicHttpUrl')) {
    return text;
  }

  if (/^import /m.test(text)) {
    return text.replace(/^((?:import[\s\S]*?;\r?\n)+)/, "$1" + importLine);
  }

  return importLine + text;
}

function patchFetchFile(file, replacements) {
  if (!exists(file)) {
    console.log("SKIP missing:", file);
    return;
  }

  let text = read(file);
  let next = text;
  let changed = false;

  for (const item of replacements) {
    if (next.includes(item.from) && !next.includes(item.guard)) {
      next = next.replace(item.from, item.to);
      changed = true;
    }
  }

  if (changed) {
    next = addImport(next);
    write(file, next);
    console.log("PATCHED:", file);
  } else {
    console.log("NO CHANGE:", file);
  }
}

patchFetchFile("src/lib/scanner.ts", [
  {
    from: "return await fetch(url, {",
    guard: "await validatePublicHttpUrl(typeof url ===",
    to: 'await validatePublicHttpUrl(typeof url === "string" ? url : url.toString());\n    return await fetch(url, {'
  }
]);

patchFetchFile("src/lib/ownership-verification.ts", [
  {
    from: "const response = await fetch(url, {",
    guard: "await validatePublicHttpUrl(url);",
    to: "await validatePublicHttpUrl(url);\n    const response = await fetch(url, {"
  }
]);

patchFetchFile("src/lib/inbuilt-advanced-audit.ts", [
  {
    from: "const response = await fetch(url, {",
    guard: "await validatePublicHttpUrl(url);",
    to: "await validatePublicHttpUrl(url);\n    const response = await fetch(url, {"
  }
]);

patchFetchFile("src/lib/authorized-vulnerability-scanner.ts", [
  {
    from: "const response = await fetch(url.toString(), {",
    guard: "await validatePublicHttpUrl(url.toString());",
    to: "await validatePublicHttpUrl(url.toString());\n    const response = await fetch(url.toString(), {"
  }
]);

patchFetchFile("src/lib/advanced-crawler-engine.ts", [
  {
    from: "const response = await fetch(url.toString(), {",
    guard: "await validatePublicHttpUrl(url.toString());",
    to: "await validatePublicHttpUrl(url.toString());\n    const response = await fetch(url.toString(), {"
  }
]);

patchFetchFile("src/lib/advanced-crawler-asset-discovery-v2.ts", [
  {
    from: "const response = await fetch(url.toString(), {",
    guard: "await validatePublicHttpUrl(url.toString());",
    to: "await validatePublicHttpUrl(url.toString());\n    const response = await fetch(url.toString(), {"
  }
]);

patchFetchFile("src/lib/api-security-scanner.ts", [
  {
    from: "const response = await fetch(url.toString(), {",
    guard: "await validatePublicHttpUrl(url.toString());",
    to: "await validatePublicHttpUrl(url.toString());\n    const response = await fetch(url.toString(), {"
  }
]);

patchFetchFile("src/lib/api-security-review-v2.ts", [
  {
    from: "const response = await fetch(url.toString(), {",
    guard: "await validatePublicHttpUrl(url.toString());",
    to: "await validatePublicHttpUrl(url.toString());\n    const response = await fetch(url.toString(), {"
  }
]);

patchFetchFile("src/lib/cms-wordpress-scanner.ts", [
  {
    from: "const response = await fetch(url.toString(), {",
    guard: "await validatePublicHttpUrl(url.toString());",
    to: "await validatePublicHttpUrl(url.toString());\n    const response = await fetch(url.toString(), {"
  }
]);

patchFetchFile("src/lib/real-safe-template-worker.ts", [
  {
    from: "const response = await fetch(url.toString(), {",
    guard: "await validatePublicHttpUrl(url.toString());",
    to: "await validatePublicHttpUrl(url.toString());\n    const response = await fetch(url.toString(), {"
  }
]);

patchFetchFile("src/lib/real-security-modules.ts", [
  {
    from: "const response = await fetch(target, {",
    guard: "await validatePublicHttpUrl(target);",
    to: "await validatePublicHttpUrl(target);\n    const response = await fetch(target, {"
  }
]);

patchFetchFile("src/lib/browser-security-analyzer.ts", [
  {
    from: "const response = await fetch(url.toString(), {",
    guard: "await validatePublicHttpUrl(url.toString());",
    to: "await validatePublicHttpUrl(url.toString());\n    const response = await fetch(url.toString(), {"
  }
]);

patchFetchFile("src/lib/graphql-risk-analyzer.ts", [
  {
    from: "const response = await fetch(url.toString(), {",
    guard: "await validatePublicHttpUrl(url.toString());",
    to: "await validatePublicHttpUrl(url.toString());\n    const response = await fetch(url.toString(), {"
  }
]);

patchFetchFile("src/lib/broken-access-control-engine.ts", [
  {
    from: "const response = await fetch(input.url.toString(), {",
    guard: "await validatePublicHttpUrl(input.url.toString());",
    to: "await validatePublicHttpUrl(input.url.toString());\n    const response = await fetch(input.url.toString(), {"
  }
]);

patchFetchFile("src/lib/authenticated-session-crawler.ts", [
  {
    from: "const response = await fetch(input.url.toString(), {",
    guard: "await validatePublicHttpUrl(input.url.toString());",
    to: "await validatePublicHttpUrl(input.url.toString());\n    const response = await fetch(input.url.toString(), {"
  }
]);

# Hide public admin operation navigation
const navFile = "src/components/AdvancedReportNavigation.tsx";
if (exists(navFile)) {
  let text = read(navFile);
  let next = text;

  next = next.replace(/const adminLinks: NavItem\[\] = \[[\s\S]*?\];/, "const adminLinks: NavItem[] = [];");

  next = next.replace(/href="\/admin\/[^"]+"/g, 'href="/dashboard"');

  if (next !== text) {
    write(navFile, next);
    console.log("PATCHED:", navFile);
  } else {
    console.log("NO CHANGE:", navFile);
  }
}

console.log("Step 2 patch completed.");
