# Requires Administrator — run:  Right-click PowerShell → Run as administrator
#   cd path\to\citians
#   .\scripts\allow-emulator-firewall.ps1

$ports = @(4001, 4400, 5005, 5050, 8085, 9095, 9195)
$ruleName = 'CampusFlow Firebase Emulators'

$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Firewall rule '$ruleName' already exists."
  exit 0
}

New-NetFirewallRule `
  -DisplayName $ruleName `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort $ports `
  -Profile Private `
  | Out-Null

Write-Host "Added inbound firewall rule for ports: $($ports -join ', ')"
Write-Host "Phone on same Wi-Fi can now reach Firebase emulators on this PC."
