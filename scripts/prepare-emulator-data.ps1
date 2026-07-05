# Ensures emulator import directory exists before firebase emulators:start --import
$repoRoot = Split-Path $PSScriptRoot -Parent
$target = Join-Path $repoRoot 'emulator-data'

if (-not (Test-Path $target)) {
  New-Item -ItemType Directory -Path $target -Force | Out-Null
  Write-Host "Created emulator-data folder for import/export."
}
