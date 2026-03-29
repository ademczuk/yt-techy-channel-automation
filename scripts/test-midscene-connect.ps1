param(
  [string]$EnvFile = "runtime\\midscene.env"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path $EnvFile)) {
  Write-Error "Missing $EnvFile. Copy runtime\\templates\\midscene.env.example to runtime\\midscene.env and fill in the API key."
}

Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') {
    return
  }
  $parts = $_ -split '=', 2
  if ($parts.Count -eq 2) {
    [System.Environment]::SetEnvironmentVariable($parts[0], $parts[1], "Process")
  }
}

if (-not $env:MIDSCENE_MODEL_API_KEY) {
  Write-Error "MIDSCENE_MODEL_API_KEY is not set in $EnvFile."
}

npx @midscene/computer@1 connect

