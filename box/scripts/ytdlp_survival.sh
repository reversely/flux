#!/usr/bin/env bash
# Waits for the HowTo100M filter to finish, then downloads every subset topic
# at 480p with a download archive so re-runs resume. Runs on the box.
set -u
SUB=~/flux/corpora/howto100m-captions/subsets
OUT=~/flux/corpora/howto100m-videos
YT=~/flux/venvs/tools/bin/yt-dlp
while pgrep -f "python.*filter_howto100m" > /dev/null; do sleep 30; done
[ -d "$SUB" ] || { echo "no subsets produced"; exit 1; }
mkdir -p "$OUT"
for list in "$SUB"/*.txt; do
  topic=$(basename "$list" .txt)
  mkdir -p "$OUT/$topic"
  "$YT" -f "bv*[height<=480]+ba/b[height<=480]" \
    --download-archive "$OUT/archive.txt" --ignore-errors --no-progress \
    --sleep-interval 2 --max-sleep-interval 6 \
    -o "$OUT/$topic/%(id)s.%(ext)s" \
    -a <(sed "s|^|https://www.youtube.com/watch?v=|" "$list") \
    >> "$OUT/$topic.log" 2>&1
  echo "$topic done: $(ls "$OUT/$topic" | wc -l) files"
done
