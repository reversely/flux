# flux-librarian: the personal-sync agent

The librarian works the station's research queue — the topics the user's
own questions put there — and syncs source material for them onto the box.
It is the functional agent behind the library feed's "gather pass": the
app's Library screen shows its events live, tagged `flux-librarian on the
box`.

## How it runs

- Script: `~/flux/librarian/librarian.py`, venv `~/flux/librarian/venv`
  (`httpx[http2]` — Wikipedia's rest.php rejects HTTP/1.1 clients).
- Schedule: cron, every 30 minutes, self-locking
  (`/tmp/flux_librarian.lock`), logging to `~/flux/librarian/librarian.log`.
- Station: `http://172.16.95.92:8000` (override `FLUX_STATION_URL`).
  Reads `GET /v1/library/queue`; reports `POST /v1/library/feed`; marks
  `POST /v1/library/queue/status`.
- Staging: `~/flux/data/universal/library-staged/<topic-slug>/` — each PDF
  beside a `.meta` (url, title, license, sha256). Nothing joins a pack
  without review.

## Operating it from this console

This console consults; the operator runs (see README: the chat tier cannot
execute tool calls). Commands to advise:

- Run a pass now: `~/flux/librarian/venv/bin/python ~/flux/librarian/librarian.py`
- Last activity: `tail -20 ~/flux/librarian/librarian.log`
- What is staged: `find ~/flux/data/universal/library-staged -name "*.meta" | xargs -I{} head -2 {}`
- Pause: `crontab -l | grep -v flux/librarian | crontab -` (re-add per this file)
- The station's view: `curl -s $STATION/v1/library/feed | head -c 2000`

## Upgrade path to console execution

The lightning vLLM endpoint (:30084) rejects streaming tool calls only for
missing launch flags (`--enable-auto-tool-choice --tool-call-parser ...`),
unlike the Nemotron NIM's hard template rejection. Relaunching lightning
with those flags would let a NemoClaw agent execute this skill's commands
itself; coordinate with the chat-option owner (#237/#238) before changing
that container's flags.
