# CLAUDE.md

Guidance for Claude Code working in this repository.

Flux inspects solder joints live through a phone camera: a React Native app under `app/` scans
the solder side of a circuit board, and a Python inference server under `server/` labels each
visible joint. The PRD lives at `docs/prd.md`; the active plan is
`docs/plans/mvp-roadmap-milestone-1.md`.

## The session log

`docs/log.md` is the running worklog: findings, dead ends, and why. Keep it updated as work happens,
not at the end. It is gitignored and never staged. It is a local handoff between sessions, not a
published document. Do not `git add` it. Add new entries newest first, at the top of the file. Write
what a reader six months from now would need: what was tried, what was actually measured, what turned
out to be wrong, and the lesson. A commit message says what changed; the log says what was learned.

## Tickets

Work is organized as GitHub issues in `reversely/flux`. One ticket is one commit directly to `main`.
No feature branches.

The commit message body ends with `closes #N`, and the commit is pushed immediately so the issue
auto-closes. Verify the fast suite is green first (see Tests). Write the subject in Conventional
Commits form (`type(scope): imperative subject`) following the `commit-message` skill.

Keep a change scoped to its ticket. When a neighbouring bug or a wrong rule turns up in a file you are
already editing, file it rather than folding an unrelated fix into the diff.

### Labels

`area:app`, `area:server`, `area:model`, `area:infra`, `area:docs`.

## Tests

```
uv run pytest server/tests -q
```

App-side jest tests arrive with the quality module (#7); add their command here when they exist.

## Environment: uv by default

This repo uses `uv` for Python dependency and environment management.

- `pyproject.toml` is the single source of truth for dependencies. Add a runtime dependency with
  `uv add <package>`, a dev-only dependency with `uv add --dev <package>`. Do not hand-edit the
  dependency list without also running `uv lock`.
- `uv.lock` is committed. A durable repo pins its full dependency graph, not just its direct
  dependencies, so a fresh clone reproduces the exact environment that was tested.
- `.python-version` pins the interpreter version `uv` provisions. Set it once at repo creation and
  bump it deliberately, not as a side effect of an unrelated change.
- Run everything through `uv run`, not a bare `python`/`pytest` invocation against an ambient
  interpreter. This keeps a contributor's local run and CI honest about which environment actually
  produced the result.
- `uv sync` reproduces the locked environment from a fresh clone. It's the first command a new
  contributor, or a new agent session, runs.

Monorepo split: a uv workspace rooted at the top-level `pyproject.toml`, which carries repo-wide
dev tooling (pre-commit, detect-secrets); `server/` holds the `flux-server` workspace member;
`app/` is npm-managed and uv never touches it. `uv sync --all-packages` reproduces the whole
environment from a fresh clone.

## Style

@~/.claude/shared/style.md

Mechanical hygiene (secrets, formatting, dead code, large files) is enforced by
`.pre-commit-config.yaml`, not restated here.
