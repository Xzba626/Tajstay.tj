# Install better-web-ui skills for Cursor (aladicf)
# https://github.com/aladicf/better-web-ui

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))

$skills = @(
  "frontend-design", "setup", "add-ui", "critique", "audit", "arrange", "adapt",
  "animate", "polish", "distill", "bolder", "quieter", "data-viz", "forms",
  "search", "a11y", "test", "security-ux"
)

$args = @("skills", "add", "aladicf/better-web-ui", "--agent", "cursor", "-y")
foreach ($s in $skills) { $args += @("--skill", $s) }

Write-Host "Running: npx $($args -join ' ')"
npx @args

Write-Host ""
Write-Host "Next: run /setup in Cursor once to generate .better-web-ui.md for TajStay."
