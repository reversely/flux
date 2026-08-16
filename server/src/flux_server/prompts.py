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
reason; only the base blocks in front of them are new. The one later change
is the answer-format line, which now also asks for what is visible and
whether the procedure's materials are in frame; the step field and its
parse are unchanged, and the extended wording was re-verified live against
the box on 2026-08-16 (bowline clip still classifies; an off-subject clip
reports subject_present false).
"""

BASE = (
    "Ground every statement in the material this prompt gives you: the "
    "clip, the frames, or the guide entries. State uncertainty plainly "
    "instead of guessing. You inform; the user decides and confirms. "
    "Write plain prose: no markdown, no asterisks, no headings, no "
    "bullet syntax. The screen renders text exactly as you write it."
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
  that the guide does not cover it and that you will note the topic for
  the library's review log. Medical actions are the exception: they
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
        f"{COACH_ANSWER_FORMAT}"
    )
    return compose(BASE, CLIP_OBSERVER, task)


# The shared answer-format line for both coach prompts: the step field keeps
# the bench contract; seen and subject_present are the transparency fields
# the app shows so a model call is never silent about what it looked at.
# Field order is measured, not stylistic: with step first, the model echoed
# a cue verbatim as seen and reported a sky clip as subject_present true;
# describing the frames before classifying grounded all three fields
# (live probes, 2026-08-16).
COACH_ANSWER_FORMAT = (
    "First look at the frames alone and decide whether the rope or "
    "materials for this procedure are visible in them at all. "
    'Answer with JSON only: {"seen": "<one short clause describing what '
    "the frames actually show, in your own words, never copied from the "
    'step list>", "subject_present": <true only if the rope or materials '
    "are visible in the frames; false for anything else such as sky, "
    'faces, rooms, or unrelated objects>, "step": "S<n>"}'
)


def coach_procedure_prompt(procedure_phrase: str, cues: list[str]) -> str:
    # The non-knot coach wording. Benched and trained verbatim in
    # docs/training/t3_zeroshot.ipynb; a rewording is a re-measurement.
    steps = "\n".join(f"S{i}: {cue}" for i, cue in enumerate(cues))
    task = (
        f"You are watching someone perform {procedure_phrase} step by step. "
        f"The procedure's steps are:\n{steps}\n\n"
        "These frames are one consecutive chunk of live video, in order. "
        "Which single step is being performed in this chunk? "
        f"{COACH_ANSWER_FORMAT}"
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
