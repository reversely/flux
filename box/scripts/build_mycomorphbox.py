"""Extract Wikipedia mycomorphbox traits into a structured fungi table.

Walks every article transcluding Template:Mycomorphbox through the public
Wikipedia API and writes mycomorphbox.tsv: one row per article with the
template's seven characters (hymenium type, cap shape, gill attachment, stipe
character, spore print color, ecology, edibility, each with its optional
secondary value) plus the page title and revision id. Title and revision id
make each row attributable to its exact source revision, which CC BY-SA
requires when the table ships in a pack.

Run on the box:
  ~/flux/venvs/tools/bin/python build_mycomorphbox.py ~/flux/data/universal/fungi-mycomorphbox
"""

import argparse
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://en.wikipedia.org/w/api.php"
# Wikipedia's API etiquette wants a contactable client string.
USER_AGENT = "flux-lifekit-mycomorphbox/1.0 (offline survival assistant build)"
PARAMS = [
    "name",
    "hymeniumType",
    "capShape",
    "capShape2",
    "whichGills",
    "whichGills2",
    "stipeCharacter",
    "stipeCharacter2",
    "sporePrintColor",
    "sporePrintColor2",
    "ecologicalType",
    "ecologicalType2",
    "howEdible",
    "howEdible2",
]


def api_get(params: dict) -> dict:
    query = urllib.parse.urlencode({**params, "format": "json", "formatversion": 2})
    req = urllib.request.Request(f"{API}?{query}", headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def transcluding_titles() -> list[str]:
    titles: list[str] = []
    cont: dict = {}
    while True:
        data = api_get(
            {
                "action": "query",
                "list": "embeddedin",
                "eititle": "Template:Mycomorphbox",
                "einamespace": 0,
                "eilimit": 500,
                **cont,
            }
        )
        titles += [p["title"] for p in data["query"]["embeddedin"]]
        cont = data.get("continue") or {}
        if not cont:
            return titles
        time.sleep(0.5)


def revisions(titles: list[str]) -> list[dict]:
    """One API call for up to 50 titles; returns page dicts with wikitext."""
    data = api_get(
        {
            "action": "query",
            "prop": "revisions",
            "rvprop": "content|ids",
            "rvslots": "main",
            "titles": "|".join(titles),
        }
    )
    return data["query"]["pages"]


def extract_template(wikitext: str) -> str | None:
    """Return the full {{mycomorphbox ...}} source, tracking brace depth so
    nested templates inside parameter values stay intact."""
    m = re.search(r"\{\{\s*mycomorphbox", wikitext, re.IGNORECASE)
    if not m:
        return None
    depth = 0
    for i in range(m.start(), len(wikitext) - 1):
        pair = wikitext[i : i + 2]
        if pair == "{{":
            depth += 1
        elif pair == "}}":
            depth -= 1
            if depth == 0:
                return wikitext[m.start() : i + 2]
    return None


def parse_params(template: str) -> dict[str, str]:
    body = template.strip()[2:-2]
    body = re.sub(r"<!--.*?-->", "", body, flags=re.DOTALL)
    parts: list[str] = []
    depth = 0
    start = 0
    for i, ch in enumerate(body):
        if body[i : i + 2] == "{{" or body[i : i + 2] == "[[":
            depth += 1
        elif body[i : i + 2] == "}}" or body[i : i + 2] == "]]":
            depth -= 1
        elif ch == "|" and depth == 0:
            parts.append(body[start:i])
            start = i + 1
    parts.append(body[start:])
    fields: dict[str, str] = {}
    for part in parts[1:]:
        if "=" not in part:
            continue
        key, value = part.split("=", 1)
        fields[key.strip()] = " ".join(value.split())
    return fields


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("out_dir", type=Path)
    ap.add_argument("--limit", type=int, help="stop after N pages (smoke test)")
    args = ap.parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)

    titles = transcluding_titles()
    if args.limit:
        titles = titles[: args.limit]
    print(f"{len(titles)} articles transclude Template:Mycomorphbox")

    out = args.out_dir / "mycomorphbox.tsv"
    n_rows = 0
    with out.open("w") as f:
        f.write("\t".join(["page_title", "revid", *PARAMS]) + "\n")
        for i in range(0, len(titles), 50):
            for page in revisions(titles[i : i + 50]):
                rev = page.get("revisions", [{}])[0]
                template = extract_template(
                    rev.get("slots", {}).get("main", {}).get("content", "")
                )
                if not template:
                    continue
                fields = parse_params(template)
                row = [page["title"], str(rev.get("revid", ""))]
                row += [fields.get(p, "") for p in PARAMS]
                f.write("\t".join(row) + "\n")
                n_rows += 1
            time.sleep(0.5)

    print(f"traits: {n_rows} species -> {out}")


if __name__ == "__main__":
    main()
