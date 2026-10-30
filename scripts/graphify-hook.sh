#!/usr/bin/env bash
# PreToolUse hook (.claude/settings.json): nudges Claude to use the graphify code map
# before grepping. Works wherever graphify is installed (Windows, Mac, Linux, cloud) and
# quietly does nothing where it isn't. Usage: graphify-hook.sh search|read
if command -v graphify >/dev/null 2>&1; then
  exec graphify hook-guard "$1"
fi
win="$HOME/.local/bin/graphify.exe"
if [ -f "$win" ]; then
  exec "$win" hook-guard "$1"
fi
exit 0
