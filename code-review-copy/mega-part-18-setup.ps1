# Mega Part 18: Advanced Testing + Audit setup
# Run from: C:\Users\ADMIN\securemsme-ai
# Command: powershell -ExecutionPolicy Bypass -File .\mega-part-18-setup.ps1

$ErrorActionPreference = "Stop"

if (-not (Test-Path "package.json")) {
  Write-Host "ERROR: package.json not found. Run this inside C:\Users\ADMIN\securemsme-ai" -ForegroundColor Red
  exit 1
}

Write-Host "Installing advanced QA/testing tools..." -ForegroundColor Cyan
npm.cmd install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test lighthouse start-server-and-test

Write-Host "Installing Playwright Chromium browser..." -ForegroundColor Cyan
npx.cmd playwright install chromium

Write-Host "Updating package.json scripts..." -ForegroundColor Cyan
$pkg = Get-Content "package.json" -Raw | ConvertFrom-Json

if (-not $pkg.scripts) {
  $pkg | Add-Member -MemberType NoteProperty -Name scripts -Value ([pscustomobject]@{})
}

$scripts = $pkg.scripts

function Set-Script {
  param([string]$Name, [string]$Value)

  if ($scripts.PSObject.Properties.Name -contains $Name) {
    $scripts.$Name = $Value
  } else {
    $scripts | Add-Member -MemberType NoteProperty -Name $Name -Value $Value
  }
}

Set-Script "test" "vitest run"
Set-Script "test:watch" "vitest"
Set-Script "test:ui" "vitest --ui"
Set-Script "e2e" "playwright test"
Set-Script "e2e:ui" "playwright test --ui"
Set-Script "audit:npm" "npm audit --audit-level=high"
Set-Script "audit:lighthouse" "lighthouse http://localhost:3000 --output html --output-path ./audit-reports/lighthouse-home.html --chrome-flags=""--headless"""
Set-Script "audit:app" "npm run lint && npm run test && npm run build"
Set-Script "audit:full" "npm run audit:app && npm run e2e"

$pkg | ConvertTo-Json -Depth 20 | Set-Content "package.json" -Encoding UTF8

Write-Host "Mega Part 18 setup complete." -ForegroundColor Green
Write-Host "Next run: npx.cmd prettier --write src tests playwright.config.ts vitest.config.ts" -ForegroundColor Yellow
Write-Host "Then run: npm.cmd run audit:app" -ForegroundColor Yellow
