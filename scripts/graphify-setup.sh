#!/usr/bin/env bash
# Puts the graphify code map in graphify-out/ so `graphify query/path/explain` work.
#
# Runs automatically at the start of every Claude cloud session (SessionStart hook in
# .claude/settings.json); run it by hand anywhere else. It installs graphify if missing,
# then downloads the latest map that CI built from main (the `graphify` branch, see
# .github/workflows/graphify.yml). If that download fails it builds the map locally
# instead (~20 s, no API key). Never fails the session: every step is best effort.

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0

# Keep this version in step with .github/workflows/graphify.yml.
if ! command -v graphify >/dev/null 2>&1; then
  pip install -q "graphifyy[sql]==0.9.97" >/dev/null 2>&1 \
    || pip install -q --break-system-packages "graphifyy[sql]==0.9.97" >/dev/null 2>&1
fi

mkdir -p graphify-out
if git fetch -q --depth=1 origin graphify 2>/dev/null \
  && git archive FETCH_HEAD graph.json graph.html GRAPH_REPORT.md wiki | tar -x -C graphify-out; then
  echo "graphify: code map from main is in graphify-out/ (try: graphify query \"<question>\")"
elif command -v graphify >/dev/null 2>&1; then
  graphify update . >/dev/null 2>&1 && graphify export wiki >/dev/null 2>&1 \
    && echo "graphify: built the code map locally in graphify-out/"
fi
exit 0
