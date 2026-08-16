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

## Weather and sky reading

Cloud identification fits the identification form. A genus follows from characters a user can see:
the height band the cloud occupies, whether it is layered or heaped, whether it is fibrous or
sharp-edged, whether precipitation reaches the ground, and how much sky it covers. The useful
output is not the name but what the sky implies, so the walk ends on the weather a genus signals.

Sources, verified:

- **NOAA JetStream** carries all ten genera on one page, with a separate cloud chart page. US
  government work, public domain, and the natural spine for the character values.
- **FM 21-76 Appendix G** covers clouds and sits inside the manual the product already uses, so
  its text carries the same provenance as every other node. It is missing from the repo's copy of
  the manual, for the reason recorded below.
- **Wikimedia Commons** has `Category:Cloud types` with a subcategory per genus, so per-genus
  reference imagery exists. Licences vary by file, which is what the per-file licence field in
  #144 is for.
- **The WMO International Cloud Atlas is unusable.** Its terms permit personal, non-commercial
  use only, with no right to redistribute, compile, or create derivative works, and prior
  permission is required for anything else. Do not extract characters or images from it.

## Tile 11, the tropical chapter

Chapter 14 runs seven pages, 139 to 145 of the reprint, and carries one figure callout, 14-1. Most
of it is zone description (rain forest, secondary jungle, scrub and thorn forest, savanna, salt and
fresh water swamps), an edible-plant list, and warnings, which is reference material rather than
procedure.

One genuine process sits inside it: obtaining drinking water from a palm. The manual's own words
give the steps, which is unusual for this chapter. Bend a flowering stalk of a buri, coconut, or
nipa palm downward and cut off its tip, collect the sugary fluid, and renew the flow by cutting a
thin slice from the stalk. It has an observable completion cue at each step, so it fits the process
form, and the shelter and insect-protection material belongs with the Shelter tile's guides rather
than with a tropical guide of its own.

Chapter 14 has no per-step figure. Commons has no plate citing it. The palm-tapping procedure
therefore ships with its text and no reference image until one is found.

## The manual in this repo is truncated

`FM21-76_SurvivalManual.pdf` is a 233-page reprint that ends part-way through chapter 23, on
getting water in a chemical environment. Every appendix is missing. The Commons scan runs to 646
pages and includes Appendix B, 111 edible species on a fixed schema, and Appendix G, clouds.

This matters beyond the appendices: the pack, its 1,002 blocks, and its 129 figure citations were
all parsed from the truncated copy, so the content model has never seen roughly two thirds of the
document.
