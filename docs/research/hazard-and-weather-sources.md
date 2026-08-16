# Disaster scenarios and weather: what the sources actually support

Research date: 2026-08-15. Closes the gap the tile briefs left: PRD 2.1 lists disaster scenarios
as an MVP 1 feature, and no brief covered them.

Every source below was fetched. Ready.gov and the agencies behind it are US government works and
public domain. Ready.gov refuses a plain fetch with HTTP 403 and answers a browser user agent, so
a harvester needs one.

## The six scenarios, and which are walks

The product has two forms, and neither fits most of this material. A **process walk** asks whether
a step is complete and needs an observable completion cue. A **reference card** is text the user
reads. Most disaster guidance is the second, and pretending otherwise would put a camera between a
user and an emergency.

| Scenario | Source structure | Form | Reason |
| --- | --- | --- | --- |
| Flood | Before, During, After sections of bulleted actions | reference card | Actions are decisions about where to go, not steps with a visible finished state |
| Storm and hurricane | Before, During, After | reference card | Same shape as flood |
| Earthquake | Numbered: 1 Drop or Lock, 2 Cover, 3 Hold On, with variants for a cane, a walker, and a wheelchair | reference card, rehearsable | The sequence is genuinely three ordered steps, but it runs during shaking, when nobody is holding a phone at the subject. Worth a rehearsal mode, never a live walk |
| Pandemic | Prepare, During, After | reference card | No physical procedure |
| Chemical release | Shelter-in-place and evacuation guidance | reference card | Decision guidance, and the page carries no heading structure to decompose |
| Infrastructure and power failure | Topic sections: preparing, medical needs, appliances, food storage, generator safety, returning | reference card with two checkable values | See below |

The one place this material becomes checkable is the power outage page, which states thresholds
rather than advice:

- Generators and fuel are used outdoors and at least 20 feet from windows, doors, and attached
  garages.
- Food held at 40 degrees or above for two hours or more is discarded, as is any food with an
  unusual odour, colour, or texture.

Those two belong in the pack as values a node can state and a timer can enforce, in the same
category as the EPA's water contact times and the eight-hour edibility test.

The earthquake sequence is worth one exception to the reference-card verdict. Drop, Cover, Hold On
is three ordered steps with named variants for a cane, a walker, and a wheelchair, and it is the
one piece of disaster guidance people are told to practise. It fits the process form as a
**rehearsal**, with the camera off and the user tapping through, which is how the timed checklists
already work.

## What this means for the roadmap

No disaster scenario earns a camera walk. They ship as reference cards in the encyclopedia with
their before, during, and after structure preserved, two enforceable values from the power outage
page, and one rehearsable sequence for earthquakes. This is the honest-absence rule from PRD 6.5.5
applied to a whole feature: the material is authoritative and worth shipping, and no model
observes it.

## Still open

The tropical chapter of the manual and the weather and sky reading material are not covered here.
The agent researching them was interrupted, and both remain open rows in `coverage.md`.
