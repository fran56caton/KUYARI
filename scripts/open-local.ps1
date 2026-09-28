$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectDir
New-Item -ItemType Directory -Path (Join-Path $projectDir 'data') -Force | Out-Null
$ready = $false
try { $ready = (Invoke-RestMethod 'http://localhost:3000/api/store' -TimeoutSec 2).name -eq 'KUYARI' } catch {}
if (-not $ready) {
  $nodePath = (Get-Command node).Source
  Start-Process -FilePath $nodePath -ArgumentList @('--env-file-if-exists=.env', 'dist/server/main.js') -WorkingDirectory $projectDir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectDir 'data/server.log') -RedirectStandardError (Join-Path $projectDir 'data/server-error.log') | Out-Null
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 500
    try { $ready = (Invoke-RestMethod 'http://localhost:3000/health' -TimeoutSec 1).status -eq 'ok' } catch {}
    if ($ready) { break }
  }
}
if (-not $ready) { throw 'No se pudo abrir KUYARI. Revisa data/server-error.log.' }
Start-Process -FilePath (Join-Path $projectDir 'GUIA-PRIVADA.html')
