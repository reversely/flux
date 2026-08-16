"""Verification playthrough: results.json -> smoothed pointer timeline -> UI screenshots.

Simulates the server pointer (#66): monotone, advances to cur+1 when the majority
of the last 2 chunk predictions equals cur+1. Renders the phone UI at each advance
over the real tutorial frame and screenshots it with headless Chrome.
"""

import base64
import json
import subprocess
import sys
from pathlib import Path

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SCRATCH = Path(__file__).parent

KNOTS = {
    "palomar-TFk_Ktw2f1w": {
        "label": "PALOMAR",
        "ref": "p5.jpg",
        "attr": "commons.wikimedia.org/…/PalomarKnotSequence.jpg · Vaughan Pratt · CC BY-SA 3.0",
        "frags": [
            "Line and hook ready.",
            "Double the line into a loop.",
            "Thread the loop through the hook eye.",
            "Tie a loose overhand knot. Hook hangs in the middle.",
            "Pass the loop over the whole hook.",
            "Wet the knot (spit works). Pull both lines tight.",
            "Trim the tag end (the short leftover).",
        ],
    },
    "bowline-4phase": {
        "label": "BOWLINE",
        "ref": "refs/bowline.svg",
        "attr": "commons.wikimedia.org/…/Bowline_(standard2).svg · Phil'enCorse · CC BY-SA 4.0",
        "frags": [
            "Rope laid out. Not started.",
            "Form a small overhand loop in the standing part.",
            "Thread the working end: up through the loop, behind the standing part, back down.",
            "Pull tight. Fixed loop stays open.",
        ],
    },
    "square-OxdUfYKrcfY": {
        "label": "SQUARE KNOT",
        "ref": "refs/square.svg",
        "attr": "commons.wikimedia.org/…/Square_knot.svg · CountingPine · Public domain",
        "frags": [
            "Two rope ends laid out.",
            "Cross left end over right. Tuck under.",
            "Cross right end over left. Tuck under.",
            "Pull all four ends tight. Knot lies flat.",
        ],
    },
    "clove-vBDUz8PlKTA": {
        "label": "CLOVE HITCH",
        "ref": "refs/clove.svg",
        "attr": "commons.wikimedia.org/…/Mastworp.svg · Sawims · Public domain",
        "frags": [
            "Rope and pole ready.",
            "Wrap over the pole. Cross over the standing part.",
            "Wrap over again. Tuck the end under the last wrap.",
            "Pull both ends tight.",
        ],
    },
    "fig8-0CnYmY_B938": {
        "label": "FIGURE EIGHT",
        "ref": "refs/fig8.svg",
        "attr": "commons.wikimedia.org/…/Figure-eight_knot.svg · Lucasbosch · CC BY-SA 3.0",
        "frags": [
            "Rope laid out straight.",
            "Form a loop. Cross the end over the standing part.",
            "Wrap the end behind the standing part.",
            "Pass the end down through the loop.",
            "Pull both ends tight.",
        ],
    },
    "truckers-yUp3t-SbxIo": {
        "label": "TRUCKER'S HITCH",
        "ref": "refs/truckers.jpg",
        "attr": "commons.wikimedia.org/…/Truckers'_Hitch_With_Span_Loop.jpg · Cobanyastigi · CC0",
        "frags": [
            "Rope runs to the tie-off point.",
            "Form a small loop in the line.",
            "Pull a fold of rope through. Slipped loop.",
            "Working end around the tie-off point, up through the loop.",
            "Haul it tight.",
            "Lock off with two half hitches.",
        ],
    },
}


def smooth(preds, n_steps):
    """Monotone pointer: jump to a later step when two consecutive chunks agree on it."""
    cur, events = 0, []
    for i, p in enumerate(preds):
        if not p or not p.startswith("S") or i == 0 or preds[i - 1] != p:
            continue
        n = int(p[1:])
        if cur < n < n_steps:
            cur = n
            events.append((i, cur))
    return events


def data_uri(path):
    p = SCRATCH / path
    mime = "image/svg+xml" if p.suffix == ".svg" else "image/jpeg"
    return f"data:{mime};base64,{base64.b64encode(p.read_bytes()).decode()}"


def page(cfg, stage, n, frame_uri, t):
    frag = cfg["frags"][stage]
    dots = "".join(
        f'<span class="d{" cur" if i == stage else ""}">{i + 1}</span>'
        for i in range(n)
    )
    return f'''<!doctype html><meta charset="utf-8">
<style>
*{{box-sizing:border-box;margin:0}}
html{{background:#000}}body{{width:393px;height:852px;overflow:hidden;position:relative;margin:0 auto;
  font-family:-apple-system,system-ui,sans-serif;background:#101613}}
img.cam{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
img.ghost{{position:absolute;left:50%;top:64px;transform:translateX(-50%);width:36%;
  opacity:.95;background:rgba(255,255,255,.92);border-radius:8px;padding:6px}}
.top{{position:absolute;top:12px;left:12px;right:12px;display:flex;
  justify-content:space-between;font-size:12px;color:#e9f0ea}}
.chip{{background:rgba(12,18,15,.72);border:1px solid rgba(233,240,234,.2);
  border-radius:14px;padding:5px 10px}}
.chip.ev{{border-color:#ffb84d;color:#ffb84d}}
.bottom{{position:absolute;left:0;right:0;bottom:0;padding:12px 16px 14px;
  background:linear-gradient(transparent,rgba(10,15,12,.94) 45%);color:#e9f0ea;
  display:flex;flex-direction:column;gap:9px;text-align:center}}
.frag{{font-size:16px;font-weight:600;line-height:1.3}}
.dots{{display:flex;justify-content:center;gap:12px}}
.d{{width:30px;height:30px;border-radius:50%;border:1.5px solid rgba(233,240,234,.4);
  display:flex;align-items:center;justify-content:center;font-size:12px;color:#9db3a6}}
.d.cur{{background:#d9f25c;color:#101613;border-color:#d9f25c;font-weight:700}}
.attr{{font-size:8.5px;color:rgba(157,179,166,.65)}}
</style>
<img class="cam" src="{frame_uri}">
<div class="top"><span class="chip">{cfg["label"]} · {stage + 1}/{n}</span>
<span class="chip ev">ADVANCE → {stage + 1}/{n} · {t}s</span></div>
<img class="ghost" src="{data_uri(cfg["ref"])}">
<div class="bottom"><div class="frag">{frag}</div><div class="dots">{dots}</div>
<div class="attr">{cfg["attr"]}</div></div>'''


def main(case, results_path, frames_dir, outdir, stamp):
    cfg = KNOTS[case]
    rows = json.loads(Path(results_path).read_text())["rows"]
    preds = [r["pred"] for r in rows]
    n = len(cfg["frags"])
    events = [(0, 0)] + smooth(preds, n)
    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    made = []
    for chunk_i, stage in events:
        t = rows[chunk_i]["t1"]
        fnum = min(t + 2, rows[-1]["t1"])
        fpath = Path(frames_dir) / f"{fnum:03d}.jpg"
        if not fpath.exists():
            fpath = max(Path(frames_dir).glob("*.jpg"))
        uri = f"data:image/jpeg;base64,{base64.b64encode(fpath.read_bytes()).decode()}"
        html = outdir / f"_{case}_s{stage}.html"
        html.write_text(page(cfg, stage, n, uri, t))
        shot = outdir / f"{stamp}_{case}_stage{stage + 1}.png"
        subprocess.run(
            [
                CHROME,
                "--headless=new",
                "--disable-gpu",
                f"--screenshot={shot}",
                "--window-size=500,852",
                "--hide-scrollbars",
                f"file://{html}",
            ],
            capture_output=True,
            check=True,
        )
        html.unlink()
        from PIL import Image

        im = Image.open(shot)
        if im.width > 393:
            x = (im.width - 393) // 2
            im.crop((x, 0, x + 393, 852)).save(shot)
        made.append(str(shot))
        print(shot.name, f"(advance at {t}s)")
    return made


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
