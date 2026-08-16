"""Pull one openly licensed reference image per catalog species (#110).

For each page in the mycomorphbox trait table, resolve the Wikipedia lead
image, read its Commons license metadata, and keep it only when the license
sits on the allowlist (CC BY, CC BY-SA, CC0, public domain; anything
non-commercial is excluded because pack redistribution must stay clean).
Downloads resume: an existing file skips. The manifest carries species,
file, license, artist, and the Commons page, which is the attribution the
app renders.

Run anywhere with internet:
  python fetch_species_images.py mycomorphbox.tsv <out_dir> [--limit N]
"""

import argparse
import csv
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

USER_AGENT = "flux-lifekit-species-images/1.0 (offline survival assistant build)"
THUMB_WIDTH = 500
MIN_WIDTH = 240


def api_get(host: str, params: dict) -> dict:
    query = urllib.parse.urlencode({**params, "format": "json", "formatversion": 2})
    req = urllib.request.Request(
        f"https://{host}/w/api.php?{query}", headers={"User-Agent": USER_AGENT}
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as err:
            if err.code not in (429, 503) or attempt == 4:
                raise
            time.sleep(int(err.headers.get("Retry-After") or 2**attempt))
    raise AssertionError("unreachable")


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read()
        except urllib.error.HTTPError as err:
            if err.code not in (429, 503) or attempt == 5:
                raise
            time.sleep(max(int(err.headers.get("Retry-After") or 0), 2**attempt))
    raise AssertionError("unreachable")


def batched(items: list, size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def lead_images(titles: list[str]) -> dict[str, dict]:
    """title -> {thumb, file, width, height} for pages with a lead image."""
    found: dict[str, dict] = {}
    for batch in batched(titles, 50):
        data = api_get(
            "en.wikipedia.org",
            {
                "action": "query",
                "prop": "pageimages",
                "piprop": "thumbnail|name",
                "pithumbsize": THUMB_WIDTH,
                "titles": "|".join(batch),
            },
        )
        for page in data["query"]["pages"]:
            thumb = page.get("thumbnail")
            if thumb and page.get("pageimage") and thumb["width"] >= MIN_WIDTH:
                found[page["title"]] = {
                    "thumb": thumb["source"],
                    "file": page["pageimage"],
                    "width": thumb["width"],
                    "height": thumb["height"],
                }
        time.sleep(0.5)
    return found


def licenses(files: list[str]) -> dict[str, dict]:
    """file name -> {license, artist} from Commons extmetadata."""
    info: dict[str, dict] = {}
    for batch in batched(files, 50):
        data = api_get(
            "commons.wikimedia.org",
            {
                "action": "query",
                "prop": "imageinfo",
                "iiprop": "extmetadata",
                "titles": "|".join(f"File:{f}" for f in batch),
            },
        )
        for page in data["query"]["pages"]:
            md = (page.get("imageinfo") or [{}])[0].get("extmetadata", {})
            artist = re.sub(r"<[^>]+>", "", md.get("Artist", {}).get("value", ""))
            info[page["title"].removeprefix("File:").replace(" ", "_")] = {
                "license": md.get("LicenseShortName", {}).get("value", ""),
                "artist": " ".join(artist.split()),
            }
        time.sleep(0.5)
    return info


def license_allowed(name: str) -> bool:
    if "NC" in name.upper() or "ND" in name.upper():
        return False
    upper = name.upper()
    return upper.startswith(("CC BY", "CC0", "CC-BY", "PUBLIC DOMAIN", "PD"))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("trait_tsv", type=Path)
    ap.add_argument("out_dir", type=Path)
    ap.add_argument("--limit", type=int)
    args = ap.parse_args()
    (args.out_dir / "images").mkdir(parents=True, exist_ok=True)

    with args.trait_tsv.open(newline="") as f:
        titles = [row["page_title"] for row in csv.DictReader(f, delimiter="\t")]
    if args.limit:
        titles = titles[: args.limit]

    leads = lead_images(titles)
    meta = licenses(sorted({v["file"] for v in leads.values()}))
    print(f"lead images: {len(leads)} of {len(titles)} pages")

    kept = 0
    with (args.out_dir / "manifest.tsv").open("w", newline="") as f:
        w = csv.writer(f, delimiter="\t")
        w.writerow(
            ["species", "file", "license", "artist", "source", "width", "height"]
        )
        for title, lead in sorted(leads.items()):
            info = meta.get(lead["file"], {})
            if not license_allowed(info.get("license", "")):
                continue
            dest = args.out_dir / "images" / f"{title.replace(' ', '_')}.jpg"
            if not dest.exists():
                dest.write_bytes(fetch_bytes(lead["thumb"]))
                time.sleep(1.0)
            w.writerow(
                [
                    title,
                    lead["file"],
                    info.get("license", ""),
                    info.get("artist", ""),
                    f"https://commons.wikimedia.org/wiki/File:{lead['file']}",
                    lead["width"],
                    lead["height"],
                ]
            )
            kept += 1
    print(f"kept {kept} images under the license allowlist -> {args.out_dir}")


if __name__ == "__main__":
    main()
