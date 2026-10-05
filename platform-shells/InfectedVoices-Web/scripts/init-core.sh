#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
git submodule update --init core
git -C core rev-parse HEAD
