# Crafting recipe skill-level estimates (internal notes)

Not shown anywhere on the site — this is Claude's working notes for guessing each
recipe's real underlying skill requirement, per the user's 2026-07-03 request to keep
calculating this "in the background" now that the colored difficulty badge has been
removed from the public Crafting page (the color is only meaningful for the one user's
skill level at the moment the screenshot was taken, so showing it live was misleading).

`crafting.json` still stores `difficultyColor` / `observedAtSkill` for every recipe — this
file is a derived, speculative layer on top of that data, not a replacement for it. Don't
copy the numbers below into `crafting.json`'s `recipeSkillLevel` field. Everything here is
a guess of varying confidence — see the retraction below for why nothing here counts as
exact anymore.

## Retraction (2026-07-04): White is not an exact pin

The 2026-07-03 rule "a White recipe means the recipe's skill level exactly equals the
crafter's current skill" is wrong — caught by the user themselves. If it were true, White
would always be the *lowest* color a 0-skill crafter could ever see (nothing can be "easier
than 0"), but Green/Dark Blue/Light Blue recipes are observed even at 0 skill. That's only
possible if White doesn't mark a single exact point at all — it's presumably just another
band, like every other color, that happens to straddle the crafter's current skill rather
than pin it exactly.

Every recipe below that was previously listed as "exact"/"Confirmed" from a White
observation has been downgraded — the underlying color+skill data point is still real and
still recorded, only the "this means the exact value" interpretation has been removed.
`crafting.json`'s `recipeSkillLevel` field has been cleared out entirely (see CLAUDE.md) and
won't be repopulated until a real confirmed method exists — with one narrow exception below.

## The one case that *is* exact: Green at 0 skill

The user confirmed (2026-07-04) the color scale is a continuous gradient tied to the gap
between the crafter's skill and the recipe's requirement — e.g. a recipe requiring skill 50
would show Red at 0 skill, some moderate color around skill 50, and Green once skill climbs
well past 50 (their own example: "a craft that requires 50 skill will be Red if I am level
0, ... and if I have 300 skill it will surely be Trivial green"). Combined with the axiom
that skill requirements can't be negative, this pins down exactly one case: **a recipe
observed as Green at `observedAtSkill: 0` must have `recipeSkillLevel: 0`** — Green means
"far exceeds the requirement," and the only way to far-exceed something from a floor of 0 is
if that something is also 0. This does NOT extend to White/Dark Blue/Light Blue at 0 skill —
per the gradient model, a recipe with even a modest requirement (their example used 50)
would already show as Red at 0 skill, not a moderate color, so seeing White at 0 skill just
suggests a low requirement, it doesn't prove one exactly.

None of the currently-recorded data has a Green observation at skill 0 yet (the Jewelcrafting
batch below was White/Orange/Red at skill 0, not Green) — this rule is ready to apply the
moment one shows up. The 13 Jewelcrafting Ring recipes observed as White at skill 0 (see
table below) are worth flagging as *probably* low, by the same reasoning — a recipe with a
real requirement of, say, 50 wouldn't show White for a skill-0 crafter — but "probably low"
isn't the same as "exactly 0," so they stay unset in `crafting.json`.

Nothing in this file should be read as more certain than "a reasonable band, given the
color-ordering rule that's still
believed to hold" (Green < Light Blue < Dark Blue < White < Yellow < Orange < Red, easier to
harder relative to the crafter's own skill at observation time).

## Band width looks fixed at 5 skill points, anchored to absolute skill (2026-07-04)

The user's hypothesis: bands aren't relative/ratio-based per recipe — every color band is
exactly 5 skill points wide, and the boundaries fall on the same absolute skill values
(skill 25, 30, 35, ...) for every recipe, regardless of that recipe's own requirement. A
large same-day recapture of Leatherworking at skill 28 through 35 (eight separate crafting-
window screenshots) supports this strongly: **seven different recipes** (Rawhide Boots,
Rawhide Saddlebag, Rawhide Cap, Rawhide Shoulderpads, Enchanted Rawhide Canvas, Rawhide
Saddle, Rawhide Leggings — plus Rawhide Belt/Mask from the prior batch) all changed color at
the *same* two boundaries: between skill 29 and 30, and again between skill 34 and 35.

```
                      25-29        30-34        35-39        40
Rawhide Boots:        White        Dark Blue    Light Blue*  —
Rawhide Saddlebag:    Yellow       White        Dark Blue    Light Blue
Rawhide Cap:          Orange†      Yellow       White        Dark Blue
Rawhide Shoulderpads: Orange†      Yellow       White        Dark Blue
Enchanted Rwhd Canvas:Orange†      Yellow       White        Dark Blue
Rawhide Saddle:       Orange‡      Yellow       (unchanged)  White
Rawhide Leggings:     Red‡         (unchanged)  Orange       Yellow
Enchanted Rwhd Cap:   —            Red          (unchanged)  Orange
Rawhide Backpack:     —            —            Red          Orange
Rawhide Belt/Mask:    Light Blue   Green (30+, confirmed 30/31/33)
```
(*Boots only confirmed at 35, not the full 35-39 span — no data past 35 for it yet. †Cap/
Shoulderpads/Enchanted Canvas only confirmed Orange at 28-29 within the 25-29 tier. ‡Saddle/
Leggings only have data starting at 30, not 25-29.)

Every single one of these lines up on a multiple of 5 — now confirmed at **three separate
boundaries** (skill 4→5, 29→30, 34→35) and, with a further same-day recapture at skill 39 and
40, a **fourth** (39→40), across more than a dozen recipes total. This also retroactively
explains the 2026-07-03 Rawhide Canvas/Bracelet/Cloak/Gloves/Belt/Mask jump at skill 4→5. At
this point the fixed-5-point-tier model should be treated as well-supported, not just a
hypothesis — though still not "proven" in the sense the retracted White rule once claimed to
be, since no observation has yet directly disproven an alternative explanation.

**Working model:** picture skill divided into 5-point tiers (0-4, 5-9, 10-14, ..., 25-29,
30-34, 35-39, ...). Each recipe has its own tier requirement; the displayed color reflects
how many tiers apart the crafter's tier is from the recipe's tier (same
Green-Light Blue-Dark Blue-White-Yellow-Orange-Red ordering as before), not a raw skill-point
gap. This is a hypothesis, not a proven mechanic — pixel colors were re-verified against
known-labelled reference cards (see the corrected Orange vs Red calibration below) to rule
out a measurement error, but it hasn't been tested against a recipe that *doesn't* land on a
tier boundary in this clean a way. If a future recapture ever shows a color change that
doesn't fall on a multiple of 5, that would break this model and it should be retracted the
same way the White-exact rule was.

**Note on the Orange/Red pixel calibration:** earlier in this file "Red" and "Orange" were
occasionally hard to tell apart from screenshots alone. Verified 2026-07-04 against two cards
with known wording — Copper Scimitar's "herculean task" (Orange) samples at RGB
~(189-227, 83-165, 0-30), and Enchanted Copper Plate's "you will require all your skills"
(Red) samples at RGB ~(200-255, 28-55, 25-50). The distinguishing channel is green: Orange
sits around G=80-165, Red drops to G=28-55. All the color calls in this file's Leatherworking
tables have been checked against this calibration.

## The estimate method (revised 2026-07-03, further weakened 2026-07-04)

The original approach (see git history) assumed a fixed number of skill points per color
step and derived ~11.3 from one Red(22)->White(56) pair — treating White as an exact anchor.
A second inbox batch on 2026-07-03 supplied crafting-window recaptures of the same first 8
Leatherworking recipes (Rawhide Canvas/Strap/Bracelet/Gorget/Cloak/Gloves/Belt/Mask) at
skill 1, 2, 3, 4, and 5:

```
Skill 1-4 (unchanged across all four): Canvas/Strap = Light Blue, Bracelet/Gorget = Dark Blue,
                                        Cloak/Gloves = Yellow, Belt/Mask = Red
Skill 5:                               Canvas/Strap = Green,      Bracelet/Gorget = Light Blue,
                                        Cloak/Gloves = White,      Belt/Mask = Orange
```

Four pairs of recipes each jumped a full color band in a single skill point (4 -> 5). A
fixed ~11-point band width couldn't produce that jump, so the working hypothesis became
"band width scales with the recipe's own skill requirement" (roughly ratio-based). That
hypothesis was built partly on treating the two White observations above as exact anchors
(5 and 56) — with White's exactness now retracted, the ratio-vs-flat-step question is back
to genuinely open. Treat the numbers below as illustrative, not derived with any rigor.

## What this changes for Rawhide Belt / Rawhide Mask specifically

These two now have data at nine skill values, all consistent with one fixed underlying skill
tier T:

```
skill 1-4:   Red        (T well above 4)
skill 5:     Orange     (one tier easier than skill 1-4 — the skill 4→5 boundary)
skill 22-24: Dark Blue
skill 25-29: Light Blue (boundary between skill 24 and 25)
skill 30-33: Green      (boundary between skill 29 and 30 — confirmed 30, 31, 33)
skill 56:    Green
```

Belt and Mask land on the exact same color at every single one of these observations, which
is itself a data point — it suggests both recipes share the same (or a very close) tier
requirement, not just a similar-shaped curve. Every boundary seen so far (4→5, 24→25, 29→30)
falls on a multiple of 5, consistent with the fixed-5-point-tier model above.

That still brackets both recipes' real skill requirement to somewhere between 6 and 21
(this part doesn't depend on White at all, just the harder/easier relative ordering) — no
tighter guess than that without more data.

## What this changes for Rawhide Boots / Rawhide Saddlebag specifically

```
Rawhide Boots:      23-24 Yellow, 25-29 White, 30-34 Dark Blue, 35-39 Light Blue
Rawhide Saddlebag:  23-24 Red,    25-29 Yellow, 30-34 White,     35-39 Dark Blue, 40 Light Blue
```

Saddlebag sits exactly one tier harder than Boots at every single skill value observed —
strong evidence the two recipes' requirements are a fixed distance apart, not independently
wandering. The earlier "skill-22-era card" Orange reading for Saddlebag (see the old table
row below) doesn't fit this clean sequence and should be treated as a stale/mislabeled data
point rather than folded into the estimate.

## What this changes for Enchanted Rawhide Canvas / Rawhide Cap / Rawhide Shoulderpads

These three also track each other exactly, one tier easier than Saddlebag at every skill
value seen: 28-29 Orange, 30-34 Yellow, 35-39 White, 40 Dark Blue. Combined with Boots
(one tier easier again) and Saddlebag, that's now **four recipes in lockstep**, each sitting
exactly one tier apart from the next — strong evidence for a shared, evenly-spaced family of
requirements rather than coincidence.

## Estimates (Leatherworking, as of skill 56 recapture, 2026-07-03 — sharpened 2026-07-04)

| Recipe | Data points | Estimated skill | Confidence |
|---|---|---|---|
| Rawhide Cloak | White (5) | somewhere near 5 | Low (was "exact 5", retracted 2026-07-04) |
| Rawhide Gloves | White (5) | somewhere near 5 | Low (was "exact 5", retracted 2026-07-04) |
| Enchanted Rawhide Leggings | Red (33, 39, 40), White (56) | between 41 and 55 | Low-Medium (was "exact 56", retracted 2026-07-04) |
| Rawhide Tunic | White (56) | somewhere near 56 | Low (was "exact 56", retracted 2026-07-04) |
| Rawhide Canvas | Light Blue (1-4), Green (5, 22, 56) | under ~5 | Low |
| Rawhide Strap | Light Blue (1-4), Green (5, 22, 56) | under ~5 | Low |
| Rawhide Bracelet | Dark Blue (1-4), Light Blue (5), Green (22, 56) | under ~5, above Canvas/Strap | Low |
| Rawhide Gorget | Dark Blue (1-4), Light Blue (5), Green (22, 56) | under ~5, above Canvas/Strap | Low |
| Rawhide Belt | Red (1-4), Orange (5), Dark Blue (22-24), Light Blue (25-29), Green (30, 31, 33, 56) | between 6 and 21 | Medium (relative-ordering bound, doesn't depend on White) |
| Rawhide Mask | Red (1-4), Orange (5), Dark Blue (22-24), Light Blue (25-29), Green (30, 31, 33, 56) | between 6 and 21 | Medium (relative-ordering bound, doesn't depend on White) |
| Enchanted Rawhide Cap | Red (32-39), Orange (40), Dark Blue (56) | between 41 and 55 | Medium |
| Rawhide Backpack | Red (33, 39), Orange (40), Dark Blue (56) | between 41 and 55 | Medium |
| Rawhide Leggings | Red (30-34), Orange (35-39), Yellow (40), Light Blue (56) | between 41 and 55 | Medium |
| Enchanted Rawhide Canvas | Orange (28-29), Yellow (30-34), White (35-39), Dark Blue (40), Green (56) | between 41 and 55 | Medium-High (five data points, all on 5-point boundaries) |
| Rawhide Cap | Orange (28-29), Yellow (30-34), White (35-39), Dark Blue (40), Green (56) | between 41 and 55 | Medium-High |
| Rawhide Saddle | Orange (30-34), Yellow (35-39), White (40), Green (56) | between 41 and 55 | Medium |
| Rawhide Saddlebag | Yellow (25-29), White (30-34), Dark Blue (35-39), Light Blue (40), Green (56) | between 41 and 55 | Medium-High |
| Rawhide Shoulderpads | Orange (28-29), Yellow (30-34), White (35-39), Dark Blue (40), Green (56) | between 41 and 55 | Medium-High |
| Rawhide Boots | Yellow (23-24), White (25-29), Dark Blue (30-34), Light Blue (35-39, no skill-40 card yet), Green (56) | between 36 and 55 | Medium |
| Rawhide Tunic | Red (33, 40), White (56) | between 41 and 55 | Low-Medium |
| Enchanted Rawhide Tunic | Red (33, 40), Yellow (56) | between 41 and 55 | Low-Medium |
| Hide Canvas | Red (33, 40), Orange (56) | between 41 and 55 | Low-Medium |
| Hide Strap | Red (33, 40), Orange (56) | between 41 and 55 | Low-Medium |
| Hide Bracelet | Red (40, 56) | well above 56 | Very low, floor only |
| Hide Gorget | Red (40, 56) | well above 56 | Very low, floor only |
| Hide Cloak | Red (56) | well above 56 | Very low, floor only |
| Hide Gloves | Red (56) | well above 56 | Very low, floor only |
| Hide Belt | Red (56) | well above 56 | Very low, floor only |
| Hide Mask | Red (56) | well above 56 | Very low, floor only |

Two same-day 2026-07-04 recaptures — skill 28 through 35, then skill 39 and 40 — are what
sharpened most of the rows above — see "Band width looks fixed at 5 skill points" above for
the full skill-by-skill breakdown and why every boundary in both batches fell on a multiple
of 5.

## Estimates (Tailoring, as of skill 5 capture, 2026-07-03)

Only one data point per recipe so far (all from the same skill-5 snapshot), so these are
much softer than the Leatherworking table above.

| Recipe | Color (skill 5) | Estimated skill | Confidence |
|---|---|---|---|
| Fine Cloth Cape | White | somewhere near 5 | Low (was "exact 5", retracted 2026-07-04) |
| Fine Cloth Gloves | White | somewhere near 5 | Low (was "exact 5", retracted 2026-07-04) |
| Bolt of Cloth | Green | under 5 | Low |
| Cloth Padding | Green | under 5 | Low |
| Bat Fur Braid | Light Blue | under 5 | Low |
| Fine Cloth Bracer | Light Blue | under 5 | Low |
| Fine Cloth Gorget | Light Blue | under 5 | Low |
| Cloth Pouch | Yellow | above 5 | Low |
| Fine Cloth Belt | Orange | above 5, no upper bound yet | Very low |
| Fine Cloth Veil | Orange | above 5 | Very low |
| Cloth Satchel | Red | well above 5 | Very low, floor only |
| Fine Cloth Boots | Red | well above 5 | Very low, floor only |
| Enchanted Bolt of Cloth | Red | well above 5 | Very low, floor only |
| Fine Cloth Cap | Red | well above 5 | Very low, floor only |
| Fine Cloth Mantle | Red | well above 5 | Very low, floor only |

## What would sharpen this

Since White no longer pins anything down exactly, the single most useful thing to log going
forward is the same recipe recaptured across a wide spread of skill values, watching for
exactly when/where it changes color — that's the only way left to bound a recipe's real
skill requirement without leaning on an assumption that's already broken once. Recapturing
a tradeskill's crafting window as skill climbs, especially right when a recipe visibly
flips color, remains the best source of new data; update this file rather than guessing
further without it.

## Tanning (2026-07-06) — from an external reference table, not an in-game screenshot

Tanning has no crafting-window entries at all (see CLAUDE.md — it's vat processing, not a
recipe list), so there's no `difficultyColor`/`observedAtSkill` pair to record for any of
the 9 pelt→scrap conversions added to `crafting.json`. The only numbers available came from
a screenshot of what looks like a fan-wiki table (sortable-column styling, hyperlinked item
names) rather than the live game, giving a "Trivial" skill number directly instead of a
color.

**Update 2026-07-07:** the user confirmed "Trivial" *is* `recipeSkillLevel` by definition
(the skill at which a recipe stops giving skill-ups), not a guess derived from it — see
CLAUDE.md. The two exact values below are now written into `crafting.json` directly:

| Result | Component | Trivial (per external table) |
|---|---|---|
| Rawhide Scraps | Low-Quality Jackal/Wolf/Bear Pelt | 25 (now `recipeSkillLevel: 25`) |
| Hide Scraps | Medium-Quality Jackal/Wolf/Bear Pelt | 50 (now `recipeSkillLevel: 50`) |
| Leather Scraps | High-Quality Jackal/Wolf/Bear Pelt | >50 (still unset — not an exact number) |

## Leatherworking — component/trivial reference tables (2026-07-06, promoted 2026-07-07)

A batch of screenshots that look like the same fan-wiki table style as the Tanning one above
(sortable columns, hyperlinked item names, "Crafting Bench"/"Scrapping" columns) gave full
`components` for many Leatherworking recipes that previously had none — those component lists
were merged into `crafting.json` directly since they're structural/timeless data (same
reasoning as always: components don't go stale the way a skill-gated color does), without
touching any existing `difficultyColor`/`observedAtSkill` that came from an actual crafting-
window capture.

**Update 2026-07-07:** every exact number below (i.e. everything except the `90+`/`120+`
floor-only rows) has since been written into `crafting.json`'s `recipeSkillLevel` directly —
see CLAUDE.md's 2026-07-07 clarification that "Trivial" *is* `recipeSkillLevel`, confirmed by
the user, not a guess derived from it. This table stays here as the record of where those
numbers came from:

| Recipe | Trivial (external table) |
|---|---|
| Rawhide Bracelet | 10 |
| Rawhide Gorget | 10 |
| Rawhide Cloak | 20 |
| Rawhide Gloves | 20 |
| Rawhide Belt | 30 |
| Rawhide Mask | 30 |
| Rawhide Boots | 40 |
| Rawhide Cap | 50 |
| Rawhide Shoulderpads | 50 |
| Rawhide Leggings | 70 |
| Enchanted Rawhide Cap | 70 |
| Enchanted Rawhide Leggings | 70 |
| Rawhide Tunic | 70 |
| Enchanted Rawhide Tunic | 75 |
| Rawhide Canvas | 5 |
| Rawhide Strap | 5 |
| Enchanted Rawhide Canvas | 55 |
| Hide Canvas | 80 |
| Hide Strap | 80 |
| Hide Bracelet | 85 |
| Hide Gorget | 85 |
| Hide Cloak | 95 |
| Hide Gloves | 95 |
| Hide Belt | 90+ (exact unknown) |
| Hide Mask | 90+ (exact unknown) |
| Hide Boots | 90+ (exact unknown) |
| Enchanted Hide Cap | 120+ (exact unknown) |
| Rawhide Saddlebag | 45 |
| Rawhide Backpack | 65 |
| Rawhide Saddle | 60 |
| Patched Rawhide/Patched Hide (all 22 repair recipes) | 10 |

Every other recipe added in this batch (Leather tier, Padded Leather tier, the remaining Hide
tier armor pieces, all the saddles/saddlebags beyond Rawhide) had its Trivial column shown as
"?" in the source table — genuinely unknown, not just omitted here.

One source inconsistency worth flagging: the Patched Rawhide Armor table had a row with
Item="Patched Rawhide Cloak" / component "Tattered Rawhide Cloak" but Result column showing
"Patched Rawhide Gorget" — almost certainly a copy-paste error in the source, since a separate,
properly-formed "Patched Rawhide Gorget" row already exists elsewhere in the same table with its
own correct Tattered Rawhide Gorget input. Recorded in `crafting.json` as "Patched Rawhide
Cloak" (trusting the Item column and its own input material over the one mismatched Result
cell) — flag to the user if this turns out to be wrong.

## Alchemy, Carpentry, Cooking, Disenchanting, Smelting (2026-07-07)

Same fan-wiki-style tables as Tanning/Leatherworking/Blacksmithing populated these five
tradeskills (Smelting already had 6 recipes from an earlier in-game capture; only their
missing `components` were filled in, same non-destructive rule as always). All exact Trivial
values went straight into `recipeSkillLevel`; unknown ("?") ones were left unset.

One more source inconsistency, same shape as the Patched Rawhide Cloak/Gorget mix-up above:
the Cauldron combines table's "Lesser Serum of Agility" row has description text about
Agility, and its own Item/Result name says "Agility," but the in-parentheses effect text
reads "Lesser Serum of Intelligence (On Click. Any Slot. Cast Time: 5s, Level: 1)" — almost
certainly a copy-paste error from the adjacent Intelligence row. Recorded in `crafting.json`
exactly as shown (both the correct name and the mismatched effect text) rather than silently
"fixing" the effect text — flag to the user if this turns out to matter.

Two gathering skills from the same batch — **Fishing** (a skill chart: fish species, skill
required, location, rarity, bait) and **Mining** (a skill chart: ore veins, skill range,
location) — were deliberately left out of `crafting.json` entirely. Neither is a "combine
components into a result" recipe the way every other tradeskill on this site is; they're
skill-gated gathering actions with no components to list. Their raw materials (fish species,
ore veins) also have no known weight/size, so no items.json entries were created for them
either — Cooking recipes that reference a raw fish (e.g. "Raw Whitefish") just render as
plain, unlinked text until a real item card for that fish comes in, same as any other
not-yet-added component.
