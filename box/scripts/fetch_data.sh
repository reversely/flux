#!/usr/bin/env bash
# Runs on the GN100. Downloads every data-manifest row whose status reads
# "fetch" into $DATA_DIR/<name>/, one log per row, resumable: a .done marker
# skips a finished row and curl resumes partial downloads.
set -u

DATA_DIR="${DATA_DIR:-$HOME/flux/data}"
MANIFEST="${1:?usage: fetch_data.sh <manifest.tsv>}"

. "$HOME/flux/env.sh"
PATH="$HOME/flux/venvs/tools/bin:$PATH"
mkdir -p "$DATA_DIR/_logs"

grep -v '^#' "$MANIFEST" | while IFS=$'\t' read -r name layer source ref status extra; do
  [ "${status:-}" = "fetch" ] || continue
  dest="$DATA_DIR/$name"
  log="$DATA_DIR/_logs/$(echo "$name" | tr / -).log"
  if [ -f "$dest/.done" ]; then
    echo "done  $name"
    continue
  fi
  echo "fetch $name <- $ref"
  case "$source" in
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
    hfd)
      # Hugging Face dataset; the optional sixth column is an exclude glob.
      hf download "$ref" --repo-type dataset --local-dir "$dest" \
        ${extra:+--exclude "$extra"} >>"$log" 2>&1
      ;;
    *)
      echo "unknown source '$source' for $name" | tee -a "$log"
      continue
      ;;
  esac && touch "$dest/.done" && echo "ok    $name" || echo "FAIL  $name (see $log)"
done
