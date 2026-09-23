#!/bin/sh
# Rebuild each shell as its own git repo, pin the Core gitlink, and run its tests.
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
sha=2fb04c2ce1ac4e49ea9105207f436b8b6cf1d80d
for name in InfectedVoices-Web InfectedVoices-Windows InfectedVoices-Android InfectedVoices-iOS; do
  tmp=$(mktemp -d)
  cp -a "$root/$name/." "$tmp/"
  git -C "$tmp" init -q
  git -C "$tmp" add -A
  git -C "$tmp" update-index --add --cacheinfo "160000,$sha,core"
  git -C "$tmp" -c commit.gpgsign=false commit -q -m "verify $name"
  npm --prefix "$tmp" test
  rm -rf "$tmp"
  echo "verified $name"
done
