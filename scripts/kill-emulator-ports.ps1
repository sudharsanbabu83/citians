# Frees Firebase emulator ports on Windows (stale java/node emulator processes only).
$ports = @(4001, 4400, 4401, 4500, 4501, 5005, 5050, 8085, 9095, 9195)
$currentProcessId = $PID
$killableProcessNames = @('java', 'node')

foreach ($port in $ports) {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($conn in $connections) {
    $processId = $conn.OwningProcess
    if (-not $processId -or $processId -eq $currentProcessId) { continue }

    try {
      $proc = Get-Process -Id $processId -ErrorAction Stop
    } catch {
      continue
    }

    if ($proc.ProcessName -notin $killableProcessNames) {
      Write-Host "Skipping $($proc.ProcessName) (PID $processId) on port $port"
      continue
    }

    try {
      Write-Host "Stopping $($proc.ProcessName) (PID $processId) on port $port"
      Stop-Process -Id $processId -Force -ErrorAction Stop
    } catch {
      Write-Host ("Could not stop PID {0} on port {1}: {2}" -f $processId, $port, $_)
    }
  }
}

Write-Host "Emulator ports cleared."
