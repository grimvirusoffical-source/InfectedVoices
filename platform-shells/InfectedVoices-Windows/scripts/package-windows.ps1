param(
  [switch]$BuildPayload
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

foreach ($arg in $args) {
  if ($arg -match '^(release|sign|--release|--sign)$') {
    Write-Error 'Refusing to sign or cut a Windows Release from this shell.'
    exit 2
  }
}

node (Join-Path $PSScriptRoot 'stage-windows-payload.mjs') --check
if ($BuildPayload) {
  node (Join-Path $PSScriptRoot 'stage-windows-payload.mjs') --build
}
Write-Host 'Windows hook finished. SHA-256 file remains a placeholder until a real Release.'
