# Install curated SecuritySkills for TajStay (UnitOneAI)
# Source: https://github.com/UnitOneAI/SecuritySkills
# Does NOT copy the full repo — only listed skills into .agents/skills/security/

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Dest = Join-Path $Root ".agents\skills\security"
$Tmp = Join-Path $env:TEMP "SecuritySkills-sparse"

$Skills = @(
  "appsec/threat-modeling",
  "appsec/secure-code-review",
  "appsec/owasp-top-10-web",
  "appsec/api-security",
  "appsec/dependency-scanning",
  "ai-security/llm-top-10",
  "ai-security/prompt-injection",
  "ai-security/ai-data-privacy",
  "ai-security/agent-security"
)

Write-Host "Cloning SecuritySkills (depth 1)..."
if (Test-Path $Tmp) { Remove-Item $Tmp -Recurse -Force }
git clone --depth 1 https://github.com/UnitOneAI/SecuritySkills.git $Tmp

New-Item -ItemType Directory -Force -Path $Dest | Out-Null

foreach ($rel in $Skills) {
  $src = Join-Path $Tmp "skills\$rel"
  $name = ($rel -split "/")[-1]
  $out = Join-Path $Dest $name
  if (-not (Test-Path $src)) {
    Write-Warning "Missing skill: $rel"
    continue
  }
  if (Test-Path $out) { Remove-Item $out -Recurse -Force }
  Copy-Item $src $out -Recurse
  Write-Host "Installed: security/$name"
}

Remove-Item $Tmp -Recurse -Force
Write-Host "Done. Security skills in .agents/skills/security/"
