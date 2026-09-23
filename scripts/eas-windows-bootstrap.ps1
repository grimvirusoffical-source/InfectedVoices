$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

function Run-Step([string]$Title, [scriptblock]$Action) {
  Write-Host ''
  Write-Host ('=== ' + $Title + ' ===') -ForegroundColor Magenta
  & $Action
}

Run-Step 'Check Node.js' {
  node --version
  npm --version
}

Run-Step 'Install project dependencies' {
  npm install
}

Run-Step 'Authenticate Expo / EAS' {
  npx --yes eas-cli@latest whoami
  if ($LASTEXITCODE -ne 0) {
    npx --yes eas-cli@latest login
  }
}

Run-Step 'Create or link the Expo EAS project' {
  npx --yes eas-cli@latest project:info
  if ($LASTEXITCODE -ne 0) {
    npx --yes eas-cli@latest init
  }
}

Run-Step 'Generate native iOS project on Windows' {
  npm run native:ios
}

Run-Step 'Generate native Android project on Windows' {
  npm run native:android
}

Run-Step 'Configure iOS signing credentials on EAS' {
  Write-Host 'EAS will store the distribution certificate and provisioning profile on its servers.' -ForegroundColor DarkGray
  Write-Host 'Your iPhone can receive any Apple two-factor approval if Apple asks for it.' -ForegroundColor DarkGray
  npx --yes eas-cli@latest credentials --platform ios
}

Run-Step 'Configure Android signing and Play service credentials on EAS' {
  npx --yes eas-cli@latest credentials --platform android
}

Write-Host ''
Write-Host 'Credential setup is complete. Build commands:' -ForegroundColor Green
Write-Host '  node scripts/eas-cloud-release.mjs ios auto-submit'
Write-Host '  node scripts/eas-cloud-release.mjs android auto-submit'
Write-Host ''
Write-Host 'iOS goes to App Store Connect / TestFlight. Android goes to Google Play internal testing.'
