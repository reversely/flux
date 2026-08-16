# Guided walks: the product's core interaction

LifeKit answers a question by walking the user through a curated list of questions drawn from
the manual, one node at a time, with the camera open. The manual's written instructions and
figures are the ground reference. Inference answers the single bounded question at the current
node and nothing else. The engine that traverses the list is deterministic, and the user
confirms every answer.

This document describes the mechanism every feature routes into. The mushroom edibility walk is
its first implementation.

## What a guide is

A guide is a structured list, authored from pack content, whose nodes are questions. Each node
carries the question text, the answers it accepts, the manual block and figure that ground it,
and the condition under which the camera can supply the answer.

Three intents share the format:

| Intent | Example question | What an answer does |
| --- | --- | --- |
| Identify | "Is this plant edible?" | Eliminates candidates from a set |
| Build | "How do I start a fire?" | Advances a step, and may branch |
| Find | "How do I follow the stars to go 100 km east?" | Advances a navigation procedure |

Identification narrows; building and finding advance. Both traversals ask a node, take an
answer, and cite the text the node came from.

## Where inference sits

The model observes one attribute at the current node: "do the gills run down the stem", "is the
tinder bundle loose enough to see light through it". It returns an answer and a confidence. It
never chooses the next question, never ranks candidates, and never writes guidance text. The
guide decides what to ask, the pack decides what the answer means, and the user confirms before
the walk moves on.

A question the camera cannot judge is answered by the user. The eight-hour edibility test is the
clearest case: it is a timed checklist, and no model watches it.

## One session, camera open

The camera view opens when the question is asked and stays open until the question resolves. The
walk renders inside it:

- The guide's scope statement appears as a banner for the first seconds.
- The current question renders as a card anchored beside the item.
- The node's reference image renders beside the live feed, so the user compares against the
  manual figure rather than a memory of it.
- The candidate count, where the walk eliminates, sits in a persistent corner element.
- The user answers by voice or by tapping the card.

## Capture states

The device tracks continuously and transmits rarely. Four states:

1. **Passive tracking.** No decision is open. A low-cost tracker holds item lock and pose,
   records nothing, and sends nothing. This covers most of a session, including the time the
   user spends rotating the subject between questions.
2. **Trait acquisition.** The walk reaches a question the camera can answer. Frames buffer and
   the local trait model runs. Above the confidence threshold, the answer is written, the single
   supporting keyframe is kept as evidence, and the buffer is discarded.
3. **Escalation.** Confidence stays below the threshold through a bounded attempt window, on the
   order of three seconds of usable frames. The best segment for that trait is compressed and
   sent to the escalation model. The overlay states the cause, such as "checking gill
   attachment", so the pause is explained. The answer and its confidence come back, and the walk
   returns to passive tracking.
4. **Verification recording.** In a procedural guide, completing a step is itself a decision, so
   a short clip records when the user signals completion. Between steps the walk returns to
   passive tracking.

### The trigger rule

Video records or transmits only when an unanswered question or an unverified step is active and
the current frame plausibly contains the evidence. Each node authors what plausibility means for
its question: the gill question activates capture only when pose estimation reports the cap
underside facing the camera. Capture timing therefore follows the authored reference, which is
what keeps it inside the routing rule below.

A five-minute identification session with two escalations uploads roughly two three-second
clips.

## Routing

Every input resolves to a guide. A chat question selects the guide whose walk answers it and
opens that walk. Nothing is answered by free generation, and no screen invents a procedure the
pack does not carry.

## Open question

Where the local tier runs is unresolved. The capture states above describe a cheap local model
escalating to a heavier one, and the deployment table in the PRD places all perception on the
GN100 with the phone holding the camera and buffered video. The states are written as "local
tier" and "escalation tier" until that placement is decided.

## What this supersedes

Coaching was previously specified as continuous step-state classification over a clip stream,
measured by benching video datasets. That framing is retired. Inference is a per-node attribute
check, so a procedure needs authored nodes and reference figures rather than a video corpus.
