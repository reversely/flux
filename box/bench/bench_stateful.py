"""Phase A stateful bench: simulate the coach state machine over chunks.

Each chunk the VLM sees only a 3-way question anchored on the current step:
still on it, moved to the next step, or neither. The pointer advances on
"next"; accuracy is the pointer's agreement with ground truth per chunk.
"""

import json
import sys
from pathlib import Path

import httpx
from bench_step_state import ask, chunk_frames, gt_label, load_case, parse_answer


def build_stateful_prompt(case, cur):
    steps = case["steps"]
    nxt = min(cur + 1, len(steps) - 1)
    return (
        f"You are coaching someone tying a {case['knot']}. "
        f'They are currently on step S{cur}: "{steps[cur]}". '
        f'The next step is S{nxt}: "{steps[nxt]}".\n'
        "These frames are one consecutive chunk of live video, in order. Decide:\n"
        f'- "current": still performing S{cur}\n'
        f'- "next": S{cur} is complete and S{nxt} has begun or is complete\n'
        '- "other": neither step is what the frames show\n'
        'Answer with JSON only: {"verdict": "current"|"next"|"other", '
        '"confidence": "high"|"medium"|"low"}'
    )


def main(case_dir):
    case, frames = load_case(Path(case_dir))
    n_steps = len(case["steps"])
    cur, rows, correct = 0, [], 0
    streak = 0
    with httpx.Client() as client:
        for t0, t1, group in chunk_frames(frames):
            text, latency = ask(client, build_stateful_prompt(case, cur), group)
            ans = parse_answer(text) or {}
            verdict = ans.get("verdict")
            streak = streak + 1 if verdict == "next" else 0
            if streak >= 2 and cur < n_steps - 1:
                cur += 1
                streak = 0
            ok = gt_label(case, t0, t1)
            hit = f"S{cur}" in ok
            correct += hit
            rows.append(
                {
                    "t0": t0,
                    "t1": t1,
                    "verdict": verdict,
                    "pointer": f"S{cur}",
                    "gt": sorted(ok),
                    "hit": hit,
                    "latency_s": round(latency, 2),
                }
            )
            print(
                f"[{t0:3d}-{t1:3d}s] verdict={verdict} pointer=S{cur} "
                f"gt={sorted(ok)} {'OK' if hit else 'MISS'} {latency:.1f}s",
                flush=True,
            )
    n = len(rows)
    summary = {
        "case": case["knot"],
        "mode": "stateful-debounce2",
        "chunks": n,
        "accuracy": round(correct / n, 3),
        "mean_latency_s": round(sum(r["latency_s"] for r in rows) / n, 2),
    }
    print(json.dumps(summary))
    (Path(case_dir) / "results_stateful_db2.json").write_text(
        json.dumps({"summary": summary, "rows": rows}, indent=1)
    )


if __name__ == "__main__":
    main(sys.argv[1])
