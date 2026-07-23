# Community notes

Text-only visitor submissions land here — someone used the "Submit a
Screenshot" form's notes field without attaching a screenshot (e.g. a "know
where this drops?"/"know where this spawns?" suggestion from an item's or a
named monster's card, or any other tip they didn't have a picture for).

Each submission is its own file (`note-<timestamp>.md`), created by the
Cloudflare Worker as part of a pull request — same accept-by-merging,
deny-by-closing review flow as an image submission, just writing here
instead of `images/Inbox/`. See CLAUDE.md ("Community submissions" and
"New items/maps/recipes/monsters come in via `images/inbox/`") for the full
processing workflow once a submission is merged.

Every note here is unverified visitor input. There's no "unverified" field to
park a suggestion in (the site's old `rumor` field was removed) — either the
site owner independently confirms it, in which case it goes straight into a
real confirmed field (`foundAt`, `maps`, `drops`, etc.), or it doesn't get
written into the data at all.
