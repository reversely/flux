"""The composed prompts: base contract present, measured wording intact."""

from flux_server.prompts import (
    BASE,
    CLIP_OBSERVER,
    chat_system_prompt,
    coach_step_prompt,
    trail_ask_prompt,
    trail_summary_prompt,
)


def test_every_surface_carries_the_base_contract():
    coach = coach_step_prompt("bowline", ["make a loop"])
    trail = trail_summary_prompt("sensor-1")
    ask = trail_ask_prompt("sensor-1", "was the creek crossable?")
    chat = chat_system_prompt("The guide is built on FM 21-76.")
    for prompt in (coach, trail, ask, chat):
        assert BASE in prompt
    for clip_prompt in (coach, trail, ask):
        assert CLIP_OBSERVER in clip_prompt
    assert CLIP_OBSERVER not in chat  # chat reads the corpus, no clip


def test_trail_ask_keeps_the_implication_first_shape():
    prompt = trail_ask_prompt("sensor-1", "was the creek crossable?")
    assert "was the creek crossable?" in prompt
    assert "practical implication for the hiker first" in prompt


def test_coach_task_keeps_the_benched_wording():
    prompt = coach_step_prompt("bowline", ["make a loop", "pass the end"])
    assert "You are watching someone tie a bowline step by step." in prompt
    assert "S0: make a loop\nS1: pass the end" in prompt
    # The answer-format line extends the bench schema with the transparency
    # fields (#197); the step field and its parse are unchanged.
    assert '"step": "S<n>"' in prompt
    assert '"seen":' in prompt
    assert '"subject_present":' in prompt


def test_trail_summary_layers_the_transcript():
    silent = trail_summary_prompt("sensor-1")
    spoken = trail_summary_prompt("sensor-1", "standing water on the left")
    assert "While filming, the user said:" not in silent
    assert "While filming, the user said:\nstanding water on the left" in spoken
    assert spoken.index("the user said") < spoken.index("video_understanding")


def test_chat_prompt_leads_with_no_think():
    prompt = chat_system_prompt("corpus text")
    assert prompt.startswith("/no_think\n")
    assert prompt.rstrip().endswith("corpus text")
