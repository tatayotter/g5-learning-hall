#!/usr/bin/env bash
# Vercel "Ignored Build Step" (see ignoreCommand in vercel.json).
# Exit 0  -> skip this build.   Exit 1 -> run the build.
#
# Every deployment Vercel keeps is a full copy of the site, and the Hobby plan caps
# total deployment storage, so a commit that can't change the app shouldn't create
# one. We only skip when EVERY file changed since the last successful deployment of
# this branch is docs/tooling. When in doubt (no previous deploy, git can't diff,
# nothing changed) we build.

prev="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$prev" ]; then
  echo "No previous deployment for this branch - building."
  exit 1
fi

if ! changed="$(git diff --name-only "$prev" HEAD 2>/dev/null)"; then
  echo "Could not diff against $prev - building."
  exit 1
fi

if [ -z "$changed" ]; then
  echo "No file changes detected - building to be safe."
  exit 1
fi

# Paths that never affect the deployed site. Note public/ and content/ are NOT here:
# public/prompts/*.md and content/*.json are read at runtime, so they must rebuild.
relevant="$(printf '%s\n' "$changed" | grep -vE '^(docs/|scripts/|graphify-out/|supabase/|\.claude/)|^[^/]+\.md$')"

if [ -n "$relevant" ]; then
  echo "App files changed - building:"
  printf '%s\n' "$relevant" | head -5
  exit 1
fi

echo "Only docs/tooling changed - skipping build."
exit 0
