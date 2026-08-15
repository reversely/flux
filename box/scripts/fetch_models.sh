#!/usr/bin/env bash
# Runs on the GN100. Downloads every manifest row whose status reads "fetch"
# into $MODELS_DIR/<name>, one log per model, resumable: a .done marker skips a
# finished row, hf and curl both resume partial downloads.
set -u

MODELS_DIR="${MODELS_DIR:-$HOME/flux/models}"
MANIFEST="${1:?usage: fetch_models.sh <manifest.tsv>}"

. "$HOME/flux/env.sh"
PATH="$HOME/flux/venvs/tools/bin:$PATH"
mkdir -p "$MODELS_DIR/_logs"

grep -v '^#' "$MANIFEST" | while IFS=$'\t' read -r name role source ref license status; do
  [ "${status:-}" = "fetch" ] || continue
  dest="$MODELS_DIR/$name"
  log="$MODELS_DIR/_logs/$name.log"
  if [ -f "$dest/.done" ]; then
    echo "done  $name"
    continue
  fi
  echo "fetch $name <- $source:$ref"
  case "$source" in
    hf)
      hf download "$ref" --local-dir "$dest" >>"$log" 2>&1
      ;;
    url)
      mkdir -p "$dest"
      curl -fSL -C - -o "$dest/$(basename "$ref")" "$ref" >>"$log" 2>&1
      ;;
    git)
      if [ -d "$dest/.git" ]; then
        git -C "$dest" pull >>"$log" 2>&1
      else
        git clone --depth 1 "$ref" "$dest" >>"$log" 2>&1
      fi
      ;;
    *)
      echo "unknown source '$source' for $name" | tee -a "$log"
      continue
      ;;
  esac && touch "$dest/.done" && echo "ok    $name" || echo "FAIL  $name (see $log)"
done
