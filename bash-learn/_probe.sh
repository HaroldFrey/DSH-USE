#!/usr/bin/env bash
echo "BASH_VERSION=$BASH_VERSION"
echo "--- tools ---"
for t in shellcheck shfmt awk sed grep realpath mktemp flock bc jq make; do
  printf "%-12s %s\n" "$t" "$(command -v "$t" || echo MISSING)"
done
echo "--- cwd mapping ---"
echo "PWD=$PWD"
ls -d /mnt/d/Stduy/DSH-USE 2>/dev/null || echo "no /mnt/d mount"
