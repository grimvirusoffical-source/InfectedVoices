#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")"
echo "Installing Infected Voices iOS dependencies…"
npm install
npm run native:ios
npx cap open ios
