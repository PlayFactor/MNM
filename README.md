# Your Game Wiki — Setup Guide (No Coding Needed)

This is a website. All the files in this folder together make up that website. You don't
need to "build" or "compile" anything — you just need to put these files somewhere online,
and it works.

---

## Part 1: Put the website online (one-time setup, ~10 minutes)

You said you already have a GitHub account, so we'll use **GitHub Pages** — free hosting
that's built into GitHub.

1. Go to github.com and click the **+** icon (top right) → **New repository**.
2. Name it something like `my-game-wiki`. Set it to **Public**. Don't check any of the
   "initialize with..." boxes. Click **Create repository**.
3. On the next page, click the link that says **uploading an existing file**.
4. Drag this entire `wiki-starter` folder's *contents* (not the folder itself — the files
   and subfolders inside it: `index.html`, `style.css`, `script.js`, `pages.json`, the
   `pages` folder, and the `images` folder) into the upload box.
5. Scroll down, click **Commit changes**.
6. Go to the repository's **Settings** tab → **Pages** (in the left sidebar).
7. Under "Build and deployment", set **Source** to "Deploy from a branch", set **Branch**
   to `main` and folder to `/ (root)`, then click **Save**.
8. Wait about a minute, then refresh that page. GitHub will show you a link like
   `https://yourusername.github.io/my-game-wiki/` — that's your live wiki. Share that link
   with other players.

That's it. You will not need to repeat this setup — from now on, any time you update the
files in this repository, the live website updates automatically within a minute or two.

---

## Part 2: How you'll update it going forward

Every wiki page is just a plain text file written in **Markdown** (a very simple text
format — `# ` for a heading, `**bold**` for bold, etc). You will not write this yourself.
Here's the intended workflow:

1. Install **Claude Code** (the desktop app) and open it in this project folder.
2. Give it your notes and/or a screenshot: *"Add a page about the Frost Wraith boss —
   here's a screenshot of its arena and some notes on its attacks."*
3. Claude Code will:
   - Save your screenshot into the `images` folder
   - Write a new `.md` file into the `pages` folder
   - Add one line for it in `pages.json` so it shows up in the menu
4. You review what changed, then push it to GitHub (Claude Code can talk you through this
   part the first couple of times, or do it for you if you connect your GitHub account).
5. The live site updates itself automatically.

You never need to touch `index.html`, `style.css`, or `script.js` — those just make the
site work and display your pages. The only two things you (or Claude) ever need to edit
are `pages.json` (the page list) and the individual `.md` files in `pages/`.

---

## A few things worth knowing

- **No database, no login system** — this keeps it free and simple. Anyone with the link
  can read the wiki; nobody can edit it directly on the website itself. Updates only
  happen the way described above.
- **Screenshots**: just image files (`.png` or `.jpg`) dropped into the `images` folder,
  referenced from a page like `![description](images/filename.png)`.
- **Changing the color scheme**: open `style.css` and change the `--accent` value near the
  top of the file to any hex color code — everything themed off it will update.
- **If you ever want other players to submit info directly** (instead of you collecting
  it), the simplest add-on is a Google Form or a GitHub "Issues" template that feeds into
  your update workflow — not something this starter site needs to include from day one.

---

## Part 3: The Item Database page

Unlike normal pages, the **Item Database** isn't a `.md` file — it's a searchable,
filterable, sortable table built from `items.json` (in the project root). You'll still
never need to touch `index.html`, `style.css`, or `script.js` to use it.

To add a new item, add an object for it to `items.json` — copy an existing entry as a
template and change the values. Weapons use `damage` / `delay` (the site calculates the
damage-to-delay ratio automatically); armor and jewelry use `ac` and `stats` instead. Still
save the screenshot into `images/items/` like before — the site draws its own clean card
from the data instead of showing the picture, but the screenshot is kept on file so the
data can always be double-checked against the original card later.

The search box, and the type/slot/class filters on the page, are all built automatically
from whatever is in `items.json` — you don't need to update anything else when you add an
item or a new class. Hovering an item's name on the page shows its full card (stats,
classes, race, and so on) — an original design built from the data, not a picture of the
in-game popup.

---

## Part 4: The Crafting page

The **Crafting** page shows every tradeskill (Alchemy, Blacksmithing, Cooking, etc. — the
full list lives in `tradeskills.json`) as a grid of clickable categories. Tradeskills that
aren't in the game yet show a "Planned" badge instead of a recipe list. Clicking a category
shows its recipes, which come from `crafting.json`, the same way items come from
`items.json`.

To add a new recipe: add an object to `crafting.json` naming the tradeskill it belongs to,
and save its screenshot into `images/crafting/` — same idea as items above. Recipe cards
look like item cards but in a different color (teal instead of gold) so the two are never
confused, with the tradeskill name shown where an item card would show its tags.
