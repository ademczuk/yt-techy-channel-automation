Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

$tsxPath = Join-Path $projectRoot "node_modules\.bin\tsx.ps1"

if (-not (Test-Path $tsxPath)) {
  throw "Local tsx launcher not found at $tsxPath. Run npm install in $projectRoot before using this script."
}

& $tsxPath "scripts/recordly-manual-debug.ts"
