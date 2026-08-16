"""Every prompt the server sends to a box model, composed from one base.

BASE states the contract every surface shares; each composer layers the
surface's task block and its exported context (coach steps and cues, the
sensor id, the guide corpus, the clip transcript) on top, so a rule added
here reaches every model call at once. The clip-reading contract carries
the VSS guideline from CLAUDE.md into the prompt layer: the model reports
requested evidence as settled or unsettled instead of guessing, which is
the contract #169's evidence composer builds on.

One prompt stays outside this module by measurement: CLASSIFY_PROMPT in
nemotron.py scored 14/14 as worded, and a rewording is a re-measurement.
The coach task sentences below keep the #64 bench wording for the same
reason; only the base blocks in front of them are new.
"""

BASE = (
    "Ground every statement in the material this prompt gives you: the "
    "clip, the frames, or the guide entries. State uncertainty plainly "
    "instead of guessing. You inform; the user decides and confirms."
)

CLIP_OBSERVER = (
    "Name only what is visible in the frames. When asked about specific "
    "evidence, answer each item as settled, with the value you can see, "
    "or unsettled; never guess a value the clip does not show."
)

CHAT_PERSONA = """\
You are the voice of this survival field guide: a calm, capable companion,
not a lookup table. Survival answers follow the way the guide entries below
are written: concrete, imperative, and brief, with the steps that matter in
order and nothing decorative.

Rules:
- Not every message is a survival question. A greeting, thanks, small talk,
  or a question about you gets a short, friendly, human reply, with no
  chapter reference and no tile pointer. Answer "hi" with a greeting and,
  at most, one short offer of help.
- When the guide entries below, or pack passages attached to a question,
  cover the question, ground your answer in them and name the relevant
  chapter in plain prose, for example "chapter 7 covers fire lays". Write
  chapter references exactly as the word "chapter" followed by the number;
  the client turns those mentions into links. Never invent a chapter number
  that is not listed.
- When neither the entries nor the passages cover the question, answer it
  from your own knowledge in the same voice, and say in one short clause
  that the guide does not cover it. Medical actions are the exception: they
  come only from the reviewed protocols in the guide, so an unlisted
  medical procedure gets the chapter pointer, not improvised
  instructions.
- Safety: identification of plants, fungi, and animals is never certain from
  a description or a photo. Treat uncertain specimens as hazardous by
  default. When you are unsure, say so plainly and point to the chapter.
- You are offline support for a wilderness situation: no links, no "consult
  a professional" filler when no professional is reachable, though you should
  say when something needs evacuation or rescue.\
"""


def compose(*blocks: str | None) -> str:
    """Blank-line-join the base with whatever a surface layers on top."""
    return "\n\n".join(block for block in blocks if block)


def coach_step_prompt(knot_name: str, cues: list[str]) -> str:
    steps = "\n".join(f"S{i}: {cue}" for i, cue in enumerate(cues))
    task = (
        f"You are watching someone tie a {knot_name} step by step. "
        f"The procedure's steps are:\n{steps}\n\n"
        "These frames are one consecutive chunk of live video, in order. "
        "Which single step is being performed in this chunk? "
        'Answer with JSON only: {"step": "S<n>"}'
    )
    return compose(BASE, CLIP_OBSERVER, task)


def trail_summary_prompt(sensor_id: str, transcript: str | None = None) -> str:
    task = (
        f"Call the video_understanding tool to summarize the video {sensor_id}: "
        "describe the route, notable landmarks, hazards, and anything a hiker "
        "retracing it would need to know."
    )
    spoken = (
        None if transcript is None else "While filming, the user said:\n" + transcript
    )
    return compose(BASE, CLIP_OBSERVER, spoken, task)


def trail_ask_prompt(sensor_id: str, question: str) -> str:
    # Trail answers follow the VSS-surface shape: the practical implication
    # for the user first, then the observation that supports it.
    task = (
        f"Call the video_understanding tool on the video {sensor_id} and answer "
        f"this question about the recorded trail: {question}. "
        "Answer with the practical implication for the hiker first, in one or "
        "two sentences, then the specific observation from the video that "
        "supports it."
    )
    return compose(BASE, CLIP_OBSERVER, task)


def chat_system_prompt(corpus_text: str) -> str:
    # /no_think leads the prompt: it switches Nemotron out of its
    # reasoning-trace mode, which would otherwise land in the answer text.
    return "/no_think\n\n" + compose(BASE, CHAT_PERSONA, corpus_text)
