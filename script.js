/* ============================================
   You should not need to edit this file.
   To add pages, edit pages.json and drop a .md
   file in the /pages folder. See README.md.
   ============================================ */

let allPages = [];
let itemsData = null; // cached contents of items.json
let mapsData = null; // cached contents of maps.json, loaded on first visit to the Maps page
let craftingData = null; // cached contents of crafting.json
let tradeskillsData = null; // cached contents of tradeskills.json
let gatheringData = null; // cached contents of gathering-nodes.json
let gemstonesData = null; // cached contents of gemstones.json
let monstersData = null; // cached contents of monsters.json
let companionsData = null; // cached contents of companions.json
let companionSkillsData = null; // cached contents of companion-skills.json

// Set by the header search box when jumping straight to a specific item or
// crafting recipe, then consumed (and cleared) by the corresponding render
// function so the user lands directly on what they searched for.
let pendingItemQuery = null;
let pendingCraftingTradeskill = null;
// Same idea as pendingCraftingTradeskill, but for the separate Gathering
// page (gathering tradeskills split out from Crafting on 2026-07-13).
let pendingGatheringTradeskill = null;
// Set by renderItemsList's own "Type" filter dropdown (2026-07-19 — the
// Item Database used to open on a separate category grid of clickable
// cards; the user asked to drop that in favor of just filtering, so Type is
// now one more dropdown in the same toolbar as Slot/Class/Race/etc.) right
// before it re-renders itself scoped to the newly-picked type, so the
// other filters the user had already set carry over instead of resetting.
// Consumed by renderItemsList the same way pendingItemQuery is.
let pendingItemFilters = null;
// Set alongside pendingItemQuery (by goToItem) so the Item Database opens
// directly on that item's own type instead of "All Types".
let pendingItemCategory = null;
// Set when jumping to an item from a recipe's component list, so the Item
// Database can show a "back to that recipe" link. Same consume-once pattern.
let pendingReturnToRecipe = null;
// Same idea as pendingReturnToRecipe, but for jumping to an item from a
// monster's drop table instead of a recipe's component list.
let pendingReturnToMonster = null;
// Set by the header search box (or the Monsters page's own quick search) when
// jumping straight to a specific monster, then consumed by renderMonstersPage
// so its search box is pre-filled — same pattern as pendingItemQuery.
let pendingMonsterQuery = null;
// Set by goToRecipe so the recipe just navigated to (e.g. via an item's
// "Crafted via"/"Used to craft" links) flashes once its card renders, making
// it easy to spot among the rest of that tradeskill's recipe grid.
let pendingHighlightRecipe = null;
// Same idea as pendingHighlightRecipe, but for a specific item's row in the
// Item Database table — set by goToItem so a search-result click flashes the
// row once it renders, instead of just silently scrolling the page.
let pendingHighlightItem = null;
// Same idea again, for a monster's row on the Monsters page — set by
// goToMonster so a header/quick-search result flashes the right row.
let pendingHighlightMonster = null;
// Same idea again, for a companion's card on the Companions page — set by
// goToCompanion so a header search result flashes the right card.
let pendingHighlightCompanion = null;
// Set by renderCraftingRecipes when it scrolls to a highlighted recipe, so
// loadPage's normal "reset scroll to top on navigation" doesn't immediately
// cancel that scroll.
let suppressScrollReset = false;
// Set by goToSubmit (from an item/monster card's "suggest" link) so the
// Submit page can show a "Regarding: <name>" banner and fold it into the
// submitted notes — consumed (and cleared) by renderSubmitPage the same
// consume-once pattern as pendingItemQuery.
let pendingSubmitContext = null;
// Set by goToMap (e.g. a monster search result's clickable zone link) so the
// Maps page opens straight into that area's viewer instead of just the grid
// — consumed (and cleared) by renderMapsPage, same consume-once pattern as
// pendingItemQuery.
let pendingMapOpen = null;

async function ensureItemsData() {
  if (!itemsData) {
    const res = await fetch('items.json');
    if (!res.ok) throw new Error('Could not load items.json');
    itemsData = await res.json();
  }
  return itemsData;
}

async function ensureCraftingData() {
  if (!tradeskillsData) {
    const res = await fetch('tradeskills.json');
    if (!res.ok) throw new Error('Could not load tradeskills.json');
    tradeskillsData = await res.json();
  }
  if (!craftingData) {
    const res = await fetch('crafting.json');
    if (!res.ok) throw new Error('Could not load crafting.json');
    craftingData = await res.json();
  }
  if (!gatheringData) {
    const res = await fetch('gathering-nodes.json');
    if (!res.ok) throw new Error('Could not load gathering-nodes.json');
    gatheringData = await res.json();
  }
  return craftingData;
}

async function ensureGemstonesData() {
  if (!gemstonesData) {
    const res = await fetch('gemstones.json');
    if (!res.ok) throw new Error('Could not load gemstones.json');
    gemstonesData = await res.json();
  }
  return gemstonesData;
}

async function ensureMonstersData() {
  if (!monstersData) {
    const res = await fetch('monsters.json');
    if (!res.ok) throw new Error('Could not load monsters.json');
    monstersData = await res.json();
  }
  return monstersData;
}

async function ensureCompanionsData() {
  if (!companionSkillsData) {
    const res = await fetch('companion-skills.json');
    if (!res.ok) throw new Error('Could not load companion-skills.json');
    companionSkillsData = await res.json();
  }
  if (!companionsData) {
    const res = await fetch('companions.json');
    if (!res.ok) throw new Error('Could not load companions.json');
    companionsData = await res.json();
  }
  return companionsData;
}

async function ensureMapsData() {
  if (!mapsData) {
    const res = await fetch('maps.json');
    if (!res.ok) throw new Error('Could not load maps.json');
    mapsData = await res.json();
  }
  return mapsData;
}

// Splash screen shown on every fresh load (see #splash-screen in
// index.html) — clicking Enter adds .site-entered to <body>, which both
// fades the splash out and slides the sidebar in (both driven from that one
// class, see style.css). Intentionally shows every time rather than
// remembering "already entered" in sessionStorage/localStorage — it's meant
// to be a recurring welcome, not a one-time onboarding step.
function setupSplashScreen() {
  const btn = document.getElementById('splash-enter-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    document.body.classList.add('site-entered');
  });
}

// Keeps the sticky sidebar's own height capped to whatever room is actually
// available — viewport height minus its own `top` offset (76px, must match
// style.css) minus the footer's real rendered height minus a small safety
// margin — rather than the flat calc() in style.css, which only knew about
// `top` and couldn't account for the footer sitting below .layout. See the
// long comment on .sidebar in style.css for the full "why": on a short page
// the flat calc() left the sidebar taller than the room actually left once
// the footer's own height is subtracted, so it could end up scrolled
// entirely above the viewport once you reached the bottom of the page. Runs
// on load and on resize, since both the viewport and (rarely) the footer's
// own wrapped height can change. No-ops on mobile (matches the CSS
// breakpoint) and clears any inline value there instead of setting one, so
// it doesn't fight the mobile rule's own `max-height: none`.
function updateSidebarMaxHeight() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  if (window.innerWidth <= 900) {
    sidebar.style.maxHeight = '';
    return;
  }
  const footer = document.querySelector('.site-footer');
  const footerHeight = footer ? footer.getBoundingClientRect().height : 0;
  const topOffset = 76;
  const safetyMargin = 20;
  const maxHeight = window.innerHeight - topOffset - footerHeight - safetyMargin;
  sidebar.style.maxHeight = Math.max(200, maxHeight) + 'px';
}

async function init() {
  setupSplashScreen();

  const res = await fetch('pages.json');
  allPages = await res.json();
  buildSidebar(allPages);
  updateSidebarMaxHeight();
  window.addEventListener('resize', updateSidebarMaxHeight);

  // Load a page based on the URL (e.g. index.html#stone-golem), or the first
  // page by default. The Named/Regular Monsters pages use a sub-route within
  // their own hash (e.g. #monsters-named/Vale%20of%20Zintar — see goToMonster)
  // to make the browser Back button pop from a zone list to that page's own
  // category grid instead of leaving the page entirely, so the page lookup
  // only matches on the part before the first "/", while the full hash (with
  // sub-route) is what actually gets loaded.
  const requested = location.hash.replace('#', '');
  const requestedBase = requested.split('/')[0];
  const matchedPage = allPages.find(p => p.file === requestedBase);
  const startPage = matchedPage || allPages[0];
  if (startPage) loadPage(matchedPage ? requested : startPage.file);

  // Pre-fetch item/crafting/monster/companion data in the background so the
  // header search box can search them right away, without waiting for the
  // user to first visit the Item Database, Crafting, Monsters, or Companions
  // page.
  ensureItemsData().catch(() => {});
  ensureCraftingData().catch(() => {});
  ensureMonstersData().catch(() => {});
  ensureCompanionsData().catch(() => {});

  const searchBox = document.getElementById('search-box');
  searchBox.addEventListener('input', onSearch);
  searchBox.addEventListener('focus', () => {
    if (searchBox.value.trim()) openSearchResults();
  });
  window.addEventListener('hashchange', () => {
    const file = location.hash.replace('#', '');
    const page = allPages.find(p => p.file === file.split('/')[0]);
    if (page) loadPage(file);
  });

  // A single delegated handler for every "Clear" button next to a search
  // field on the site (header search, quick-search boxes, per-category/
  // tradeskill search fields) — each button just carries
  // data-clear-target="<input id>", so a new search bar gets working Clear
  // behavior for free just by adding the button markup, no per-page JS
  // wiring needed. Dispatching a real 'input' event re-runs whatever filter
  // logic is already listening on that field.
  document.addEventListener('click', e => {
    const btn = e.target.closest('.search-clear-btn');
    if (!btn) return;
    const input = document.getElementById(btn.dataset.clearTarget);
    if (!input) return;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  });

  // Clicking anywhere outside the search box/dropdown closes the dropdown.
  document.addEventListener('click', e => {
    if (!e.target.closest('.header-search')) closeSearchResults();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearchResults();
  });

  document.getElementById('site-title').addEventListener('click', e => {
    e.preventDefault();
    if (!allPages[0]) return;
    clearSearch();
    const alreadyHome = location.hash.replace('#', '') === allPages[0].file;
    location.hash = allPages[0].file;
    if (alreadyHome) loadPage(allPages[0].file);
  });
}

function buildSidebar(pages) {
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = '';

  if (pages.length === 0) {
    sidebar.innerHTML = '<p class="sidebar-empty">No pages yet.</p>';
    return;
  }

  // Most pages render as one flat, uniformly-styled list (see the
  // 2026-07-14 note this replaced: splitting every page into its own
  // per-category heading looked arbitrary once every category held exactly
  // one page). A page can opt into a `group` (pages.json) — e.g.
  // "Tradeskilling" for Gathering and Crafting —
  // which nests it under a plain, non-clickable group heading instead,
  // indented, so real hierarchy can still show up without reintroducing a
  // heading over every single page. Consecutive pages sharing the same
  // `group` render under one shared heading; a page with no `group` renders
  // exactly as before.
  let currentGroup = null;
  let groupContainer = null;

  for (const page of pages) {
    if (page.group) {
      if (page.group !== currentGroup) {
        currentGroup = page.group;
        const heading = document.createElement('div');
        heading.className = 'sidebar-group-heading';
        heading.textContent = page.group;
        sidebar.appendChild(heading);
        groupContainer = document.createElement('div');
        groupContainer.className = 'sidebar-group';
        sidebar.appendChild(groupContainer);
      }
    } else {
      currentGroup = null;
      groupContainer = null;
    }

    const link = document.createElement('a');
    link.href = '#' + page.file;
    link.className = 'sidebar-link' + (page.group ? ' sidebar-link-nested' : '');
    const navIcon = NAV_ICON[page.file];
    link.innerHTML = (navIcon ? svgIcon(navIcon) : '') + `<span class="sidebar-link-text">${escapeAttr(page.title)}</span>`;
    link.dataset.file = page.file;
    link.addEventListener('click', () => loadPage(page.file));
    (groupContainer || sidebar).appendChild(link);
  }

  // "Most Visited Tradeskills" — see recordVisit/updateVisitedSidebarSections. Hidden until
  // there's at least one recorded visit (id="sidebar-visits-wrapper" toggles display),
  // reusing the exact same group-heading + tree-line-nested-list markup as the
  // "Tradeskilling" group above so it looks like a natural extension of the nav rather than
  // a bolted-on widget.
  const visitsWrapper = document.createElement('div');
  visitsWrapper.id = 'sidebar-visits-wrapper';
  visitsWrapper.innerHTML = `
    <div class="sidebar-visits-title">History</div>
    <div class="sidebar-group-heading">Most Visited Tradeskills</div>
    <div class="sidebar-group" id="sidebar-most-visited"></div>
    <p class="sidebar-visits-note">Stored only in this browser — not saved anywhere else.</p>
  `;
  sidebar.appendChild(visitsWrapper);
  updateVisitedSidebarSections();

  // "Recently Updated" — its own separate box below "History" (same bordered-
  // box visual treatment, own title), not nested inside it: History is the
  // visitor's own browsing activity (localStorage-only, per-browser), while
  // this is site-wide content freshness that's the same for every visitor —
  // conceptually a different thing sharing a similar look, not a sub-section
  // of History. Starts hidden (inline style) so there's no flash of an empty
  // box while items/monsters/crafting/companions data loads in the
  // background — updateRecentlyUpdatedSidebar unhides it once it actually
  // has entries to show.
  const recentWrapper = document.createElement('div');
  recentWrapper.id = 'sidebar-recent-wrapper';
  recentWrapper.style.display = 'none';
  recentWrapper.innerHTML = `
    <div class="sidebar-visits-title">Recently Updated</div>
    <div class="sidebar-group" id="sidebar-recent-list"></div>
  `;
  sidebar.appendChild(recentWrapper);
  updateRecentlyUpdatedSidebar();
}

// Combines items/monsters/crafting recipes/companions into one newest-first
// list via each entry's `lastUpdated` field (see CLAUDE.md) — a site-wide
// "what's new" list, distinct from the History box's per-browser visit
// tracking above. Entries added before `lastUpdated` existed simply have no
// value for it and are excluded, same graceful-omission handling as the
// per-card "Last updated" badge (formatLastUpdated). Async because the
// underlying data isn't fetched yet when buildSidebar runs (see init()) —
// reuses the exact same ensure*Data() caches the header search box already
// prefetches in the background, so this costs nothing extra once those
// resolve, and re-running it (e.g. on a later buildSidebar call) is free
// since ensure*Data() only fetches once.
async function updateRecentlyUpdatedSidebar() {
  const wrapper = document.getElementById('sidebar-recent-wrapper');
  if (!wrapper) return;

  await Promise.allSettled([
    ensureItemsData(), ensureMonstersData(), ensureCraftingData(), ensureCompanionsData()
  ]);

  const entries = [];
  (itemsData || []).forEach((item, idx) => {
    if (item.lastUpdated) entries.push({ date: item.lastUpdated, idx, title: item.name, go: () => goToItem(item) });
  });
  (monstersData || []).forEach((monster, idx) => {
    if (monster.lastUpdated) entries.push({ date: monster.lastUpdated, idx, title: monster.name, go: () => goToMonster(monster) });
  });
  (craftingData || []).forEach((recipe, idx) => {
    if (recipe.lastUpdated) entries.push({ date: recipe.lastUpdated, idx, title: recipe.name, go: () => goToRecipe(recipe) });
  });
  (companionsData || []).forEach((companion, idx) => {
    if (companion.lastUpdated) entries.push({ date: companion.lastUpdated, idx, title: companion.name, go: () => goToCompanion(companion) });
  });

  if (!entries.length) {
    wrapper.style.display = 'none';
    return;
  }

  // Same date string ("YYYY-MM-DD") sorts correctly with plain comparison;
  // ties (very common here — whole inbox batches share one date) break on
  // array position, since later entries in a data file are almost always
  // the ones added most recently within that same batch. Capped at 6 (not
  // 10) — the user found a longer list was making the sidebar tall enough to
  // need its own scrollbar (2026-07-20), which this box is specifically
  // meant to avoid (see #sidebar-recent-wrapper's max-height-free layout —
  // unlike the main .sidebar column, nothing here scrolls internally).
  const top = entries
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.idx - a.idx))
    .slice(0, 6);

  const list = document.getElementById('sidebar-recent-list');
  list.innerHTML = '';
  top.forEach(e => {
    const link = document.createElement('a');
    link.href = '#';
    link.className = 'sidebar-link sidebar-link-nested';
    link.innerHTML = `<span class="sidebar-link-text">${escapeAttr(e.title)}</span>`;
    link.addEventListener('click', ev => {
      ev.preventDefault();
      e.go();
    });
    list.appendChild(link);
  });
  wrapper.style.display = '';
}

// Visit tracking for the sidebar's "Most Visited Tradeskills" section — purely client-side
// (localStorage), no server involved, so it only ever reflects this one browser.
// Tradeskills only (2026-07-19, user's own follow-up request) — an earlier version also
// tracked every top-level page (Item Database, Maps, Monsters, etc.) under a "page" kind,
// but everyday page browsing racked up counts fast enough to crowd tradeskills out of the
// top-5 display entirely (reported by the user: visiting Herbalism a lot still never showed
// it in "Most Visited"), which defeated the point of a *tradeskill* shortlist. Tracks the
// *deepest* thing actually reached, not just the top-level Gathering/Crafting page passed
// through to get there (2026-07-17, user's own call): browsing Gathering or Crafting just to
// look at the category grid records nothing, but drilling into e.g. Mining or Alchemy records
// that tradeskill specifically.
//
// Each entry is keyed `${kind}:${id}` and stores `{kind, id, count, lastVisited}`:
//   - kind "craft": id is a tradeskill name (Alchemy, Cooking, Enchanting, ...) reached via
//     the Crafting grid — opened with goToCraftingCategory, which uses craftPageHash to know
//     which page a given tradeskill's recipes actually live on (Disenchanting routes to
//     Gathering — see craftPageHash — even though its own visit is still recorded under this
//     "craft" kind, since it still reaches renderTradeskillSection the same way every other
//     tradeskill does).
//   - kind "gathering": id is a gathering tradeskill name (Mining, Lumberjacking, Herbalism,
//     Fishing) — opened with goToGatheringCategory.
const PAGE_VISITS_KEY = 'mnmwiki-page-visits';

function getPageVisits() {
  try {
    return JSON.parse(localStorage.getItem(PAGE_VISITS_KEY) || '{}');
  } catch {
    return {};
  }
}

function recordVisit(kind, id) {
  const visits = getPageVisits();
  const key = `${kind}:${id}`;
  const existing = visits[key] || { count: 0 };
  visits[key] = { kind, id, count: existing.count + 1, lastVisited: Date.now() };
  try {
    localStorage.setItem(PAGE_VISITS_KEY, JSON.stringify(visits));
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — the feature just
    // won't persist this session; nothing else depends on it succeeding.
  }
}

// Resolves one stored visit entry to a display title and a "go there" action, per its kind —
// returns null for anything that isn't a tradeskill kind, so it can be filtered out rather
// than shown as a dead link. This also transparently drops any leftover "page"-kind entries
// still sitting in a returning visitor's localStorage from before page-tracking was removed
// (2026-07-19) — no separate migration/cleanup needed, they just stop resolving to anything.
// "craft"/"gathering" entries aren't validated against tradeskills.json — tradeskills
// essentially never get renamed/removed in this wiki's history, and a stale one would just
// land on an empty tradeskill page rather than error.
function resolveVisitEntry(v) {
  if (v.kind === 'craft') return { title: v.id, go: () => goToCraftingCategory(v.id) };
  if (v.kind === 'gathering') return { title: v.id, go: () => goToGatheringCategory(v.id) };
  return null;
}

function updateVisitedSidebarSections() {
  const wrapper = document.getElementById('sidebar-visits-wrapper');
  if (!wrapper) return;

  const entries = Object.values(getPageVisits())
    .map(v => ({ ...v, resolved: resolveVisitEntry(v) }))
    .filter(e => e.resolved);

  if (!entries.length) {
    wrapper.style.display = 'none';
    return;
  }
  wrapper.style.display = '';

  const renderInto = (container, list) => {
    container.innerHTML = '';
    list.forEach(e => {
      const link = document.createElement('a');
      link.href = '#';
      link.className = 'sidebar-link sidebar-link-nested';
      // Every entry here is a tradeskill name (kind "craft"/"gathering" only —
      // see resolveVisitEntry), so it always uses the same TRADESKILL_ICON
      // lookup the Crafting/Gathering category grids use.
      const navIcon = TRADESKILL_ICON[e.id];
      link.innerHTML = (navIcon ? svgIcon(navIcon) : '') + `<span class="sidebar-link-text">${escapeAttr(e.resolved.title)}</span>`;
      // A tradeskill entry lives inside a shared hash page (#crafting,
      // #gathering) that every tradeskill shares, so there's no single
      // baseFile that would correctly highlight just this one tradeskill's
      // link without also lighting up every other tradeskill's link at the
      // same time — left non-active rather than approximated (unlike the
      // main nav list above, whose links map 1:1 to a baseFile).
      link.addEventListener('click', ev => {
        ev.preventDefault();
        e.resolved.go();
      });
      container.appendChild(link);
    });
  };

  const most = [...entries].sort((a, b) => b.count - a.count || b.lastVisited - a.lastVisited).slice(0, 5);
  renderInto(document.getElementById('sidebar-most-visited'), most);
}

async function loadPage(file) {
  const contentInner = document.getElementById('content-inner');
  contentInner.innerHTML = '<p>Loading...</p>';
  // The Named/Regular Monsters pages' own zone sub-route (e.g.
  // "monsters-named/Vale of Zintar") lives after the first "/" — strip it for
  // the page-type lookup, but keep the full `file` around to hand to
  // renderMonstersPage below.
  const baseFile = file.split('/')[0];
  const page = allPages.find(p => p.file === baseFile);

  // Data-driven pages (Item Database, Maps, Crafting, Monsters) use the full
  // content width instead of the narrower reading width used for prose pages.
  contentInner.classList.toggle('content-wide', !!(page && (page.type === 'items' || page.type === 'maps' || page.type === 'gathering' || page.type === 'crafting' || page.type === 'monsters' || page.type === 'companions')));

  try {
    if (page && page.type === 'items') {
      await renderItemsPage(contentInner);
    } else if (page && page.type === 'maps') {
      await renderMapsPage(contentInner);
    } else if (page && page.type === 'gathering') {
      await renderGatheringPage(contentInner);
    } else if (page && page.type === 'crafting') {
      await renderCraftingPage(contentInner);
    } else if (page && page.type === 'monsters') {
      await renderMonstersPage(contentInner, file);
    } else if (page && page.type === 'companions') {
      await renderCompanionsPage(contentInner);
    } else if (page && page.type === 'submit') {
      await renderSubmitPage(contentInner);
    } else {
      const res = await fetch('pages/' + file);
      if (!res.ok) throw new Error('Page not found');
      const markdown = await res.text();
      contentInner.innerHTML = marked.parse(markdown);
    }
  } catch (err) {
    contentInner.innerHTML = '<h1>Page not found</h1><p>That page could not be loaded.</p>';
  }

  // Visits are only recorded for tradeskills now (2026-07-19) — see
  // recordVisit's own comment above — via recordVisit('craft'/'gathering',
  // ...) in renderTradeskillSection/renderGatheringNodes, not here.

  // Highlight the active link in the sidebar — the History box (Most
  // Visited) is explicitly excluded (2026-07-17, user's own call):
  // clicking an entry there just navigates, it never shows the "you're
  // here" highlight, which stays reserved for the normal nav list above it.
  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.closest('#sidebar-visits-wrapper')) {
      link.classList.remove('active');
      return;
    }
    link.classList.toggle('active', link.dataset.file === baseFile);
  });

  if (suppressScrollReset) {
    suppressScrollReset = false;
  } else {
    window.scrollTo(0, 0);
  }
}

function onSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    closeSearchResults();
    return;
  }
  renderSearchResults(query);
}

function openSearchResults() {
  document.getElementById('search-results').classList.add('open');
}

function closeSearchResults() {
  document.getElementById('search-results').classList.remove('open');
}

function clearSearch() {
  document.getElementById('search-box').value = '';
  closeSearchResults();
}

// The header search box searches across everything on the wiki — pages,
// items, and crafting recipes — not just page titles, so someone searching
// for e.g. an item or material name ends up in the right place instead of
// just seeing an empty page list. Results render into a dropdown under the
// search box (#search-results) rather than replacing the sidebar, so the
// normal page navigation stays visible/usable while searching.
function renderSearchResults(query) {
  const results = document.getElementById('search-results');
  results.innerHTML = '';

  const matchedPages = allPages.filter(p => p.title.toLowerCase().includes(query));

  // Categories (item-type categories like "Jewelry" and crafting tradeskills
  // like "Jewelcrafting") surface above individual name matches — landing on
  // the category itself is more useful than scrolling past a pile of
  // individually-named items/recipes to find it. Combined and sorted
  // alphabetically together so e.g. "Jewelcrafting" and "Jewelry" both
  // appear at the top for a "jewel" search.
  const itemTypes = itemsData ? [...new Set(itemsData.map(i => i.type))] : [];
  const matchedItemCategories = itemTypes
    .filter(type => (ITEM_TYPE_LABELS[type] || type).toLowerCase().includes(query))
    .map(type => ({ kind: 'item', type, label: ITEM_TYPE_LABELS[type] || type }));
  const matchedCraftCategories = (tradeskillsData || [])
    .filter(ts => ts.name.toLowerCase().includes(query))
    .map(ts => ({ kind: ts.category === 'gathering' ? 'gathering' : 'craft', tradeskill: ts.name, label: ts.name }));
  const matchedCategories = [...matchedItemCategories, ...matchedCraftCategories]
    .sort((a, b) => a.label.localeCompare(b.label));

  // Individual name matches sort alphabetically (rather than data-file
  // order) now that they're a secondary section below categories.
  const matchedItems = (itemsData || [])
    .filter(item => itemSearchHaystack(item).includes(query))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8);
  const matchedRecipes = (craftingData || [])
    .filter(r => `${r.name} ${r.tradeskill}`.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8);
  const matchedGatheringNodes = (gatheringData || [])
    .filter(n => `${n.name} ${n.tradeskill}`.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8);
  const matchedMonsters = (monstersData || [])
    .filter(m => monsterSearchHaystack(m).includes(query))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8);
  const matchedCompanions = (companionsData || [])
    .filter(c => companionSearchHaystack(c).includes(query))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8);

  if (!matchedCategories.length && !matchedPages.length && !matchedItems.length && !matchedRecipes.length && !matchedGatheringNodes.length && !matchedMonsters.length && !matchedCompanions.length) {
    results.innerHTML = '<p class="search-results-empty">No results found.</p>';
    openSearchResults();
    return;
  }

  function addSection(label, entries, makeLink) {
    if (!entries.length) return;
    const heading = document.createElement('div');
    heading.className = 'search-result-category';
    heading.textContent = label;
    results.appendChild(heading);
    entries.forEach(entry => results.appendChild(makeLink(entry)));
  }

  addSection('Categories', matchedCategories, category => {
    const link = document.createElement('a');
    link.href = category.kind === 'item' ? '#items'
      : category.kind === 'gathering' ? '#gathering'
      : `#${craftPageHash(category.tradeskill)}`;
    link.className = 'search-result-link';
    link.textContent = category.kind === 'item'
      ? category.label
      : `${category.label} (${category.kind === 'gathering' ? 'Gathering' : 'Crafting'})`;
    link.addEventListener('click', e => {
      e.preventDefault();
      clearSearch();
      if (category.kind === 'item') goToItemCategory(category.type);
      else if (category.kind === 'gathering') goToGatheringCategory(category.tradeskill);
      else goToCraftingCategory(category.tradeskill);
    });
    return link;
  });

  addSection('Pages', matchedPages, page => {
    const link = document.createElement('a');
    link.href = '#' + page.file;
    link.className = 'search-result-link';
    link.textContent = page.title;
    link.addEventListener('click', () => {
      clearSearch();
      loadPage(page.file);
    });
    return link;
  });

  addSection('Items', matchedItems, item => {
    const link = document.createElement('a');
    link.href = '#items';
    link.className = 'search-result-link';
    link.textContent = item.name;
    link.addEventListener('click', e => {
      e.preventDefault();
      clearSearch();
      goToItem(item);
    });
    return link;
  });

  addSection('Crafting', matchedRecipes, recipe => {
    const link = document.createElement('a');
    link.href = `#${craftPageHash(recipe.tradeskill)}`;
    link.className = 'search-result-link';
    link.textContent = `${recipe.name} (${recipe.tradeskill})`;
    link.addEventListener('click', e => {
      e.preventDefault();
      clearSearch();
      goToRecipe(recipe);
    });
    return link;
  });

  addSection('Gathering', matchedGatheringNodes, node => {
    const link = document.createElement('a');
    link.href = '#gathering';
    link.className = 'search-result-link';
    link.textContent = `${node.name} (${node.tradeskill})`;
    link.addEventListener('click', e => {
      e.preventDefault();
      clearSearch();
      goToGatheringCategory(node.tradeskill);
    });
    return link;
  });

  addSection('Monsters', matchedMonsters, monster => {
    const link = document.createElement('a');
    link.href = '#' + (monster.named ? 'monsters-named' : 'monsters-regular');
    link.className = 'search-result-link';
    link.textContent = monster.name;
    link.addEventListener('click', e => {
      e.preventDefault();
      clearSearch();
      goToMonster(monster);
    });
    return link;
  });

  addSection('Companions', matchedCompanions, companion => {
    const link = document.createElement('a');
    link.href = '#companions';
    link.className = 'search-result-link';
    link.textContent = companion.name;
    link.addEventListener('click', e => {
      e.preventDefault();
      clearSearch();
      goToCompanion(companion);
    });
    return link;
  });

  openSearchResults();
}

// `returnTo` is either a recipe object (from a recipe's own component list —
// the existing case) or `{ kind: 'monster', name, slug }` (from a monster's
// drop table) — distinguished by the `kind` tag so the two "back to X" links
// on the Item Database don't collide. Recipe callers predate the `kind` tag
// and don't set it, so the absence of `kind` still means "recipe".
function goToItem(item, returnTo) {
  pendingItemQuery = item.name;
  pendingItemCategory = item.type;
  pendingHighlightItem = item.slug;
  if (returnTo && returnTo.kind === 'monster') {
    pendingReturnToRecipe = null;
    pendingReturnToMonster = returnTo;
  } else {
    pendingReturnToRecipe = returnTo || null;
    pendingReturnToMonster = null;
  }
  const alreadyThere = location.hash.replace('#', '') === 'items';
  location.hash = 'items';
  if (alreadyThere) loadPage('items');
}

// Jumps straight to a whole item-type category's list (e.g. from a "Jewelry"
// category search result) rather than a single item — no query to pre-fill
// and nothing to flash, since the destination *is* the whole list.
function goToItemCategory(type) {
  pendingItemQuery = null;
  pendingItemCategory = type;
  pendingReturnToRecipe = null;
  pendingReturnToMonster = null;
  pendingHighlightItem = null;
  const alreadyThere = location.hash.replace('#', '') === 'items';
  location.hash = 'items';
  if (alreadyThere) loadPage('items');
}

// Every tradeskill's recipes live in crafting.json and render via
// renderTradeskillSection, but which top-level page hosts that view isn't
// always "Crafting" — Disenchanting was moved onto the Gathering page
// instead (2026-07-19, user's own call), even though it's still
// recipe-based under the hood (see renderGatheringCategories/
// renderGatheringPage). This resolves which hash a given tradeskill's
// recipes actually live at, so goToRecipe/goToCraftingCategory below don't
// need to know about that exception themselves.
function craftPageHash(tradeskillName) {
  if (tradeskillName === 'Disenchanting') return 'gathering';
  return 'crafting';
}

function goToRecipe(recipe) {
  const hash = craftPageHash(recipe.tradeskill);
  if (hash === 'crafting') pendingCraftingTradeskill = recipe.tradeskill;
  else if (hash === 'gathering') pendingGatheringTradeskill = recipe.tradeskill;
  pendingHighlightRecipe = recipe.slug;
  const alreadyThere = location.hash.replace('#', '') === hash;
  location.hash = hash;
  if (alreadyThere) loadPage(hash);
}

// Same idea as goToItemCategory but for a whole tradeskill (e.g. from a
// "Jewelcrafting" category search result) — no specific recipe to highlight.
function goToCraftingCategory(tradeskillName) {
  const hash = craftPageHash(tradeskillName);
  if (hash === 'crafting') pendingCraftingTradeskill = tradeskillName;
  else if (hash === 'gathering') pendingGatheringTradeskill = tradeskillName;
  pendingHighlightRecipe = null;
  const alreadyThere = location.hash.replace('#', '') === hash;
  location.hash = hash;
  if (alreadyThere) loadPage(hash);
}

// Same idea as goToCraftingCategory, but for the separate Gathering page.
function goToGatheringCategory(tradeskillName) {
  pendingGatheringTradeskill = tradeskillName;
  const alreadyThere = location.hash.replace('#', '') === 'gathering';
  location.hash = 'gathering';
  if (alreadyThere) loadPage('gathering');
}

// Jumps to the Named or Regular Monsters page (whichever the monster
// actually belongs to — split into two top-level pages the same way
// Gathering/Crafting are split under "Tradeskilling", 2026-07-17) and
// flashes one monster's row. Called from a header search
// result, a Monsters page's own quick search, or an item's "Back to
// <Monster>" link (see pendingReturnToMonster). Works with either a full
// monster object or the minimal `{ name, slug }` shape goToItem stores for
// the return-to case, since only those two fields are needed here.
function goToMonster(monster) {
  // The caller sometimes only has the minimal `{ name, slug }` shape (e.g.
  // an item's "Back to <Monster>" link) — look up the full record when
  // possible so the named/zone scope below is accurate.
  const full = findMonsterBySlug(monster.slug) || monster;
  pendingMonsterQuery = monster.name;
  pendingHighlightMonster = monster.slug;
  // The named/zone scope is encoded directly in the hash (see
  // renderMonstersPage) rather than a pending variable, so that landing on a
  // specific monster also creates a proper browser-history entry — pressing
  // Back then pops to that page's own zone grid instead of leaving the page.
  const targetHash = `${full.named ? 'monsters-named' : 'monsters-regular'}/${encodeURIComponent(monsterZone(full))}`;
  const alreadyThere = location.hash.replace('#', '') === targetHash;
  location.hash = targetHash;
  if (alreadyThere) loadPage(targetHash);
}

function goToCompanion(companion) {
  pendingHighlightCompanion = companion.slug;
  const alreadyThere = location.hash.replace('#', '') === 'companions';
  location.hash = 'companions';
  if (alreadyThere) loadPage('companions');
}

// Jumps to the Maps page and opens a specific area's viewer directly —
// e.g. the clickable zone name next to a monster in the Named/Regular
// Monsters quick search results (see renderMonstersCategories). `mapName` is
// matched against groupMapsByArea's base names (case-insensitive), same base
// name a monster's own `maps` entries are expected to match per CLAUDE.md.
function goToMap(mapName) {
  pendingMapOpen = mapName;
  const alreadyThere = location.hash.replace('#', '') === 'maps';
  location.hash = 'maps';
  if (alreadyThere) loadPage('maps');
}

// Jumps to the Submit page, optionally carrying "what this is about" context
// from an item's or a named monster's "Wrong or missing info?" link (context
// is { kind: 'item'|'monster', name }).
// renderSubmitPage shows this as a dismissible "Regarding: <name>" banner and
// folds it into the notes actually sent, so the Cloudflare Worker itself
// doesn't need to know anything about items/monsters at all.
function goToSubmit(context) {
  pendingSubmitContext = context || null;
  const alreadyThere = location.hash.replace('#', '') === 'submit';
  location.hash = 'submit';
  if (alreadyThere) loadPage('submit');
}

// Case-insensitive lookup used to decide whether a recipe component name
// (e.g. "Rawhide Scraps") has a matching entry in the Item Database yet —
// most raw crafting materials don't, until someone adds a card for them.
function findItemByName(name) {
  return (itemsData || []).find(i => i.name.toLowerCase() === name.toLowerCase());
}

// Reverse lookups used by the item viewer's "Crafting" section: is this item
// the result of a recipe, and/or a component in other recipes.
function findRecipeForItem(itemName) {
  return (craftingData || []).find(r => r.name.toLowerCase() === itemName.toLowerCase());
}

function findRecipesUsingItem(itemName) {
  return (craftingData || []).filter(r =>
    (r.components || []).some(c => c.item.toLowerCase() === itemName.toLowerCase())
  );
}

/* ============================================
   Item Database
   Data lives in items.json. To add a new item,
   add an object to that file — no code changes
   needed. Stats/slots/classes/types shown in the
   filter dropdowns are read straight from the data.
   ============================================ */

const ITEM_STAT_ORDER = ['STR', 'STA', 'AGI', 'DEX', 'WIS', 'INT', 'CHA', 'HP', 'MANA'];
// HOLY added 2026-07-19 — first seen on a real recipe/item card ("SV Holy: +2"),
// same "extend as new values show up" convention as every other resist.
// ELECTRIC added 2026-07-19 — first seen on an item card ("SV Electricity: +1").
const ITEM_RESIST_ORDER = ['FIRE', 'COLD', 'MAGIC', 'POISON', 'DISEASE', 'CORRUPTION', 'HOLY', 'ELECTRIC'];

// Options for the "search by buff" dropdowns (see itemHasBuff) — every stat,
// resist, and haste an item card can carry, in the same order as their own
// stat chips (statEntries below) so the dropdown list and the card read the
// same way. Prefixed by kind so a value round-trips unambiguously even
// though no stat/resist name actually collides today.
const ITEM_BUFF_OPTIONS = [
  ...ITEM_STAT_ORDER.map(s => ({ value: `stat:${s}`, label: s })),
  ...ITEM_RESIST_ORDER.map(r => ({ value: `resist:${r}`, label: `SV ${r}` })),
  { value: 'haste', label: 'Haste' },
];

// "Search by stat/buff" control (2026-07-18, redesigned from an earlier
// 3-dropdown version at the user's request) — a single toggle button that
// opens a small checkbox grid of every stat/resist/haste value, so someone
// can tick any number at once (AND logic — an item must match every one
// that's checked) to answer things like "what gives both STA and HP". Used
// by renderItemsList's own toolbar; takes an id prefix so a page with more
// than one instance of this control (none currently) wouldn't collide.
function buffDropdownHTML(idPrefix) {
  const optionsHTML = ITEM_BUFF_OPTIONS.map(o => `
          <label class="buff-filter-option"><input type="checkbox" value="${o.value}"><span>${escapeAttr(o.label)}</span></label>`).join('');
  return `
      <div class="buff-filter-dropdown" id="${idPrefix}-buffdropdown">
        <button type="button" class="buff-filter-toggle" id="${idPrefix}-buffdropdown-toggle">
          <span>Search by stat/buff</span>
          <span class="buff-filter-count" id="${idPrefix}-buffdropdown-count"></span>
          <span class="buff-filter-caret">&#9662;</span>
        </button>
        <div class="buff-filter-panel" id="${idPrefix}-buffdropdown-panel">
          <div class="buff-filter-panel-head">
            <span>Item must have all checked:</span>
            <a href="#" class="buff-filter-clear" id="${idPrefix}-buffdropdown-clear">Clear</a>
          </div>
          <div class="buff-filter-grid">${optionsHTML}</div>
        </div>
      </div>`;
}

// Closes any open buff dropdown when a click lands outside it — registered
// once (guarded) rather than per-render, since renderItemsList tears down
// and rebuilds its whole container on every visit (and every category
// switch) and a fresh document-level listener each time would just pile up.
// Uses live querySelectorAll at click time instead of a captured reference,
// so it never touches a stale/detached node from a previous render.
let buffDropdownGlobalCloseSetup = false;
function ensureBuffDropdownGlobalClose() {
  if (buffDropdownGlobalCloseSetup) return;
  buffDropdownGlobalCloseSetup = true;
  document.addEventListener('click', e => {
    document.querySelectorAll('.buff-filter-dropdown.open').forEach(d => {
      if (!d.contains(e.target)) d.classList.remove('open');
    });
  });
}

// Wires up one buffDropdownHTML(idPrefix) instance inside `container`.
// `onChange` fires live on every single tick (and on Clear) — ticking a box
// filters immediately, same as every other Item Database filter, and the
// panel only ever closes on an explicit toggle-button click or a click
// outside it (never as a side effect of a tick — see the `open` note below
// for how the one page that fully re-renders on a filter change stays
// seamless despite that).
// Returns { getSelected, setSelected, clear } for the caller's own filter
// logic (e.g. building a full filters object that also includes other,
// non-buff dropdowns).
function setupBuffDropdown(container, idPrefix, { onChange } = {}) {
  ensureBuffDropdownGlobalClose();
  const root = container.querySelector(`#${idPrefix}-buffdropdown`);
  const toggle = container.querySelector(`#${idPrefix}-buffdropdown-toggle`);
  const panel = container.querySelector(`#${idPrefix}-buffdropdown-panel`);
  const countEl = container.querySelector(`#${idPrefix}-buffdropdown-count`);
  const clearLink = container.querySelector(`#${idPrefix}-buffdropdown-clear`);
  const checkboxes = [...panel.querySelectorAll('input[type="checkbox"]')];

  function updateCount() {
    const n = checkboxes.filter(cb => cb.checked).length;
    countEl.textContent = n ? `(${n})` : '';
  }

  function openPanel() {
    root.classList.add('open');
    // Clamp the panel to stay fully inside the viewport (8px margin),
    // sliding it left of the button when a plain left-aligned panel would
    // run off the right edge, and never letting it run off the left edge
    // either — the button can sit anywhere in a wrapped toolbar, and on a
    // narrow phone viewport the panel can be nearly as wide as the screen,
    // so a simple two-way left/right flip (like setupItemTooltip's
    // flip-above-if-no-room-below) isn't enough on its own; this instead
    // computes the panel's desired left edge in viewport coordinates,
    // clamps it between the two margins, then converts back to a `left`
    // value relative to the wrapper (its positioned containing block).
    panel.style.right = 'auto';
    const rect = toggle.getBoundingClientRect();
    const margin = 8;
    const maxViewportLeft = window.innerWidth - margin - panel.offsetWidth;
    const desiredViewportLeft = Math.max(margin, Math.min(rect.left, maxViewportLeft));
    panel.style.left = (desiredViewportLeft - rect.left) + 'px';
  }

  toggle.addEventListener('click', e => {
    e.stopPropagation();
    if (root.classList.contains('open')) root.classList.remove('open');
    else openPanel();
  });
  // Ticking a checkbox (or clicking Clear) must never bubble up to the
  // document-level outside-click closer above — without this, checking a
  // box would immediately close the very panel it's inside.
  panel.addEventListener('click', e => e.stopPropagation());

  clearLink.addEventListener('click', e => {
    e.preventDefault();
    checkboxes.forEach(cb => { cb.checked = false; });
    updateCount();
    if (onChange) onChange();
  });

  checkboxes.forEach(cb => cb.addEventListener('change', () => {
    updateCount();
    if (onChange) onChange();
  }));

  return {
    getSelected: () => checkboxes.filter(cb => cb.checked).map(cb => cb.value),
    setSelected: values => {
      checkboxes.forEach(cb => { cb.checked = (values || []).includes(cb.value); });
      updateCount();
    },
    clear: () => {
      checkboxes.forEach(cb => { cb.checked = false; });
      updateCount();
    }
  };
}

/* ============================================
   Item type icons
   Shown in the item card header instead of a plain type-initial letter.
   Redrawn 2026-07-08 (twice that day) from "Monsters & Memories" icon
   reference sheets the user posted. The second sheet that day was far more
   precise than the first (exact tradeskill names, per-category badge
   colors) and the user asked to match it as closely as possible,
   superseding the first same-day pass's flat single-color approach. Each
   icon is now a colored circle background (`ICON_BG`, sampled from the
   sheet's own palette) plus a cream glyph on top (`ICON_DEFS`), assembled
   by `svgIcon()` — not copied pixel-for-pixel (the sheet's painterly
   rendering is its own asset), but shape/orientation/color matched to it.
   Melee weapons stay tilted ~45° (`<g transform="rotate(45 12 12)">`
   wrapping an upright shape), matching the sheet's dynamic diagonal poses.
   Weapon icons were also collapsed to the sheet's coarser 1H/2H ×
   Bludgeoning/Slashing/Piercing (+ Archery/Throwing) categories instead of
   a shape per weapon name — see `weaponIconKey`. Categories the sheet
   doesn't cover (jewelry, food/drink, generic crafting material) kept
   their prior shapes, just adapted to the bg+glyph structure with a
   palette-matching color. See CLAUDE.md for the full history of both
   same-day passes.
   ============================================ */
const ICON_DEFS = {
  bludgeoning1h: `<g transform="rotate(45 12 12)"><rect x="11.2" y="9" width="1.6" height="13"/><circle cx="12" cy="6" r="3.2"/><path d="M12 1 L12.9 3.2 L11.1 3.2 Z"/><path d="M17.3 6 L15.1 6.9 L15.1 5.1 Z"/><path d="M6.7 6 L8.9 5.1 L8.9 6.9 Z"/><path d="M14.6 2.6 L14.1 4.6 L12.7 3.1 Z"/><path d="M9.4 2.6 L11.3 3.1 L9.9 4.6 Z"/></g>`,
  bludgeoning2h: `<g transform="rotate(45 12 12)"><rect x="11.1" y="9" width="1.8" height="13"/><rect x="4.8" y="3" width="14.4" height="6.5" rx="1.2"/></g>`,
  slashing1h: `<g transform="rotate(45 12 12)"><path d="M12 1.5 L13 4.5 L12.5 15 L11.5 15 L11 4.5 Z"/><rect x="8.3" y="15" width="7.4" height="1.5"/><rect x="11" y="16.5" width="2" height="4.3"/><circle cx="12" cy="21.7" r="1.3"/></g>`,
  slashing2h: `<g transform="rotate(45 12 12)"><path d="M12 0.8 L13.4 4 L12.7 13.5 L11.3 13.5 L10.6 4 Z"/><rect x="7" y="13.5" width="10" height="1.8"/><rect x="10.8" y="15.3" width="2.4" height="5.2"/><circle cx="12" cy="21.3" r="1.4"/></g>`,
  piercing1h: `<g transform="rotate(45 12 12)"><rect x="11.3" y="8" width="1.4" height="14"/><path d="M12 2 L14 8 L10 8 Z"/><rect x="9.3" y="8.6" width="5.4" height="1"/></g>`,
  piercing2h: `<g transform="rotate(45 12 12)"><rect x="11.3" y="6" width="1.4" height="16"/><path d="M12 1 L14.3 7.5 L9.7 7.5 Z"/><rect x="8.8" y="8.1" width="6.4" height="1.1"/></g>`,
  archery: `<path d="M7 2 C1 7.5 1 16.5 7 22 C4.5 16.5 4.9 7.5 7 2 Z"/><rect x="6.6" y="2.3" width="0.6" height="19.4"/><g transform="rotate(-25 11 12)"><rect x="4" y="11.5" width="14" height="1"/><path d="M16.5 8.7 L20 7.3 L18.6 10.8 Z"/></g>`,
  ammo: `<path d="M9 20 L8 8 C7.9 6.5 8.8 5.5 10 5.5 L14 5.5 C15.2 5.5 16.1 6.5 16 8 L15 20 Z"/><rect x="7.8" y="7.5" width="8.4" height="1.3" rx="0.5"/><rect x="7.8" y="11" width="8.4" height="1.3" rx="0.5"/><path d="M10 5.5 L9.3 1 L11 2.5 Z"/><path d="M12.2 5.5 L12.8 0.5 L14.2 2.3 Z"/>`,
  throwing: `<g transform="rotate(45 12 12)"><rect x="7.4" y="4" width="1.1" height="15"/><path d="M7.95 2 L9.4 5 L6.5 5 Z"/><path d="M7.4 17.5 L6 20 L8.95 18.8 Z"/><rect x="11.45" y="2.5" width="1.1" height="17"/><path d="M12 0.5 L13.45 3.5 L10.55 3.5 Z"/><path d="M11.45 18 L10.05 20.5 L13 19.3 Z"/><rect x="15.5" y="4" width="1.1" height="15"/><path d="M16.05 2 L17.5 5 L14.6 5 Z"/><path d="M15.5 17.5 L14.1 20 L17.05 18.8 Z"/></g>`,
  shield: `<path fill-rule="evenodd" d="M12 2.2 L19 4.8 L19 11.5 C19 17 15.5 20.3 12 21.8 C8.5 20.3 5 17 5 11.5 L5 4.8 Z M11.6 5.2 L12.4 5.2 L12.4 16.3 L11.6 16.3 Z"/>`,
  plate: `<path fill-rule="evenodd" d="M7.5 7 L9.6 4.6 L12 6.6 L14.4 4.6 L16.5 7 L17.2 9 L16.2 21 L7.8 21 L6.8 9 Z M11.7 7.5 L12.3 7.5 L12.3 20.5 L11.7 20.5 Z M7.2 13.3 L16.8 13.3 L16.8 14.1 L7.2 14.1 Z"/><path d="M7.5 7 L4.3 8.7 L5.2 12.3 L7.9 10.4 Z"/><path d="M16.5 7 L19.7 8.7 L18.8 12.3 L16.1 10.4 Z"/>`,
  chain: `<path d="M7.5 7 L9.6 4.6 L12 6.6 L14.4 4.6 L16.5 7 L17.2 9 L16.2 21 L7.8 21 L6.8 9 Z"/><path d="M7.5 7 L4.3 8.7 L5.2 12.3 L7.9 10.4 Z"/><path d="M16.5 7 L19.7 8.7 L18.8 12.3 L16.1 10.4 Z"/><circle cx="9.3" cy="10.5" r="0.55"/><circle cx="12" cy="10.5" r="0.55"/><circle cx="14.7" cy="10.5" r="0.55"/><circle cx="9.3" cy="13.5" r="0.55"/><circle cx="12" cy="13.5" r="0.55"/><circle cx="14.7" cy="13.5" r="0.55"/><circle cx="9.3" cy="16.5" r="0.55"/><circle cx="12" cy="16.5" r="0.55"/><circle cx="14.7" cy="16.5" r="0.55"/><circle cx="9.3" cy="19" r="0.55"/><circle cx="12" cy="19" r="0.55"/><circle cx="14.7" cy="19" r="0.55"/>`,
  leather: `<path d="M7.5 7 L9.6 4.6 L12 6.6 L14.4 4.6 L16.5 7 L17.2 9 L16.2 21 L7.8 21 L6.8 9 Z"/><path d="M7.5 7 L4.3 8.7 L5.2 12.3 L7.9 10.4 Z"/><path d="M16.5 7 L19.7 8.7 L18.8 12.3 L16.1 10.4 Z"/>`,
  cloth: `<path d="M7.5 7 L9.6 4.6 L12 6.6 L14.4 4.6 L16.5 7 L17.5 9.5 L18.3 21.5 L5.7 21.5 L6.5 9.5 Z"/><path d="M7.5 7 L3.8 9 L4.6 16 L7.6 13.5 Z"/><path d="M16.5 7 L20.2 9 L19.4 16 L16.4 13.5 Z"/>`,
  armor: `<path d="M8.2 5 C8.6 6.8 10.1 7.6 12 7.6 C13.9 7.6 15.4 6.8 15.8 5 L17.3 9.5 L16.5 21 L7.5 21 L6.7 9.5 Z"/>`,
  ring: `<path fill-rule="evenodd" d="M6.5 15 A5.5 5.5 0 1 0 17.5 15 A5.5 5.5 0 1 0 6.5 15 Z M9 15 A3 3 0 1 1 15 15 A3 3 0 1 1 9 15 Z"/><path d="M12 5 L14.4 8.6 L12 12.2 L9.6 8.6 Z"/>`,
  earring: `<path fill-rule="evenodd" d="M10 4 A2 2 0 1 0 14 4 A2 2 0 1 0 10 4 Z M11 4 A1 1 0 1 1 13 4 A1 1 0 1 1 11 4 Z"/><path d="M12 6.5 L14.3 11 L12 15.5 L9.7 11 Z"/>`,
  necklace: `<path fill-rule="evenodd" d="M12 2 C6.5 2 4.3 6 4.3 10.2 L6.7 10.2 C6.7 6.9 8.5 4.3 12 4.3 C15.5 4.3 17.3 6.9 17.3 10.2 L19.7 10.2 C19.7 6 17.5 2 12 2 Z"/><path d="M12 12 L14.6 16.8 L12 21.5 L9.4 16.8 Z"/>`,
  food: `<path d="M12 9 C7.5 9 5.5 12 5.5 15.3 C5.5 18.7 8.3 21.5 12 21.5 C15.7 21.5 18.5 18.7 18.5 15.3 C18.5 12 16.5 9 12 9 Z"/><path d="M12 9 C12 6.3 10.6 4.8 9.1 4.1 C8.7 5.9 9.6 7.6 12 9 Z"/>`,
  drink: `<path d="M6 6 L16.5 6 L16.5 20 C16.5 21.1 15.6 22 14.5 22 L8 22 C6.9 22 6 21.1 6 20 Z"/><path fill-rule="evenodd" d="M16.5 8.5 C20.5 8.5 20.5 15.5 16.5 15.5 L16.5 13.3 C18.3 13.3 18.3 10.7 16.5 10.7 Z"/>`,
  container: `<path d="M9.3 3.5 C9.3 5.8 10.4 7.2 12 7.2 C13.6 7.2 14.7 5.8 14.7 3.5 L14.7 3 L9.3 3 Z"/><path fill-rule="evenodd" d="M7 8.5 C7 7 8.5 6 12 6 C15.5 6 17 7 17 8.5 L17.8 20.5 C17.9 21.3 17.2 22 16.4 22 L7.6 22 C6.8 22 6.1 21.3 6.2 20.5 Z M11.2 11 L10.5 11 L10.2 15 L10.7 19.3 L11.4 19.3 L11.6 15 Z M13.8 11 L13.1 11 L12.9 15 L13.1 19.3 L13.8 19.3 L14.1 15 Z"/>`,
  material: `<path d="M6 14 L9 6 L15 5 L19 11 L17 19 L8 20 Z"/>`,
  alchemy: `<path d="M10.5 2 L13.5 2 L13.5 3.2 L14.5 3.2 L14.5 4.2 L13.5 4.2 L13.5 8 L16.5 15.5 C17.3 17.6 15.8 20 13.4 20 L10.6 20 C8.2 20 6.7 17.6 7.5 15.5 L10.5 8 Z"/>`,
  blacksmithing: `<path d="M4 11 L15 11 L19.5 9 L19.5 12.5 L15 13.3 L15 15.5 L9.5 15.5 L9.5 13.3 L4 13.3 Z"/><path d="M10.5 15.5 L14.5 15.5 L15.5 21 L9.5 21 Z"/>`,
  brewing: `<path fill-rule="evenodd" d="M8 3 L16 3 L17 8 C17.5 10 17.5 14 17 16 L16 21 L8 21 L7 16 C6.5 14 6.5 10 7 8 Z M6.9 6.6 L17.1 6.6 L17.1 7.6 L6.9 7.6 Z M6.5 12.3 L17.5 12.3 L17.5 13.3 L6.5 13.3 Z M6.9 16.9 L17.1 16.9 L17.1 17.9 L6.9 17.9 Z"/>`,
  carpentry: `<g transform="rotate(45 12 12)"><path d="M5 19 L16 3 L17.6 4.4 L6.6 20.4 Z"/><rect x="3.2" y="16.9" width="4.6" height="3.4" rx="0.8" transform="rotate(45 5.5 18.6)"/></g>`,
  cooking: `<path d="M6 12 L18 12 L17.3 20 C17.2 21.1 16.3 22 15.2 22 L8.8 22 C7.7 22 6.8 21.1 6.7 20 Z"/><rect x="5" y="10.5" width="14" height="1.8" rx="0.9"/><path d="M3.5 12.5 L5.5 12.5 L5.5 15 L3.5 15 Z"/><path d="M18.5 12.5 L20.5 12.5 L20.5 15 L18.5 15 Z"/><path d="M8.5 8.3 C7.7 7.3 8 6.3 9 5.3 C8.3 6.5 9 7.3 9.5 8.1 Z"/><path d="M11.5 8.3 C10.7 7.3 11 6.3 12 5.3 C11.3 6.5 12 7.3 12.5 8.1 Z"/><path d="M14.5 8.3 C13.7 7.3 14 6.3 15 5.3 C14.3 6.5 15 7.3 15.5 8.1 Z"/>`,
  fletching: `<g transform="rotate(45 12 12)"><rect x="7.4" y="3" width="1.1" height="17"/><path d="M7.95 1 L9.4 4.5 L6.5 4.5 Z"/><path d="M7.4 18 L6 20.5 L8.95 19.3 Z"/><rect x="11.45" y="2" width="1.1" height="18"/><path d="M12 0 L13.45 3.5 L10.55 3.5 Z"/><path d="M11.45 19 L10.05 21.5 L13 20.3 Z"/><rect x="15.5" y="3" width="1.1" height="17"/><path d="M16.05 1 L17.5 4.5 L14.6 4.5 Z"/><path d="M15.5 18 L14.1 20.5 L17.05 19.3 Z"/></g>`,
  jewelcrafting: `<path fill-rule="evenodd" d="M12 2 L18.5 6.2 L18.5 14 L12 22 L5.5 14 L5.5 6.2 Z M9 7 L15 7 L15 8 L9 8 Z M11.4 8 L12.6 8 L12.6 20 L11.4 20 Z"/>`,
  leatherworking: `<path d="M12 2 C14 2 14.5 4 13.5 5 C15.5 4.5 17 6 16 8 C18 8 19 10 17.5 11.5 C19 12.5 18.5 15 16.5 15 C17 17 15 18.5 13.5 17.5 C13.5 19.5 11 20.5 10 19 C8.5 20.5 6 19.5 6.5 17.5 C4.5 18 3 16 4.5 14.5 C2.5 14 2.5 11.5 4.5 11 C3.5 9.5 4.5 7.5 6.5 7.5 C6 5.5 8 4 9.5 5 C9.5 3 11 2 12 2 Z"/>`,
  masonry: `<path d="M12 3 L17 6 L12 9 L7 6 Z"/><path d="M6 7.5 L11 10.5 L11 16 L6 13 Z"/><path d="M13 10.5 L18 7.5 L18 13 L13 16 Z"/><path d="M9.5 12.2 L12 13.7 L14.5 12.2 L14.5 17.7 L12 19.2 L9.5 17.7 Z"/>`,
  tailoring: `<g transform="rotate(45 12 12)"><rect x="11.4" y="3" width="1.2" height="15" rx="0.6"/><path d="M12 2 L13.5 3.5 L12 5 L10.5 3.5 Z"/><path fill-rule="evenodd" d="M12 16 C14 16 15.5 17.5 15.5 19.3 C15.5 21.1 14 22.5 12.2 22.3 C13.3 21.8 14 20.8 14 19.5 C14 18.1 12.9 17 11.5 17 C11 17 10.5 17.2 10.1 17.5 L9.3 16.6 C10.1 16.2 11 16 12 16 Z"/></g>`,
  woodworking: `<path d="M4 14 L20 14 L20 17 L4 17 Z"/><path d="M8 10 L16 10 L17.5 14 L6.5 14 Z"/><rect x="10.5" y="6" width="3" height="4.5"/><path d="M13 6.5 C15 6 16.5 7.5 15.5 9 C15 8 14 7.5 13 7.8 Z"/>`,
  mining: `<g transform="rotate(45 12 12)"><rect x="11.3" y="6" width="1.4" height="16"/><path d="M12 2 C8 2 5 4.5 4 7.5 C6.5 7 9 6.5 12 6.5 C15 6.5 17.5 7 20 7.5 C19 4.5 16 2 12 2 Z"/></g>`,
  fishing: `<path d="M4 12 C7 8 12 8 15 12 C12 16 7 16 4 12 Z"/><circle cx="6.3" cy="11.3" r="0.7"/><path d="M15 12 L19 9 L18 12 L19 15 Z"/><path d="M19 9 C20.5 8 21.5 8.5 21.3 10 C21 9.3 20.2 9.2 19.5 9.8 Z"/>`,
  skinning: `<g transform="rotate(20 12 12)"><path d="M12 2 L12.8 4 L12.4 13 L11.6 13 L11.2 4 Z"/><rect x="10.5" y="13" width="3" height="6" rx="0.7"/></g><g transform="rotate(-20 12 12)"><path d="M12 2 L12.8 4 L12.4 13 L11.6 13 L11.2 4 Z"/><rect x="10.5" y="13" width="3" height="6" rx="0.7"/></g>`,
  herbalism: `<path d="M6 13 C6 17.5 8.5 20 12 20 C15.5 20 18 17.5 18 13 Z"/><rect x="5.5" y="12" width="13" height="1.5" rx="0.7"/><g transform="rotate(35 15 8)"><rect x="14.3" y="4" width="1.4" height="9"/><ellipse cx="15" cy="4" rx="1.6" ry="1"/></g><path d="M9 10 C8 9 8.3 7.7 9.3 7 C8.9 8 9.4 8.9 10 9.6 Z"/>`,
  foraging: `<path d="M12 12 C12 8 9 6 6 6.5 C6.5 9.5 8.5 11.5 12 12 Z"/><path d="M12 12 C12 8 15 6 18 6.5 C17.5 9.5 15.5 11.5 12 12 Z"/><path d="M12 12 C12 8.5 12 5.5 10.5 3.5 C13.5 3.5 14 6.5 12 12 Z"/><rect x="11.4" y="12" width="1.2" height="9"/>`,
  tinkering: `<path fill-rule="evenodd" d="M16.2 12 A4.2 4.2 0 1 0 7.8 12 A4.2 4.2 0 1 0 16.2 12 Z M13.8 12 A1.8 1.8 0 1 1 10.2 12 A1.8 1.8 0 1 1 13.8 12 Z"/><rect x="11.3" y="1.8" width="1.4" height="3.2"/><rect x="11.3" y="18.8" width="1.4" height="3.2"/><g transform="rotate(60 12 12)"><rect x="11.3" y="1.8" width="1.4" height="3.2"/><rect x="11.3" y="18.8" width="1.4" height="3.2"/></g><g transform="rotate(120 12 12)"><rect x="11.3" y="1.8" width="1.4" height="3.2"/><rect x="11.3" y="18.8" width="1.4" height="3.2"/></g>`,
  poisoncrafting: `<path d="M10.5 3 L13.5 3 L13.5 7 L15.3 12 C16.1 14.2 14.6 16.5 12.3 16.5 L11.7 16.5 C9.4 16.5 7.9 14.2 8.7 12 L10.5 7 Z"/><rect x="10" y="1.8" width="4" height="1.6" rx="0.5"/><path fill-rule="evenodd" d="M12 9 A2.1 2.1 0 1 0 12.01 9 Z M11.3 10.6 A0.45 0.45 0 1 0 10.4 10.6 A0.45 0.45 0 1 0 11.3 10.6 Z M13.6 10.6 A0.45 0.45 0 1 0 12.7 10.6 A0.45 0.45 0 1 0 13.6 10.6 Z"/><rect x="9.5" y="12" width="5" height="0.8" transform="rotate(20 12 12.4)"/><rect x="9.5" y="12" width="5" height="0.8" transform="rotate(-20 12 12.4)"/><path d="M11.6 18 C11.6 17.4 12.4 17.4 12.4 18 C12.4 18.6 12 19.5 12 19.5 C12 19.5 11.6 18.6 11.6 18 Z"/>`,
  enchanting: `<path d="M8 3 L9 6.5 L12.5 7.5 L9 8.5 L8 12 L7 8.5 L3.5 7.5 L7 6.5 Z"/><path d="M17 9 L17.6 11.2 L19.8 11.8 L17.6 12.4 L17 14.6 L16.4 12.4 L14.2 11.8 L16.4 11.2 Z"/><path d="M13 15 L13.5 16.8 L15.3 17.3 L13.5 17.8 L13 19.6 L12.5 17.8 L10.7 17.3 L12.5 16.8 Z"/>`,
  tanning: `<path d="M12 3 C14 3 14.5 4.5 13.7 5.5 C15.5 5 16.8 6.5 16 8.2 C17.5 8.5 18 10.5 16.5 11.5 C17.5 13 16.5 15 14.7 14.6 C14.8 16.5 12.7 17.5 11.5 16.2 C10.3 17.5 8.2 16.5 8.3 14.6 C6.5 15 5.5 13 6.5 11.5 C5 10.5 5.5 8.5 7 8.2 C6.2 6.5 7.5 5 9.3 5.5 C8.5 4.5 9 3 11 3 Z"/><rect x="3.5" y="19" width="2" height="2.6" rx="0.3" transform="rotate(45 4.5 20.3)"/><rect x="18.5" y="19" width="2" height="2.6" rx="0.3" transform="rotate(-45 19.5 20.3)"/>`,
  smelting: `<path d="M8 3 L16 3 L15 11 C14.7 13 13.5 14 12 14 C10.5 14 9.3 13 9 11 Z"/><rect x="11.2" y="14" width="1.6" height="5"/><rect x="8" y="19" width="8" height="1.6" rx="0.5"/><path d="M10.5 6.5 C9.8 5.7 10 4.8 10.7 4 C10.3 4.9 10.8 5.6 11.2 6.2 Z"/><path d="M13.5 6.5 C12.8 5.7 13 4.8 13.7 4 C13.3 4.9 13.8 5.6 14.2 6.2 Z"/>`,
  farming: `<rect x="11.3" y="10" width="1.4" height="12"/><path d="M12 6 C11.3 7 11.3 8 12 9 C12.7 8 12.7 7 12 6 Z"/><path d="M11 7.5 C10.3 8.3 10.3 9.3 11 10.3 C11.5 9.3 11.5 8.3 11 7.5 Z" transform="rotate(-15 12 12)"/><path d="M13 7.5 C13.7 8.3 13.7 9.3 13 10.3 C12.5 9.3 12.5 8.3 13 7.5 Z" transform="rotate(15 12 12)"/><rect x="9" y="20.5" width="6" height="1.3" rx="0.4"/>`,
  fermenting: `<path d="M8 8 L16 8 L15.3 20 C15.2 21.1 14.3 22 13.2 22 L10.8 22 C9.7 22 8.8 21.1 8.7 20 Z"/><rect x="7" y="6.3" width="10" height="2.2" rx="1"/><rect x="9.5" y="3" width="5" height="3.3" rx="1"/><circle cx="11" cy="12" r="0.8"/><circle cx="13.3" cy="15" r="0.7"/><circle cx="10.5" cy="16.5" r="0.6"/>`,
  firstaid: `<path fill-rule="evenodd" d="M4 4 L20 4 L20 20 L4 20 Z M9.5 6.5 L14.5 6.5 L14.5 9.5 L17.5 9.5 L17.5 14.5 L14.5 14.5 L14.5 17.5 L9.5 17.5 L9.5 14.5 L6.5 14.5 L6.5 9.5 L9.5 9.5 Z"/>`,
  lumberjacking: `<path fill-rule="evenodd" d="M4 8 L8.5 8 L8.5 16 L4 16 Z M6.9 12 A1.7 1.7 0 1 1 6.89 12 Z M6.2 12 A1 1 0 1 1 6.19 12 Z"/><rect x="8.5" y="9.3" width="12.5" height="5.4" rx="1"/>`,
  navigation: `<path fill-rule="evenodd" d="M17.5 12 A5.5 5.5 0 1 0 6.5 12 A5.5 5.5 0 1 0 17.5 12 Z M15 12 A2.5 2.5 0 1 1 10 12 A2.5 2.5 0 1 1 15 12 Z"/><rect x="11.3" y="1" width="1.4" height="4.5"/><rect x="11.3" y="18.5" width="1.4" height="4.5"/><rect x="1" y="11.3" width="4.5" height="1.4"/><rect x="18.5" y="11.3" width="4.5" height="1.4"/><g transform="rotate(45 12 12)"><rect x="11.3" y="1" width="1.4" height="4.5"/><rect x="11.3" y="18.5" width="1.4" height="4.5"/><rect x="1" y="11.3" width="4.5" height="1.4"/><rect x="18.5" y="11.3" width="4.5" height="1.4"/></g>`,
  pottery: `<path d="M9.5 3 L14.5 3 L14.5 5 L15.5 6.5 L15.5 9 C15.5 12 17 13.5 17 16.5 C17 19.5 14.8 21.5 12 21.5 C9.2 21.5 7 19.5 7 16.5 C7 13.5 8.5 12 8.5 9 L8.5 6.5 L9.5 5 Z"/><rect x="4" y="21.5" width="16" height="1.3" rx="0.6"/>`,
  riding: `<path d="M8 22 L8 15 C8 10 10 6 14 4 C13 6 13.5 7 15 7.5 C17 8 18 9.5 17.5 11.5 C19 11 20 12 19.5 13.5 C18.5 13 17.5 13.2 17 14 L17 22 L14.5 22 L14.5 17 L12.5 17 L12.5 22 Z"/><circle cx="15.5" cy="9" r="0.6"/>`,
  spellcrafting: `<path d="M12 3 L12.7 6.5 L15.5 7.2 L12.7 7.9 L12 11.4 L11.3 7.9 L8.5 7.2 L11.3 6.5 Z"/><path d="M8 15 L16 15 L16 17 L8 17 Z"/><path d="M9.5 17 L14.5 17 L15.5 21 L8.5 21 Z"/><rect x="11.3" y="11.4" width="1.4" height="3.6"/>`,
  spinning: `<path fill-rule="evenodd" d="M17.5 12 A6.5 6.5 0 1 0 4.5 12 A6.5 6.5 0 1 0 17.5 12 Z M15 12 A3.5 3.5 0 1 1 8 12 A3.5 3.5 0 1 1 15 12 Z"/><rect x="1" y="20" width="21" height="1.5" rx="0.5"/><rect x="4" y="15" width="1.3" height="6"/><rect x="17.3" y="15" width="1.3" height="6"/>`,
  spycraft: `<path fill-rule="evenodd" d="M12 2 C7 2 5 6 5 10 C5 14 6.5 17 8 19 L8 22 L16 22 L16 19 C17.5 17 19 14 19 10 C19 6 17 2 12 2 Z M8.2 10 A1.3 1.3 0 1 0 8.21 10 Z M15.8 10 A1.3 1.3 0 1 0 15.81 10 Z"/>`,
  stonecutting: `<rect x="4" y="14" width="9" height="8" rx="0.5"/><path d="M6 14 L4 10 L13 10 L11 14 Z"/><g transform="rotate(45 17 12)"><rect x="16.3" y="4" width="1.4" height="10"/><path d="M15.5 13 L18.5 13 L17.7 16.5 L16.3 16.5 Z"/></g>`,
  survival: `<path d="M12 3 L20 20 L16.5 20 L12 9 L7.5 20 L4 20 Z"/><path d="M12 9 L14.5 15 L9.5 15 Z"/>`,
  wagoneering: `<path d="M4 20 C4 14 7 10 12 10 C17 10 20 14 20 20 Z"/><rect x="3" y="19" width="18" height="1.5"/><circle cx="7" cy="21.5" r="1.8"/><circle cx="17" cy="21.5" r="1.8"/><rect x="9.5" y="13" width="1" height="6"/><rect x="13.5" y="13" width="1" height="6"/>`,
  wilderness: `<path d="M2 20 L8 8 L12 14 L16 6 L22 20 Z"/><path d="M8 8 L9.5 10.5 L7.8 11 L6.5 10.2 Z"/><path d="M16 6 L17.8 9 L15.6 9.6 L14.3 8.4 Z"/>`,
  animaltaming: `<circle cx="12" cy="15.5" r="4.2"/><circle cx="5.5" cy="10" r="1.9"/><circle cx="10.3" cy="6.3" r="2"/><circle cx="15.5" cy="6.5" r="1.9"/><circle cx="19" cy="10.3" r="1.8"/>`,
  archaeology: `<g transform="rotate(35 9 9)"><rect x="8.3" y="3" width="1.4" height="10"/><path d="M6 12 C6 10.5 7.4 9.5 9 9.5 C10.6 9.5 12 10.5 12 12 L12 13.5 L6 13.5 Z"/></g><path d="M14 15 C14 13.3 15.8 12 18 12 C20.2 12 22 13.3 22 15 L22 19 C22 20.7 20.2 22 18 22 C15.8 22 14 20.7 14 19 Z"/><rect x="15" y="13.5" width="6" height="1.3"/>`,
  disenchanting: `<path fill-rule="evenodd" d="M12 2 L17 6 L15.5 13 L12 22 L8.5 13 L7 6 Z M11 8 L13 8 L12.3 13 L13.5 13 L11.5 18 L12.2 14 L11 14 Z"/>`,
  // Beastmaster companion icons — one flat silhouette per tamed animal type,
  // same style as the tradeskill glyphs above. Extend with another animal
  // key the same way whenever a new companion type is confirmed.
  bear: `<circle cx="12" cy="13.5" r="7"/><circle cx="5.8" cy="6.5" r="2.5"/><circle cx="18.2" cy="6.5" r="2.5"/><ellipse cx="12" cy="16.3" rx="3" ry="2.4"/>`,
  rat: `<ellipse cx="9.5" cy="14.8" rx="6.3" ry="4.1"/><circle cx="16.2" cy="11.4" r="3.1"/><circle cx="17.5" cy="8.4" r="1.4"/><path d="M19.1 11.1 L22.5 10.3 L19.6 12.7 Z"/><path d="M3.8 13.2 C1.3 13.7 0.8 16.7 2.8 18.7 C2.1 16.7 2.8 14.7 4.6 14.2 Z"/>`,
  crocodile: `<path d="M2 14 L4 11 L6 13.5 L8 10.5 L10 13 L12 10.5 L14 13 L16 11 L19 12 L23 11.5 L23 13.7 L19 14.5 L14.5 16.3 L9 16.8 L4.5 16.3 Z"/><circle cx="18.3" cy="11.6" r="0.6"/><path d="M6.5 16.6 L6 19.3 L7.6 19.3 L7.7 16.7 Z"/><path d="M12.5 16.7 L12.2 19.4 L13.8 19.4 L13.7 16.6 Z"/>`,
  spider: `<circle cx="12" cy="15" r="4.4"/><circle cx="12" cy="8.7" r="2.8"/><rect x="12" y="11.3" width="9" height="1.3" transform="rotate(55 12 12)"/><rect x="12" y="11.3" width="9" height="1.3" transform="rotate(25 12 12)"/><rect x="12" y="11.3" width="9" height="1.3" transform="rotate(-25 12 12)"/><rect x="12" y="11.3" width="9" height="1.3" transform="rotate(-55 12 12)"/><rect x="12" y="11.3" width="9" height="1.3" transform="rotate(125 12 12)"/><rect x="12" y="11.3" width="9" height="1.3" transform="rotate(155 12 12)"/><rect x="12" y="11.3" width="9" height="1.3" transform="rotate(205 12 12)"/><rect x="12" y="11.3" width="9" height="1.3" transform="rotate(235 12 12)"/>`,
  wolf: `<circle cx="12" cy="14" r="6.5"/><path d="M5 9 L7.5 4 L9.5 8.5 Z"/><path d="M19 9 L16.5 4 L14.5 8.5 Z"/><ellipse cx="12" cy="17" rx="2.6" ry="2.1"/>`,
  // Monsters page section icons — boss (skull) vs. regular (paw print),
  // used on the zone-grid cards in each section (see renderMonstersCategories).
  boss: `<path d="M12 3 C7 3 4 6.5 4 11 C4 13.5 5 15.5 6.5 17 L6.5 19.5 C6.5 20.3 7.1 21 8 21 L9 21 L9 19 L10 19 L10 21 L14 21 L14 19 L15 19 L15 21 L16 21 C16.9 21 17.5 20.3 17.5 19.5 L17.5 17 C19 15.5 20 13.5 20 11 C20 6.5 17 3 12 3 Z"/><circle cx="8.7" cy="11" r="1.8"/><circle cx="15.3" cy="11" r="1.8"/><path d="M11.3 12.7 L12.7 12.7 L12 15.2 Z"/>`,
  paw: `<ellipse cx="12" cy="16" rx="5" ry="4"/><circle cx="6.5" cy="9" r="2"/><circle cx="10.5" cy="6.5" r="2"/><circle cx="14.5" cy="6.5" r="2"/><circle cx="18" cy="9" r="2"/>`,
  // Sidebar nav icons (2026-07-17) — one per top-level/nested destination,
  // see NAV_ICON. Several destinations reuse an icon already defined above
  // (navigation for Maps, enchanting/disenchanting/blacksmithing for their
  // matching tradeskill pages, boss/paw for Named/Regular Monsters, wolf for
  // Companions) rather than needing a new glyph; these four are the ones
  // with no existing equivalent.
  links: `<path fill-rule="evenodd" d="M4 12 A4 4 0 0 1 8 8 L11 8 L11 10 L8 10 A2 2 0 1 0 8 14 L11 14 L11 16 L8 16 A4 4 0 0 1 4 12 Z M20 12 A4 4 0 0 0 16 8 L13 8 L13 10 L16 10 A2 2 0 1 1 16 14 L13 14 L13 16 L16 16 A4 4 0 0 0 20 12 Z"/>`,
  itemdb: `<path d="M4 9 L20 9 L20 19 C20 20.1 19.1 21 18 21 L6 21 C4.9 21 4 20.1 4 19 Z"/><path fill-rule="evenodd" d="M4 9 C4 6 6.5 4 12 4 C17.5 4 20 6 20 9 Z M7 9 C7 7.2 8.5 6.3 12 6.3 C15.5 6.3 17 7.2 17 9 Z"/><rect x="10.7" y="12" width="2.6" height="2.6" rx="0.6"/>`,
  gatheringicon: `<path d="M5 10 L19 10 L17 20 C16.9 20.6 16.3 21 15.6 21 L8.4 21 C7.7 21 7.1 20.6 7 20 Z"/><path fill-rule="evenodd" d="M8.3 10 C8.3 6.5 9.9 4.3 12 4.3 C14.1 4.3 15.7 6.5 15.7 10 L14.3 10 C14.3 7.3 13.2 5.7 12 5.7 C10.8 5.7 9.7 7.3 9.7 10 Z"/><rect x="7.6" y="13" width="8.8" height="1" rx="0.4"/><rect x="7.9" y="16" width="8.2" height="1" rx="0.4"/>`,
  submiticon: `<path fill-rule="evenodd" d="M3 8 C3 6.9 3.9 6 5 6 L8 6 L9 4 L15 4 L16 6 L19 6 C20.1 6 21 6.9 21 8 L21 18 C21 19.1 20.1 20 19 20 L5 20 C3.9 20 3 19.1 3 18 Z M12 8.5 A5 5 0 1 0 12.01 8.5 Z M12 10.3 A3.2 3.2 0 1 1 11.99 10.3 Z"/><circle cx="18" cy="8.5" r="0.7"/>`,
};

// Background circle color per icon key — approximated from the reference
// sheet's own per-category badge colors (muted, material-associated: stone
// grey, leather brown, slate blue, etc.), not the site's gold/teal accent
// colors. Categories the sheet doesn't show (jewelry, food/drink, generic
// material) get a palette-matching color of their own so every icon still
// renders as a colored badge. See svgIcon().
const ICON_BG = {
  bludgeoning1h: '#8a8a83', bludgeoning2h: '#5f5b52',
  slashing1h: '#7a3a28', slashing2h: '#8a4a2a',
  piercing1h: '#4f6b7a', piercing2h: '#44607a',
  archery: '#3d4a35', throwing: '#5a4a6a', ammo: '#5a4025',
  shield: '#35526a', plate: '#66727e', chain: '#4a4a4a',
  leather: '#3a2e22', cloth: '#8f7a52', armor: '#5a5248',
  ring: '#6a5a3a', earring: '#6a5a3a', necklace: '#6a5a3a',
  food: '#5a6a2e', drink: '#5a4a2e', container: '#4a3a24', material: '#5a5850',
  alchemy: '#3a4a2e', animaltaming: '#6a5228', archaeology: '#4a3c2e',
  blacksmithing: '#3a2a1e', brewing: '#7a4a20', carpentry: '#4a3a1e',
  cooking: '#5a2e1e', disenchanting: '#4a5a6a', enchanting: '#4a3560',
  farming: '#4a5a2e', fermenting: '#3a4a2e', firstaid: '#6a2020',
  fishing: '#24405a', fletching: '#2e4a2e', foraging: '#3a5a3a',
  herbalism: '#3f4f30', jewelcrafting: '#7a6a3a', leatherworking: '#5a3e22',
  lumberjacking: '#4a3a20', masonry: '#55554e', mining: '#3a3a45',
  navigation: '#2e4a5e', pottery: '#5a4a30', poisoncrafting: '#4a3550',
  riding: '#5a3a20', skinning: '#4a2020', smelting: '#3a3a3a',
  spellcrafting: '#4a3560', spinning: '#4a3a4a', spycraft: '#2e2438',
  stonecutting: '#34424e', survival: '#3a4a2e', tailoring: '#4a3520',
  tanning: '#4a3520', tinkering: '#6a5a2e', wagoneering: '#4a3820',
  wilderness: '#2a3a24', woodworking: '#4a3820',
  bear: '#4a3323', rat: '#5c5347', crocodile: '#33472c', spider: '#241f30',
  wolf: '#3a3f47',
  boss: '#5a1f1f', paw: '#3f4f30',
  links: '#455060', itemdb: '#7a5a2a', gatheringicon: '#455a2e', submiticon: '#3a3a45',
};

// Maps a tradeskill name (tradeskills.json) to one of the icons above — used
// for crafting-material item cards, recipe cards, and the Crafting page's
// own tradeskill grid (see renderCraftingCategories). The 2026-07-08
// reference sheet showed all 38 tradeskills by their exact in-game names,
// so every entry here is a direct name match (unlike the same-day first
// pass, which had to invent about half of them). A tradeskill added to
// tradeskills.json in the future without an entry here falls back to the
// generic "material" icon (items) or its own initial letter (recipes).
const TRADESKILL_ICON = {
  Alchemy: 'alchemy',
  'Animal Taming': 'animaltaming',
  Archaeology: 'archaeology',
  Blacksmithing: 'blacksmithing',
  Brewing: 'brewing',
  Carpentry: 'carpentry',
  Cooking: 'cooking',
  Disenchanting: 'disenchanting',
  Enchanting: 'enchanting',
  Farming: 'farming',
  Fermenting: 'fermenting',
  'First Aid': 'firstaid',
  Fishing: 'fishing',
  Fletching: 'fletching',
  Foraging: 'foraging',
  Herbalism: 'herbalism',
  Jewelcrafting: 'jewelcrafting',
  Leatherworking: 'leatherworking',
  Lumberjacking: 'lumberjacking',
  Masonry: 'masonry',
  Mining: 'mining',
  Navigation: 'navigation',
  Pottery: 'pottery',
  'Poison Making': 'poisoncrafting',
  Riding: 'riding',
  Skinning: 'skinning',
  Smelting: 'smelting',
  Spellcrafting: 'spellcrafting',
  Spinning: 'spinning',
  Spycraft: 'spycraft',
  'Stone Cutting': 'stonecutting',
  Survival: 'survival',
  Tailoring: 'tailoring',
  Tanning: 'tanning',
  Tinkering: 'tinkering',
  Wagoneering: 'wagoneering',
  Wilderness: 'wilderness',
  Woodworking: 'woodworking',
};

// Maps a pages.json `file` to one of the icons above, for the small icon
// shown before each sidebar nav link (2026-07-17, user's own call — "makes
// it easier to instantly spot the place you want to go"). Most entries here
// reuse an icon already built for something else on the site (Maps gets the
// same compass used for gathering-node location context; Crafting reuses
// its own tradeskill glyph; Named/Regular Monsters reuse the same boss/paw
// icons already shown on their own category cards; Companions reuses the
// wolf glyph) rather than needing a new one — only Useful Links, Item
// Database, Gathering, and Submit a Screenshot needed a dedicated glyph
// (links/itemdb/gatheringicon/submiticon above). A page with no entry here
// just renders without an icon rather than erroring — true for Enchanting/
// Disenchanting now that they're cards inside Crafting/Gathering rather than
// their own pages.json entries; their icon still shows up correctly on
// their own tradeskill card and in "Most Visited" via TRADESKILL_ICON,
// which is keyed by tradeskill name rather than page file.
const NAV_ICON = {
  'useful-links.md': 'links',
  items: 'itemdb',
  maps: 'navigation',
  gathering: 'gatheringicon',
  crafting: 'blacksmithing',
  'monsters-named': 'boss',
  'monsters-regular': 'paw',
  companions: 'wolf',
  submit: 'submiticon',
};

function svgIcon(key) {
  const bg = ICON_BG[key] || '#55524a';
  const glyph = ICON_DEFS[key] || ICON_DEFS.material;
  return `<svg viewBox="0 0 24 24" class="type-icon"><circle cx="12" cy="12" r="11.5" fill="${bg}"/><g fill="#f3e9d6">${glyph}</g></svg>`;
}

// Weapon icon is keyed off the reference sheet's own (coarser) categories —
// 1H/2H × Bludgeoning/Slashing/Piercing, plus Archery/Throwing — derived
// from the existing skill/twoHanded fields, no separate schema field to
// keep in sync. This intentionally dropped the previous pass's per-weapon-
// name detail (axe/mace/hammer/dagger/scythe/scimitar each had their own
// icon) since the 2026-07-08 reference sheet only draws these six damage-
// type badges, not one per weapon name — matching the sheet took priority
// over that finer distinction. Falls back to 1H Slashing for anything that
// doesn't match a known skill.
function weaponIconKey(item) {
  if (item.slot === 'Ammo') return 'ammo';
  if (item.skill === 'Archery') return 'archery';
  if (item.skill === 'Throwing') return 'throwing';
  if (item.skill === 'Stabbing') return item.twoHanded ? 'piercing2h' : 'piercing1h';
  if (item.skill === 'Slashing') return item.twoHanded ? 'slashing2h' : 'slashing1h';
  if (item.skill === 'Blunt') return item.twoHanded ? 'bludgeoning2h' : 'bludgeoning1h';
  return 'slashing1h';
}

// Armor material is guessed from the item name (Plate/Chain/Rawhide-Leather/
// Cloth), same as the game's own naming convention for crafted armor lines.
// Shields are checked first since they're their own category, not a
// material tier. Anything that doesn't match a known material falls back to
// a plain armor icon rather than guessing wrong.
function armorIconKey(item) {
  const name = (item.name || '').toLowerCase();
  if (item.slot === 'Secondary' || name.includes('shield') || name.includes('buckler')) return 'shield';
  if (name.includes('plate')) return 'plate';
  if (name.includes('chain')) return 'chain';
  if (name.includes('rawhide') || name.includes('hide') || name.includes('leather')) return 'leather';
  if (name.includes('cloth')) return 'cloth';
  return 'armor';
}

function jewelryIconKey(item) {
  if (item.slot === 'Ear') return 'earring';
  if (item.slot === 'Neck') return 'necklace';
  return 'ring';
}

// A crafting material can belong to more than one tradeskill (crafted by
// one, consumed as a component by another) — collect every tradeskill it
// touches via crafting.json and show one icon per tradeskill, in the order
// first seen. Falls back to a generic raw-material icon if it isn't linked
// to any recipe yet.
function craftingIconKeys(item) {
  const tradeskills = [];
  const ownRecipe = findRecipeForItem(item.name);
  if (ownRecipe) tradeskills.push(ownRecipe.tradeskill);
  findRecipesUsingItem(item.name).forEach(r => {
    if (!tradeskills.includes(r.tradeskill)) tradeskills.push(r.tradeskill);
  });
  if (!tradeskills.length) return ['material'];
  return tradeskills.map(ts => TRADESKILL_ICON[ts] || 'material');
}

// Human-readable label per icon key, shown as a small category line under
// the item name on its card (see renderItemCardHTML). Kept in one place so
// it never drifts out of sync with ICON_DEFS.
const ICON_LABELS = {
  bludgeoning1h: 'Bludgeoning (1H)', bludgeoning2h: 'Bludgeoning (2H)',
  slashing1h: 'Slashing (1H)', slashing2h: 'Slashing (2H)',
  piercing1h: 'Piercing (1H)', piercing2h: 'Piercing (2H)',
  archery: 'Archery', ammo: 'Ammo', throwing: 'Throwing Weapon',
  shield: 'Shield', plate: 'Plate Armor', chain: 'Chain Armor',
  leather: 'Leather Armor', cloth: 'Cloth Armor', armor: 'Armor',
  ring: 'Ring', earring: 'Earring', necklace: 'Necklace', food: 'Food',
  drink: 'Drink', container: 'Container', material: 'Crafting Material',
  alchemy: 'Alchemy Material', animaltaming: 'Animal Taming Material',
  archaeology: 'Archaeology Material', blacksmithing: 'Blacksmithing Material',
  brewing: 'Brewing Material', carpentry: 'Carpentry Material', cooking: 'Cooking Material',
  disenchanting: 'Disenchanting Material', enchanting: 'Enchanting Material',
  farming: 'Farming Material', fermenting: 'Fermenting Material', firstaid: 'First Aid Material',
  fishing: 'Fishing Material', fletching: 'Fletching Material', foraging: 'Foraging Material',
  herbalism: 'Herbalism Material', jewelcrafting: 'Jewelcrafting Material',
  leatherworking: 'Leatherworking Material', lumberjacking: 'Lumberjacking Material',
  masonry: 'Masonry Material', mining: 'Mining Material', navigation: 'Navigation Material',
  pottery: 'Pottery Material', poisoncrafting: 'Poison Making Material', riding: 'Riding Material',
  skinning: 'Skinning Material', smelting: 'Smelting Material', spellcrafting: 'Spellcrafting Material',
  spinning: 'Spinning Material', spycraft: 'Spycraft Material', stonecutting: 'Stone Cutting Material',
  survival: 'Survival Material', tailoring: 'Tailoring Material', tanning: 'Tanning Material',
  tinkering: 'Tinkering Material', wagoneering: 'Wagoneering Material', wilderness: 'Wilderness Material',
  woodworking: 'Woodworking Material',
};

// The icon key(s) for an item's card header — usually one, but a Misc
// crafting material can have several (one per tradeskill it's part of).
// Shared by itemIconHTML (the icon glyphs) and itemCategoryLabel (the text
// under the item's name) so the two never disagree with each other.
function itemIconKeys(item) {
  if (item.type === 'Weapon') return [weaponIconKey(item)];
  if (item.type === 'Armor') return [armorIconKey(item)];
  if (item.type === 'Jewelry') return [jewelryIconKey(item)];
  if (item.type === 'Food') return ['food'];
  if (item.type === 'Drink') return ['drink'];
  if (item.type === 'Container') return ['container'];
  if (item.type === 'Misc') return craftingIconKeys(item);
  return ['material'];
}

function itemIconHTML(item) {
  return itemIconKeys(item).map(svgIcon).join('');
}

function itemCategoryLabel(item) {
  return itemIconKeys(item).map(k => ICON_LABELS[k] || 'Item').join(', ');
}

// Plural display label per item.type — used for the Type filter dropdown's
// option text and the page heading/Type column in renderItemsList.
const ITEM_TYPE_LABELS = {
  Weapon: 'Weapons', Armor: 'Armor', Jewelry: 'Jewelry', Container: 'Containers',
  Food: 'Food', Drink: 'Drinks', Misc: 'Misc',
};

// Armor's item table gets an extra "Material" filter dropdown (see
// renderItemsList) built from this list. Reuses armorIconKey's existing
// material guess (already used for the item card icon) rather than a
// separate schema field. Fixed display order (light to heavy, Other last)
// rather than alphabetical, and only materials that actually have an item
// show up (same "derive from data" rule as every other filter/dropdown in
// this file). Shields are deliberately left out (2026-07-15) — a shield
// isn't a material tier the way Cloth/Leather/Chain/Plate are, and every
// shield already has `slot: "Secondary"` (the only item type that does),
// so the existing Slot dropdown already isolates them without needing a
// confusing "Shields" bucket sitting next to real materials.
const ARMOR_MATERIAL_ORDER = ['cloth', 'leather', 'chain', 'plate', 'armor'];
const ARMOR_MATERIAL_LABELS = {
  cloth: 'Cloth', leather: 'Leather', chain: 'Chain', plate: 'Plate',
  armor: 'Other',
};

function itemRatio(item) {
  if (item.damage == null || !item.delay) return null;
  return item.damage / item.delay;
}

// Shared by formatStats() (comma text, used in the table + search) and the
// item card's stat chips (see renderItemCardHTML) so the "which stats/
// resists/haste does this item have" logic only lives in one place.
// Most stat/resist bonuses are positive, but a resist can be negative (e.g.
// a corruption-themed item with "SV Corruption: -5") — only prepend "+" when
// the number itself doesn't already carry a "-" sign.
function formatSigned(n) {
  return n < 0 ? `${n}` : `+${n}`;
}

function statEntries(item) {
  const entries = [];
  ITEM_STAT_ORDER.forEach(stat => {
    if (item.stats && item.stats[stat]) entries.push({ label: stat, value: formatSigned(item.stats[stat]) });
  });
  ITEM_RESIST_ORDER.forEach(res => {
    if (item.resists && item.resists[res]) entries.push({ label: `SV ${res}`, value: formatSigned(item.resists[res]) });
  });
  if (item.haste) entries.push({ label: 'Haste', value: `${formatSigned(item.haste)}%` });
  // spellHaste/hpRegen/manaRegen added 2026-07-19 — first seen on real cards
  // ("Spell Haste: +7%", "HP Regeneration: +3", "Mana Regeneration: +1"),
  // distinct from the flat `haste`/`stats.HP`/`stats.MANA` fields above.
  if (item.spellHaste) entries.push({ label: 'Spell Haste', value: `${formatSigned(item.spellHaste)}%` });
  if (item.hpRegen) entries.push({ label: 'HP Regen', value: formatSigned(item.hpRegen) });
  if (item.manaRegen) entries.push({ label: 'Mana Regen', value: formatSigned(item.manaRegen) });
  // percussion added 2026-07-19 — first seen on Hydrophone Drum ("Percussion: +28%"),
  // a Bard instrument-skill bonus distinct from the flat `haste` field.
  if (item.percussion) entries.push({ label: 'Percussion', value: `${formatSigned(item.percussion)}%` });
  // wind added 2026-07-19 — first seen on Mantle of the Windcaller ("Wind: +5%"),
  // presumably a Bard wind-instrument-skill bonus paralleling `percussion`.
  if (item.wind) entries.push({ label: 'Wind', value: `${formatSigned(item.wind)}%` });
  // rangedHaste added 2026-07-19 — first seen on Hip Quiver ("Ranged Haste: +10%"),
  // distinct from the flat `haste` field which applies to melee.
  if (item.rangedHaste) entries.push({ label: 'Ranged Haste', value: `${formatSigned(item.rangedHaste)}%` });
  return entries;
}

function formatStats(item) {
  const entries = statEntries(item);
  return entries.length ? entries.map(e => `${e.label} ${e.value}`).join(', ') : '—';
}

// Does this item carry a given buff (an ITEM_BUFF_OPTIONS value)? Used by
// the Item Database's "search by buff" dropdowns so someone can find e.g.
// "every item with both STA and HP" without knowing exact bonus numbers.
function itemHasBuff(item, buffValue) {
  if (!buffValue) return true;
  if (buffValue === 'haste') return !!item.haste;
  const [kind, key] = buffValue.split(':');
  if (kind === 'stat') return !!(item.stats && item.stats[key]);
  if (kind === 'resist') return !!(item.resists && item.resists[key]);
  return true;
}

function formatCapacity(item) {
  return item.capacity != null ? `${item.capacity} / ${item.maxSize}` : '—';
}

function formatSlot(item) {
  if (!item.slot) return '—';
  return item.twoHanded ? `${item.slot} (2H)` : item.slot;
}

// Bows specifically (not the Range-slot Copper Throwing Dagger, and not
// Ammo-slot arrows, which are a bow's ammunition rather than the bow
// itself) — used by the Weapons category's handedness/type filter.
function isBow(item) {
  return item.skill === 'Archery' && item.slot === 'Range';
}

function formatList(values) {
  if (!values || !values.length) return '—';
  if (values.includes('ALL')) return 'All';
  return values.join(', ');
}

// Shared "Last updated" convention for items/monsters/recipes/companions —
// see CLAUDE.md's `lastUpdated` note. Plain "YYYY-MM-DD" in the data (same
// date-string style used elsewhere in this codebase), rendered as a short
// human date. Entries added before this field existed simply have no
// `lastUpdated` at all, so every call site only renders this when present
// rather than showing a misleading fallback.
function formatLastUpdated(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return '';
  const text = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  return `<div class="last-updated-badge">Last updated: ${text}</div>`;
}

function itemSearchHaystack(item) {
  const ratio = itemRatio(item);
  return [
    item.name,
    item.type,
    formatSlot(item),
    item.twoHanded ? 'two handed' : '',
    item.skill,
    formatStats(item),
    formatList(item.classes),
    formatList(item.race),
    item.ac != null ? `AC ${item.ac}` : '',
    item.damage != null ? `DMG ${item.damage}` : '',
    item.delay != null ? `DELAY ${item.delay}` : '',
    ratio != null ? `RATIO ${ratio.toFixed(2)}` : '',
    (item.tags || []).join(' '),
    item.description || '',
    item.effect || '',
    item.readText || '',
    item.capacity != null ? `CAPACITY ${item.capacity}` : '',
    item.maxSize ? `MAX SIZE ${item.maxSize}` : ''
  ].join(' ').toLowerCase();
}

async function renderItemsPage(container) {
  await ensureItemsData();

  // Landed here from a header search result for a specific item — jump
  // straight to that item's own type instead of "All Types" (same pattern
  // as pendingCraftingTradeskill on the Crafting page).
  if (pendingItemCategory) {
    const category = pendingItemCategory;
    pendingItemCategory = null;
    renderItemsList(container, category);
    return;
  }

  renderItemsList(container, null);
}

// The Item Database's one and only view — search box, a Type dropdown
// (Weapon/Armor/Jewelry/etc., or "All Types") plus Slot/Class/Race/Tag/
// Max Size/buff filters, click-to-sort columns, and the existing hover/
// click card behavior. Used to be a two-step flow (a category grid of
// clickable cards, drilling into this table) — the user asked to drop the
// grid entirely (2026-07-19) in favor of just filtering, since a dropdown
// gets you to the same place in one fewer click and doesn't need its own
// separate quick-search. Picking a Type from the dropdown re-renders this
// same function scoped to that type (see the Type filter's own change
// handler below) — the "category" parameter/argument is unchanged from
// before, just now driven by a dropdown instead of a card click or the
// header search box (pendingItemCategory, still used by goToItem).
// Armor gets one extra dropdown, Material (Cloth/Leather/Chain/Plate/Shield/
// Other) — this replaced a separate two-level material→slot card drill-down
// (renderArmorMaterials/renderArmorSlots, removed 2026-07-15) so Armor now
// reaches its table the same one-click way every other category does.
function renderItemsList(container, category) {
  // `category === null` means "every type" — the default landing state,
  // and also reachable any time via the Type dropdown's own "All Types"
  // option.
  const showTypeColumn = category === null;
  const categoryItems = itemsData.filter(i => showTypeColumn || i.type === category);
  const categoryLabel = showTypeColumn ? 'All Items' : (ITEM_TYPE_LABELS[category] || category);
  const subtitleLabel = categoryLabel.toLowerCase();
  // "all items" already ends in "items", so it skips the template's own
  // trailing "items." below to avoid "all items items."
  const subtitleSuffix = showTypeColumn ? '' : ' items';
  // Options for the Type dropdown always list every type regardless of
  // which one is currently selected — unlike Slot/Class/etc. below, which
  // are scoped to categoryItems, this one has to stay unscoped so switching
  // away from the current type is always possible.
  const allTypes = [...new Set(itemsData.map(i => i.type))].sort();

  // Landed here from a recipe's component list — remember which recipe so
  // we can show a link back to it, instead of leaving the user stranded.
  const returnToRecipe = pendingReturnToRecipe;
  pendingReturnToRecipe = null;

  // Same idea, but for a monster's drop table.
  const returnToMonster = pendingReturnToMonster;
  pendingReturnToMonster = null;

  // Landed here from a search result for one specific item — flash its row
  // once the table renders, same idea as pendingHighlightRecipe on the
  // Crafting page.
  const highlightSlug = pendingHighlightItem;
  pendingHighlightItem = null;

  const slots = [...new Set(categoryItems.map(i => i.slot))].filter(Boolean).sort();
  // Handedness isn't a data value to derive like the dropdowns below (it's a
  // plain boolean, `item.twoHanded`) — only offered on the Weapon category,
  // where the field is actually meaningful. Material is the same idea, but
  // for Armor — derived from armorIconKey (already used for the card icon)
  // rather than a separate schema field, same fixed light-to-heavy order as
  // the old material drill-down cards.
  const isWeaponCategory = category === 'Weapon';
  const isArmorCategory = category === 'Armor';
  const materials = isArmorCategory ? ARMOR_MATERIAL_ORDER.filter(m => categoryItems.some(i => armorIconKey(i) === m)) : [];
  const classes = [...new Set(categoryItems.flatMap(i => i.classes || []).filter(c => c !== 'ALL'))].sort();
  const races = [...new Set(categoryItems.flatMap(i => i.race || []).filter(r => r !== 'ALL'))].sort();
  const tags = [...new Set(categoryItems.flatMap(i => i.tags || []))].sort();
  const maxSizes = [...new Set(categoryItems.map(i => i.maxSize).filter(Boolean))].sort();

  container.innerHTML = `
    ${returnToRecipe ? `<p class="items-back-link"><a href="#" id="items-back-to-recipe">&larr; Back to ${escapeAttr(returnToRecipe.name)}</a></p>` : ''}
    ${returnToMonster ? `<p class="items-back-link"><a href="#" id="items-back-to-monster">&larr; Back to ${escapeAttr(returnToMonster.name)}</a></p>` : ''}
    <h1>Item Database</h1>
    <p>Browse, search, filter, and sort ${escapeAttr(subtitleLabel)}${subtitleSuffix}. Hover an item's name to see its full card.</p>
    <div class="items-toolbar">
      <input type="search" id="items-search" class="items-search" placeholder="Search name, stat, class..." autocomplete="off">
      <select id="items-filter-type" class="items-select">
        <option value="">All Types</option>
        ${allTypes.map(t => `<option value="${escapeAttr(t)}"${t === category ? ' selected' : ''}>${escapeAttr(ITEM_TYPE_LABELS[t] || t)}</option>`).join('')}
      </select>
      <select id="items-filter-slot" class="items-select">
        <option value="">All slots</option>
        ${slots.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
      ${isWeaponCategory ? `
      <select id="items-filter-handedness" class="items-select">
        <option value="">All Weapon Types</option>
        <option value="one">One Handed</option>
        <option value="two">Two Handed</option>
        <option value="bow">Bow</option>
      </select>` : ''}
      ${isArmorCategory ? `
      <select id="items-filter-material" class="items-select">
        <option value="">All materials</option>
        ${materials.map(m => `<option value="${m}">${escapeAttr(ARMOR_MATERIAL_LABELS[m] || m)}</option>`).join('')}
      </select>` : ''}
      <select id="items-filter-class" class="items-select">
        <option value="">All classes</option>
        ${classes.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
      <select id="items-filter-race" class="items-select">
        <option value="">All races</option>
        ${races.map(r => `<option value="${r}">${r}</option>`).join('')}
      </select>
      <select id="items-filter-tag" class="items-select">
        <option value="">All tags</option>
        ${tags.map(t => `<option value="${t}">${t}</option>`).join('')}
      </select>
      <select id="items-filter-maxsize" class="items-select">
        <option value="">All max sizes</option>
        ${maxSizes.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
      ${buffDropdownHTML('items-filter')}
      <label class="needsinfo-toggle" for="items-filter-needsinfo">
        <input type="checkbox" id="items-filter-needsinfo">
        <span class="needsinfo-toggle-slider"></span>
        <span>Show only items that need info</span>
      </label>
      ${showCardsToggleHTML('items-show-cards')}
      <button type="button" id="items-clear-filters" class="items-clear-btn">Clear all filters</button>
    </div>
    <p class="items-count" id="items-count"></p>
    <div class="items-table-wrap">
      <table class="items-table">
        <colgroup>
          <col class="col-name">
          ${showTypeColumn ? '<col class="col-type">' : ''}
          <col class="col-slot">
          <col class="col-ac">
          <col class="col-stats">
          <col class="col-damage">
          <col class="col-delay">
          <col class="col-ratio">
          <col class="col-weight">
          <col class="col-capacity">
          <col class="col-classes">
          <col class="col-race">
        </colgroup>
        <thead>
          <tr>
            <th data-sort-key="name" class="sortable">Name</th>
            ${showTypeColumn ? '<th data-sort-key="type" class="sortable">Type</th>' : ''}
            <th data-sort-key="slot" class="sortable">Slot</th>
            <th data-sort-key="ac" class="sortable">AC</th>
            <th data-sort-key="stats" class="sortable">Stats</th>
            <th data-sort-key="damage" class="sortable">Damage</th>
            <th data-sort-key="delay" class="sortable">Delay</th>
            <th data-sort-key="ratio" class="sortable">Ratio</th>
            <th data-sort-key="weight" class="sortable">Weight / Size</th>
            <th data-sort-key="capacity" class="sortable">Capacity / Max Size</th>
            <th data-sort-key="classes" class="sortable">Classes</th>
            <th data-sort-key="race" class="sortable">Race</th>
          </tr>
        </thead>
        <tbody id="items-tbody"></tbody>
      </table>
    </div>
  `;

  setupItemTooltip(container.querySelector('#items-tbody'));
  setupItemClickToView(container.querySelector('#items-tbody'));
  setupShowCardsToggle(container, 'items-show-cards');

  const searchBox = container.querySelector('#items-search');
  const typeFilter = container.querySelector('#items-filter-type');
  const slotFilter = container.querySelector('#items-filter-slot');
  const handednessFilter = container.querySelector('#items-filter-handedness');
  const materialFilter = container.querySelector('#items-filter-material');
  const classFilter = container.querySelector('#items-filter-class');
  const raceFilter = container.querySelector('#items-filter-race');
  const tagFilter = container.querySelector('#items-filter-tag');
  const maxSizeFilter = container.querySelector('#items-filter-maxsize');
  const needsInfoFilter = container.querySelector('#items-filter-needsinfo');
  // onChange (live), not onClose — this page's own update() only touches
  // the results table/count, so the panel itself is never torn down and
  // there's no reason to wait for close to re-filter.
  const buffDropdown = setupBuffDropdown(container, 'items-filter', { onChange: update });
  const sortHeaders = [...container.querySelectorAll('th[data-sort-key]')];

  // Landed here from a header search result — pre-fill the search box with
  // that item's name so the table filters straight down to it.
  if (pendingItemQuery) {
    searchBox.value = pendingItemQuery;
    pendingItemQuery = null;
  }

  // Set right before this render by the Type dropdown's own change handler
  // below (switching type re-renders this whole function scoped to the new
  // type) — carries the other filters the user had already set over onto
  // the new render so they don't silently reset just from picking a
  // different type.
  if (pendingItemFilters) {
    const f = pendingItemFilters;
    pendingItemFilters = null;
    if (f.slot) slotFilter.value = f.slot;
    if (f.cls) classFilter.value = f.cls;
    if (f.race) raceFilter.value = f.race;
    if (f.tag) tagFilter.value = f.tag;
    if (f.maxSize) maxSizeFilter.value = f.maxSize;
    if (f.needsInfo) needsInfoFilter.checked = true;
    buffDropdown.setSelected(f.buffs);
  }

  if (returnToRecipe) {
    container.querySelector('#items-back-to-recipe').addEventListener('click', e => {
      e.preventDefault();
      goToRecipe(returnToRecipe);
    });
  }

  if (returnToMonster) {
    container.querySelector('#items-back-to-monster').addEventListener('click', e => {
      e.preventDefault();
      goToMonster(returnToMonster);
    });
  }

  // Switching Type re-renders this whole function scoped to the new type —
  // Slot/Class/Material/etc. options and the Type column's visibility all
  // depend on which type (if any) is selected, so a full re-render is
  // simplest here (same as a category card click used to do), rather than
  // trying to patch all of that in place the way update() does for the
  // other filters. Carries the other current filter values across via
  // pendingItemFilters (see above), and the typed search query via
  // pendingItemQuery (already used the same way for header-search landings).
  typeFilter.addEventListener('change', () => {
    pendingItemFilters = {
      slot: slotFilter.value,
      cls: classFilter.value,
      race: raceFilter.value,
      tag: tagFilter.value,
      maxSize: maxSizeFilter.value,
      needsInfo: needsInfoFilter.checked,
      buffs: buffDropdown.getSelected()
    };
    if (searchBox.value) pendingItemQuery = searchBox.value;
    renderItemsList(container, typeFilter.value || null);
  });

  // Column headers sort by click — see itemSortValue for what each key reads
  // and ITEM_SORT_NUMERIC for which keys default to highest-first (numeric
  // columns) vs. A-Z-first (label columns) on their first click. Clicking
  // the already-active column flips direction instead of picking a new one.
  let sortKey = 'name';
  let sortDir = 'asc';

  function updateSortIndicators() {
    sortHeaders.forEach(th => {
      th.classList.toggle('sorted-asc', th.dataset.sortKey === sortKey && sortDir === 'asc');
      th.classList.toggle('sorted-desc', th.dataset.sortKey === sortKey && sortDir === 'desc');
    });
  }

  sortHeaders.forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sortKey;
      if (key === sortKey) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey = key;
        sortDir = ITEM_SORT_NUMERIC.includes(key) ? 'desc' : 'asc';
      }
      update();
    });
  });

  function update() {
    const query = searchBox.value.toLowerCase().trim();
    const slot = slotFilter.value;
    const handedness = handednessFilter ? handednessFilter.value : '';
    const material = materialFilter ? materialFilter.value : '';
    const cls = classFilter.value;
    const race = raceFilter.value;
    const tag = tagFilter.value;
    const maxSize = maxSizeFilter.value;
    const needsInfo = needsInfoFilter.checked;
    const buffs = buffDropdown.getSelected();

    let filtered = categoryItems.filter(item => {
      if (slot && item.slot !== slot) return false;
      if (handedness === 'two' && !item.twoHanded) return false;
      if (handedness === 'one' && (item.twoHanded || isBow(item))) return false;
      if (handedness === 'bow' && !isBow(item)) return false;
      if (material && armorIconKey(item) !== material) return false;
      if (cls && !(item.classes || []).includes('ALL') && !(item.classes || []).includes(cls)) return false;
      if (race && !(item.race || []).includes('ALL') && !(item.race || []).includes(race)) return false;
      if (tag && !(item.tags || []).includes(tag)) return false;
      if (maxSize && item.maxSize !== maxSize) return false;
      if (needsInfo && !item.needsInfo) return false;
      if (buffs.length && !buffs.every(b => itemHasBuff(item, b))) return false;
      if (query && !itemSearchHaystack(item).includes(query)) return false;
      return true;
    });

    filtered.sort((a, b) => {
      const av = itemSortValue(a, sortKey);
      const bv = itemSortValue(b, sortKey);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    updateSortIndicators();
    renderItemRows(container.querySelector('#items-tbody'), filtered, showTypeColumn);
    container.querySelector('#items-count').textContent =
      `Showing ${filtered.length} of ${categoryItems.length} items`;
  }

  [searchBox].forEach(el => el.addEventListener('input', update));
  [slotFilter, handednessFilter, materialFilter, classFilter, raceFilter, tagFilter, maxSizeFilter].filter(Boolean).forEach(el => el.addEventListener('change', update));
  needsInfoFilter.addEventListener('change', update);

  // Resets everything — search text, every dropdown (Slot/Class/Race/Tag/Max
  // Size/handedness/material), the stat/buff picker, the needs-info toggle,
  // and Type itself. Type can't just be reset to '' in place like the other
  // dropdowns — its own option list (and Slot/Class/Race/etc. alongside it)
  // is scoped per-type, so going back to "All Types" means a full re-render,
  // same as picking a different Type from the dropdown does. Re-rendering
  // with no pending query/filters set is what actually clears everything in
  // one step, rather than this handler needing to know every current/future
  // filter field by name.
  container.querySelector('#items-clear-filters').addEventListener('click', () => {
    pendingItemQuery = null;
    pendingItemFilters = null;
    renderItemsList(container, null);
  });

  update();

  if (highlightSlug) {
    const row = container.querySelector(`#items-tbody tr[data-slug="${CSS.escape(highlightSlug)}"]`);
    if (row) {
      suppressScrollReset = true;
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.add('row-flash');
      row.addEventListener('animationend', () => row.classList.remove('row-flash'), { once: true });
    }
  }
}

// One value per sortable column in the Item Database table — numeric for
// AC/Ratio/Weight/Capacity (so click-to-sort can put highest first), string
// for everything else (so it sorts A-Z first). Missing values sort last
// regardless of direction, handled by the caller in renderItemsPage.
const ITEM_SORT_NUMERIC = ['ac', 'damage', 'delay', 'ratio', 'weight', 'capacity'];
function itemSortValue(item, key) {
  switch (key) {
    case 'name': return item.name.toLowerCase();
    case 'type': return (ITEM_TYPE_LABELS[item.type] || item.type || '').toLowerCase();
    case 'slot': return (item.slot || '').toLowerCase();
    case 'ac': return item.ac != null ? item.ac : null;
    case 'stats': return formatStats(item).toLowerCase();
    case 'damage': return item.damage != null ? item.damage : null;
    case 'delay': return item.delay != null ? item.delay : null;
    case 'ratio': return itemRatio(item);
    case 'weight': return item.weight != null ? item.weight : null;
    case 'capacity': return item.capacity != null ? item.capacity : null;
    case 'classes': return formatList(item.classes).toLowerCase();
    case 'race': return formatList(item.race).toLowerCase();
    default: return '';
  }
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderItemRows(tbody, items, showTypeColumn) {
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="${showTypeColumn ? 12 : 11}" class="items-empty">No items match your filters.</td></tr>`;
    return;
  }

  // data-label mirrors each column's header text — read by the narrow-screen
  // stacked-card layout in style.css (each <td> becomes its own labeled row
  // via a ::before). cell-empty marks placeholder "—" cells so that view can
  // hide them instead of showing a label next to nothing. The Type column
  // (2026-07-14) only appears in the unscoped "All Items" list reached from
  // the category grid's own filter dropdowns — a normal per-category list
  // already implies its type, so it stays out of the way there.
  tbody.innerHTML = items.map(item => {
    const ratio = itemRatio(item);
    const damageCell = item.damage != null ? item.damage : '—';
    const delayCell = item.delay != null ? item.delay : '—';
    const ratioCell = ratio != null ? ratio.toFixed(2) : '—';
    const acCell = item.ac != null ? item.ac : '—';
    const capacityCell = formatCapacity(item);
    const weightSizeCell = (item.weight != null || item.size)
      ? `${item.weight != null ? item.weight : '—'} / ${item.size || '—'}`
      : '—';

    return `
      <tr data-slug="${escapeAttr(item.slug || '')}">
        <td data-label="Name">
          <span class="item-name-hover" data-alt="${item.name}">${(item.tags || []).map(t => `<span class="badge-tag">${t}</span> `).join('')}${item.name}</span>${item.needsInfo ? ' <span class="badge-tag badge-needs-info">NEEDS INFO</span>' : ''}
        </td>
        ${showTypeColumn ? `<td data-label="Type">${escapeAttr(ITEM_TYPE_LABELS[item.type] || item.type)}</td>` : ''}
        <td data-label="Slot"${formatSlot(item) === '—' ? ' class="cell-empty"' : ''}>${formatSlot(item)}</td>
        <td data-label="AC"${acCell === '—' ? ' class="cell-empty"' : ''}>${acCell}</td>
        <td data-label="Stats"${formatStats(item) === '—' ? ' class="cell-empty"' : ''}>${formatStats(item)}</td>
        <td data-label="Damage"${damageCell === '—' ? ' class="cell-empty"' : ''}>${damageCell}</td>
        <td data-label="Delay"${delayCell === '—' ? ' class="cell-empty"' : ''}>${delayCell}</td>
        <td data-label="Ratio"${ratioCell === '—' ? ' class="cell-empty"' : ''}>${ratioCell}</td>
        <td data-label="Weight / Size"${weightSizeCell === '—' ? ' class="cell-empty"' : ''}>${weightSizeCell}</td>
        <td data-label="Capacity / Max Size"${capacityCell === '—' ? ' class="cell-empty"' : ''}>${capacityCell}</td>
        <td data-label="Classes"${formatList(item.classes) === '—' ? ' class="cell-empty"' : ''}>${formatList(item.classes)}</td>
        <td data-label="Race"${formatList(item.race) === '—' ? ' class="cell-empty"' : ''}>${formatList(item.race)}</td>
      </tr>
    `;
  }).join('');
}

// Renders an item's full card — an original layout (not a screenshot, and
// deliberately not modeled on any other site's item popup) built entirely
// from items.json fields, used by both the hover preview and the item
// viewer modal. A gold accent + type icon (weapon/armor sub-type, jewelry
// slot, or tradeskill for materials — see itemIconHTML) marks it as an ITEM
// card, as opposed to the teal recipe cards below.
// `opts.interactive` adds a "Wrong or missing info?" link after
// the Found at line — only passed true from the full item viewer
// (openItemViewer), never the hover tooltip (#item-tooltip is
// pointer-events: none, so a link there would be visible but unclickable).
function renderItemCardHTML(item, opts = {}) {
  const iconHtml = itemIconHTML(item);
  const categoryLabel = itemCategoryLabel(item);
  const badges = (item.tags || []).map(t => `<span class="badge-tag">${t}</span>`).join('')
    + (item.tradeskillContainer ? '<span class="badge-tag">TRADESKILL</span>' : '');

  const fields = [];
  if (item.slot) fields.push({ label: 'Slot', value: formatSlot(item) });
  if (item.ac != null) fields.push({ label: 'AC', value: item.ac });
  if (item.damage != null) {
    fields.push({ label: 'Dmg', value: item.damage });
    fields.push({ label: 'Delay', value: item.delay });
    const ratio = itemRatio(item);
    if (ratio != null) fields.push({ label: 'Ratio', value: ratio.toFixed(2) });
    if (item.skill) fields.push({ label: 'Skill', value: item.skill });
  }
  if (item.capacity != null) {
    fields.push({ label: 'Capacity', value: item.capacity });
    fields.push({ label: 'Max size', value: item.maxSize });
  }
  if (item.weight != null) fields.push({ label: 'Weight', value: item.weight });
  if (item.size) fields.push({ label: 'Size', value: item.size });

  const chips = statEntries(item)
    .map(e => `<span class="item-card-chip">${e.label} <span class="item-card-chip-value">${e.value}</span></span>`)
    .join('');

  const flavor = [item.effect, item.description].filter(Boolean);

  return `
    <div class="item-card">
      <div class="item-card-header">
        <div class="item-card-icon">${iconHtml}</div>
        <div class="item-card-titles">
          <div class="item-card-name">${escapeAttr(item.name)}</div>
          <div class="item-card-category">${escapeAttr(categoryLabel)}</div>
          ${formatLastUpdated(item.lastUpdated)}
        </div>
        ${badges ? `<div class="item-card-badges">${badges}</div>` : ''}
      </div>
      <div class="item-card-body">
        ${item.needsInfo ? `<div class="item-card-section item-card-needs-info">This item needs more info &middot; confirmed to exist, but a full in-game card hasn't been captured yet. <a href="#submit">Submit a screenshot</a> to help fill it in!</div>` : ''}
        <div class="item-card-grid">
          ${fields.map(f => `<div class="item-card-field"><span class="item-card-field-label">${f.label}</span><span>${f.value}</span></div>`).join('')}
        </div>
        ${chips ? `<div class="item-card-chips">${chips}</div>` : ''}
        ${flavor.length ? `<div class="item-card-section item-card-section-flavor">${flavor.map(escapeAttr).join('<br><br>')}</div>` : ''}
        ${item.readText ? `<div class="item-card-section item-card-section-note">Note text &middot; ${escapeAttr(item.readText).replace(/\n/g, '<br>')}</div>` : ''}
        ${(item.classes || item.race) ? `
        <div class="item-card-section">
          Class: ${escapeAttr(formatList(item.classes))}<br>
          Race: ${escapeAttr(formatList(item.race))}
        </div>` : ''}
        <div class="item-card-section${item.foundAt ? '' : ' item-card-muted'}">
          Found at &middot; ${item.foundAt ? escapeAttr(item.foundAt) : 'not yet known'}
        </div>
        ${opts.interactive ? `<div class="item-card-section item-card-suggest">Wrong or missing info? <a href="#" class="item-suggest-link" data-name="${escapeAttr(item.name)}">Click here</a> to let us know.</div>` : ''}
        ${opts.isTooltip ? '<p class="item-card-tooltip-hint">Click for more info</p>' : ''}
      </div>
    </div>
  `;
}

// A single floating preview card, shared by every hoverable name on the
// site (item rows, recipe names, recipe components), positioned in the
// viewport on hover so it's never clipped by a scroll container. Looks up
// the full item by name and renders its card fresh on every hover rather
// than caching anything, since items.json is the only source of truth here.
// Site-wide "Show item cards" preference (2026-07-20, user's own request) —
// a single localStorage-backed on/off switch (default on) for whether
// hovering an item name pops up its card preview (#item-tooltip). Toggling
// it off doesn't remove the item's own hover styling/cursor or disable
// clicking through to the full item viewer (that's a deliberate action, not
// an incidental hover) — it only silences the automatic popup for people who
// find it distracting while scanning a long table/grid quickly. One shared
// setting, not per-page, so a toggle switch dropped into any toolbar
// (Item Database, Crafting/Gathering recipes, Gathering nodes, Monsters)
// reads/writes the same value — see showCardsToggleHTML/setupShowCardsToggle.
const SHOW_ITEM_CARDS_KEY = 'mnmwiki-show-item-cards';

function getShowItemCards() {
  try {
    return localStorage.getItem(SHOW_ITEM_CARDS_KEY) !== '0';
  } catch {
    return true;
  }
}

function setShowItemCards(show) {
  try {
    localStorage.setItem(SHOW_ITEM_CARDS_KEY, show ? '1' : '0');
  } catch {
    // Storage unavailable — the toggle just won't persist across page loads.
  }
}

// Markup for the toggle switch itself — same visual language as
// .needsinfo-toggle (checkbox + pill slider) but in the site's normal accent
// color rather than that toggle's red, since this isn't a warning state.
// `id` must be unique per render (a page can render more than one toolbar
// with this control, e.g. none currently do at once, but ids still need to
// not collide with a previous render left in the DOM momentarily).
function showCardsToggleHTML(id) {
  return `
    <label class="show-cards-toggle" for="${id}">
      <input type="checkbox" id="${id}">
      <span class="show-cards-toggle-slider"></span>
      <span>Show item cards</span>
    </label>
  `;
}

// Wires up one rendered showCardsToggleHTML instance: initializes its
// checked state from the shared setting and persists any change back to it.
// Call once per toolbar that includes the toggle markup.
function setupShowCardsToggle(container, id) {
  const input = container.querySelector(`#${id}`);
  if (!input) return;
  input.checked = getShowItemCards();
  input.addEventListener('change', () => {
    setShowItemCards(input.checked);
    if (!input.checked) {
      const tooltip = document.getElementById('item-tooltip');
      if (tooltip) tooltip.style.display = 'none';
    }
  });
}

function setupItemTooltip(container) {
  let tooltip = document.getElementById('item-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'item-tooltip';
    document.body.appendChild(tooltip);
  }

  container.addEventListener('mouseover', e => {
    if (!getShowItemCards()) return;
    const span = e.target.closest('.item-name-hover');
    if (!span) return;
    const item = findItemByName(span.dataset.alt);
    if (!item) return;
    const rect = span.getBoundingClientRect();
    tooltip.innerHTML = renderItemCardHTML(item, { isTooltip: true });
    tooltip.style.display = 'block';

    const left = Math.min(rect.left, window.innerWidth - 336);
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 260 && rect.top > spaceBelow) {
      tooltip.style.top = '';
      tooltip.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
    } else {
      tooltip.style.bottom = '';
      tooltip.style.top = (rect.bottom + 8) + 'px';
    }
    tooltip.style.left = Math.max(left, 8) + 'px';
  });

  container.addEventListener('mouseout', e => {
    const span = e.target.closest('.item-name-hover');
    if (!span) return;
    if (span.contains(e.relatedTarget)) return;
    tooltip.style.display = 'none';
  });
}

// Clicking an item's name in the Item Database table opens the full item
// viewer (see below) — the same card as the hover preview, just bigger and
// with crafting links attached, in a modal instead of a floating tooltip.
function setupItemClickToView(tbody) {
  tbody.addEventListener('click', e => {
    const span = e.target.closest('.item-name-hover');
    if (!span) return;
    const item = findItemByName(span.dataset.alt);
    if (item) openItemViewer(item);
  });
}

// Full item-card viewer. Since the card is rendered from data (not a
// screenshot), it's never too tall to fit — no scroll-within-the-card
// trick needed here, just a simple max-height safety net on the whole
// panel. The close button sits on the overlay itself (like the Maps
// viewer's), since the card no longer has a dedicated header bar to put it in.
function setupItemViewer() {
  if (document.getElementById('item-viewer')) return;

  const viewer = document.createElement('div');
  viewer.id = 'item-viewer';
  viewer.innerHTML = `
    <button id="item-viewer-close" aria-label="Close">&times;</button>
    <div id="item-viewer-panel">
      <div id="item-viewer-card"></div>
      <div id="item-viewer-info"></div>
    </div>
  `;
  document.body.appendChild(viewer);

  viewer.addEventListener('click', e => {
    if (e.target === viewer) {
      closeItemViewer();
      return;
    }
    const link = e.target.closest('.item-viewer-recipe-link');
    if (link) {
      e.preventDefault();
      const recipe = (craftingData || []).find(r => r.name === link.dataset.recipe && r.tradeskill === link.dataset.tradeskill);
      if (recipe) {
        closeItemViewer();
        goToRecipe(recipe);
      }
      return;
    }
    const suggestLink = e.target.closest('.item-suggest-link');
    if (suggestLink) {
      e.preventDefault();
      closeItemViewer();
      goToSubmit({ kind: 'item', name: suggestLink.dataset.name });
    }
  });

  viewer.querySelector('#item-viewer-close').addEventListener('click', closeItemViewer);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeItemViewer();
  });
}

async function openItemViewer(item) {
  await ensureCraftingData();
  setupItemViewer();

  const viewer = document.getElementById('item-viewer');
  viewer.querySelector('#item-viewer-card').innerHTML = renderItemCardHTML(item, { interactive: true });

  const resultRecipe = findRecipeForItem(item.name);
  const usedIn = findRecipesUsingItem(item.name);

  let html = '';
  if (resultRecipe) {
    html += `<p><strong>Crafted via:</strong> <a href="#" class="item-viewer-recipe-link" data-recipe="${escapeAttr(resultRecipe.name)}" data-tradeskill="${escapeAttr(resultRecipe.tradeskill)}">${resultRecipe.name}</a> (${resultRecipe.tradeskill})</p>`;
  }
  if (usedIn.length) {
    html += `<p><strong>Used to craft:</strong></p><ul>${usedIn.map(r =>
      `<li><a href="#" class="item-viewer-recipe-link" data-recipe="${escapeAttr(r.name)}" data-tradeskill="${escapeAttr(r.tradeskill)}">${r.name}</a> (${r.tradeskill})</li>`
    ).join('')}</ul>`;
  }

  const info = viewer.querySelector('#item-viewer-info');
  info.innerHTML = html;
  info.style.display = html ? '' : 'none';

  viewer.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeItemViewer() {
  const viewer = document.getElementById('item-viewer');
  if (!viewer) return;
  viewer.classList.remove('open');
  document.body.style.overflow = '';
}

/* ============================================
   Maps
   Data lives in maps.json (array of {name, slug, image, thumbnail}).
   "image" is the full-size map opened in the zoom/pan viewer;
   "thumbnail" is a small pre-generated JPEG shown in the grid so the
   page doesn't have to download every full-size map just to list them
   (source maps can be tens of MB each). To add a map, add an entry,
   drop the full-size image in images/Maps/, and generate a thumbnail
   (see CLAUDE.md) — no code changes needed.

   Maps sharing a base name (e.g. "Vale of Zintar" / "Vale of Zintar
   (Spawns)") are grouped into a single grid card showing just the first
   one as a thumbnail, with the rest listed as links underneath — see
   groupMapsByArea. Opening any of them lets prev/next buttons in the
   viewer step between the whole group.
   ============================================ */

// Maps whose names share the same base (e.g. "Vale of Zintar" and "Vale of
// Zintar (Spawns)", the "(Variant)" naming convention documented in
// CLAUDE.md) are the same in-game area rendered more than once. Strip a
// trailing "(...)" to get that shared base name.
function mapBaseName(name) {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

// The bit inside a variant's trailing parentheses (e.g. "Isometric",
// "Spawns"), used as the short link label under a grouped card's thumbnail.
function mapVariantLabel(name) {
  const m = name.match(/\(([^)]*)\)\s*$/);
  return m ? m[1] : name;
}

// Groups maps by base name, keeping each group's own entries in maps.json's
// original order (so "the first one" — the primary thumbnail — means the
// first one added, not an alphabetical pick), then sorts the groups
// themselves alphabetically for the grid.
function groupMapsByArea(maps) {
  const order = [];
  const byBase = new Map();
  maps.forEach(m => {
    const base = mapBaseName(m.name);
    if (!byBase.has(base)) {
      byBase.set(base, []);
      order.push(base);
    }
    byBase.get(base).push(m);
  });
  return order
    .map(base => ({ base, entries: byBase.get(base) }))
    .sort((a, b) => a.base.localeCompare(b.base));
}

async function renderMapsPage(container) {
  await ensureMapsData();

  const groups = groupMapsByArea(mapsData);

  if (!groups.length) {
    pendingMapOpen = null;
    container.innerHTML = '<h1>Maps</h1><p>No maps yet.</p>';
    return;
  }

  container.innerHTML = `
    <h1>Maps</h1>
    <p>Click a map to view it full size. Scroll to zoom, click and drag to pan.</p>
    <div class="maps-grid">
      ${groups.map((g, gi) => {
        const primary = g.entries[0];
        const variants = g.entries.slice(1);
        return `
        <div class="map-card" data-group-index="${gi}">
          <img class="map-card-thumb" src="${primary.thumbnail || primary.image}" alt="${g.base}" loading="lazy">
          <div class="map-card-name">${g.base}</div>
          ${variants.length ? `
            <div class="map-card-variants">
              ${variants.map((v, vi) => `<a href="#" class="map-card-variant-link" data-group-index="${gi}" data-variant-index="${vi + 1}">${mapVariantLabel(v.name)}</a>`).join('')}
            </div>
          ` : ''}
        </div>`;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('.map-card').forEach(card => {
    const gi = Number(card.dataset.groupIndex);
    card.addEventListener('click', () => openMapViewer(groups[gi].entries, 0));
  });

  container.querySelectorAll('.map-card-variant-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const gi = Number(link.dataset.groupIndex);
      const vi = Number(link.dataset.variantIndex);
      openMapViewer(groups[gi].entries, vi);
    });
  });

  // Landed here via goToMap (e.g. a monster search result's clickable zone
  // link) — jump straight into that area's viewer instead of leaving the
  // visitor on the plain grid. Matched by base name (case-insensitive), same
  // name a monster's own `maps` entries are expected to match.
  if (pendingMapOpen) {
    const name = pendingMapOpen;
    pendingMapOpen = null;
    const group = groups.find(g => g.base.toLowerCase() === name.toLowerCase());
    if (group) openMapViewer(group.entries, 0);
  }
}

// Full-size map viewer with scroll-to-zoom and click-and-drag panning.
// A single overlay is created once and reused for every map. Source map
// images vary wildly in native pixel size (some are 9000px+ wide), so the
// zoomed-out floor and the starting view are computed per image instead of
// being fixed values — otherwise a large map would open already too
// "zoomed in" with no way to scroll out far enough to see the whole thing.
let mapViewerScale = 1;
let mapViewerMinScale = 0.1;
let mapViewerMaxScale = 6;
let mapViewerX = 0;
let mapViewerY = 0;
let mapViewerDragging = false;
let mapViewerMoved = false;
let mapViewerStartX = 0;
let mapViewerStartY = 0;

// The group of maps (same area, per groupMapsByArea) currently open in the
// viewer, and which one of them is showing — lets the prev/next buttons
// step through other renderings of the same area.
let mapViewerGroup = [];
let mapViewerIndex = 0;

// The scale at which the image's natural size exactly fits inside the
// viewer (minus a small margin) — used as both the initial view and the
// floor for zooming out, so every map opens fully visible and can always
// be zoomed back out to fully visible.
function computeMapViewerFitScale(img) {
  const naturalW = img.naturalWidth || 1;
  const naturalH = img.naturalHeight || 1;
  const availW = window.innerWidth * 0.94;
  const availH = window.innerHeight * 0.9;
  return Math.min(availW / naturalW, availH / naturalH);
}

function applyMapViewerTransform() {
  const img = document.getElementById('map-viewer-img');
  img.style.transform = `translate(${mapViewerX}px, ${mapViewerY}px) scale(${mapViewerScale})`;
}

function setupMapViewer() {
  if (document.getElementById('map-viewer')) return;

  const viewer = document.createElement('div');
  viewer.id = 'map-viewer';
  viewer.innerHTML = `
    <button id="map-viewer-close" aria-label="Close">&times;</button>
    <button id="map-viewer-prev" aria-label="Previous map of this area" title="Previous map of this area">
      <svg class="map-viewer-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 L8 12 L15 19"/></svg>
    </button>
    <img id="map-viewer-img" alt="">
    <button id="map-viewer-next" aria-label="Next map of this area" title="Next map of this area">
      <svg class="map-viewer-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 L16 12 L9 19"/></svg>
    </button>
    <div id="map-viewer-hint">Scroll to zoom &middot; drag to pan</div>
  `;
  document.body.appendChild(viewer);

  const img = viewer.querySelector('#map-viewer-img');

  viewer.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    mapViewerScale = Math.min(mapViewerMaxScale, Math.max(mapViewerMinScale, mapViewerScale * factor));
    applyMapViewerTransform();
  }, { passive: false });

  img.addEventListener('mousedown', e => {
    e.preventDefault();
    mapViewerDragging = true;
    mapViewerMoved = false;
    mapViewerStartX = e.clientX - mapViewerX;
    mapViewerStartY = e.clientY - mapViewerY;
    img.classList.add('dragging');
  });

  window.addEventListener('mousemove', e => {
    if (!mapViewerDragging) return;
    mapViewerMoved = true;
    mapViewerX = e.clientX - mapViewerStartX;
    mapViewerY = e.clientY - mapViewerStartY;
    applyMapViewerTransform();
  });

  window.addEventListener('mouseup', () => {
    mapViewerDragging = false;
    img.classList.remove('dragging');
  });

  // Click outside the image closes the viewer, but not right after a drag.
  viewer.addEventListener('click', e => {
    if (mapViewerMoved) { mapViewerMoved = false; return; }
    if (e.target === viewer) closeMapViewer();
  });

  viewer.querySelector('#map-viewer-close').addEventListener('click', closeMapViewer);
  viewer.querySelector('#map-viewer-prev').addEventListener('click', e => {
    e.stopPropagation();
    navigateMapViewer(-1);
  });
  viewer.querySelector('#map-viewer-next').addEventListener('click', e => {
    e.stopPropagation();
    navigateMapViewer(1);
  });

  document.addEventListener('keydown', e => {
    if (!viewer.classList.contains('open')) return;
    if (e.key === 'Escape') closeMapViewer();
    else if (e.key === 'ArrowLeft') navigateMapViewer(-1);
    else if (e.key === 'ArrowRight') navigateMapViewer(1);
  });
}

// Loads one map entry into the already-open viewer — shared by the initial
// open and by prev/next navigation between maps of the same area.
function showMapViewerEntry(entry) {
  const img = document.getElementById('map-viewer-img');
  img.alt = entry.name;

  const fitToViewer = () => {
    const fitScale = computeMapViewerFitScale(img);
    mapViewerMinScale = fitScale;
    mapViewerMaxScale = Math.max(6, fitScale * 6);
    mapViewerScale = fitScale;
    mapViewerX = 0;
    mapViewerY = 0;
    applyMapViewerTransform();
  };

  const showAndFit = src => {
    img.onload = fitToViewer;
    img.src = src;
    // If this exact image is already loaded/cached, "load" won't fire again — handle directly.
    if (img.complete && img.naturalWidth) fitToViewer();
  };

  // Full-size maps can be tens of MB, so <img> keeps showing whatever was
  // previously open until the new one finishes downloading. Show the
  // (already-cached) small thumbnail immediately so the correct map
  // appears right away, then swap in the full-quality image once it's
  // done loading in the background.
  const thumbSrc = entry.thumbnail;
  const fullSrc = entry.image;
  const hasThumb = thumbSrc && thumbSrc !== fullSrc;
  showAndFit(hasThumb ? thumbSrc : fullSrc);

  if (hasThumb) {
    const fullImg = new Image();
    fullImg.onload = () => showAndFit(fullSrc);
    fullImg.src = fullSrc;
  }
}

// Only shown when the current map has siblings (other renderings of the
// same area, per groupMapsByArea) to step between. Only called once per
// viewer-open (from openMapViewer) since mapViewerGroup doesn't change while
// stepping between siblings with prev/next — so this is also the one place
// that (re)starts the buttons' own blink-then-settle animation, once per
// fresh map opened rather than on every arrow click. This used to be a
// separate hint pill at the top of the screen (2026-07-17 first pass), but
// the user found it "not very effective" up there — the arrows themselves
// blinking draws the eye straight to the thing you're supposed to click,
// so the standalone hint was dropped in favor of this (2026-07-17, second
// pass).
function updateMapViewerNav() {
  const viewer = document.getElementById('map-viewer');
  const showNav = mapViewerGroup.length > 1;
  const prev = viewer.querySelector('#map-viewer-prev');
  const next = viewer.querySelector('#map-viewer-next');
  prev.style.display = showNav ? 'flex' : 'none';
  next.style.display = showNav ? 'flex' : 'none';

  if (showNav) {
    // Restart the CSS animation from scratch even if it's already run once
    // for a previous map this session — removing the class, forcing a
    // reflow, then re-adding it is the standard way to replay a CSS
    // animation that isn't already looping.
    [prev, next].forEach(btn => {
      btn.classList.remove('map-viewer-nav-btn-play');
      void btn.offsetWidth;
      btn.classList.add('map-viewer-nav-btn-play');
    });
  }
}

function navigateMapViewer(delta) {
  if (mapViewerGroup.length < 2) return;
  mapViewerIndex = (mapViewerIndex + delta + mapViewerGroup.length) % mapViewerGroup.length;
  showMapViewerEntry(mapViewerGroup[mapViewerIndex]);
}

function openMapViewer(group, index) {
  setupMapViewer();
  mapViewerGroup = group;
  mapViewerIndex = index;
  const viewer = document.getElementById('map-viewer');
  viewer.classList.add('open');
  document.body.style.overflow = 'hidden';
  updateMapViewerNav();
  showMapViewerEntry(mapViewerGroup[mapViewerIndex]);
}

function closeMapViewer() {
  const viewer = document.getElementById('map-viewer');
  if (!viewer) return;
  viewer.classList.remove('open');
  document.body.style.overflow = '';
}

/* ============================================
   Crafting
   Categories live in tradeskills.json (a fixed list —
   edit it directly to rename/add/remove a tradeskill).
   Recipes live in crafting.json, each tagged with a
   "tradeskill" matching one of those category names.
   Recipes render as cards via renderRecipeCardHTML, the
   same card system as the Item Database (see above) —
   see CLAUDE.md for the full schema.
   ============================================ */

async function renderCraftingPage(container) {
  await ensureCraftingData();

  // Landed here from a header search result for a specific recipe — jump
  // straight to that tradeskill instead of the category grid. Gathering
  // tradeskills live on their own page now (see renderGatheringPage) and
  // never reach here.
  if (pendingCraftingTradeskill) {
    const target = pendingCraftingTradeskill;
    pendingCraftingTradeskill = null;
    await renderCraftingRecipes(container, target);
    return;
  }

  renderCraftingCategories(container);
}

// Whether a gathering-category tradeskill should be treated as node-based
// (renderGatheringNodes' table) or recipe-based (renderGatheringRecipes,
// same view the Crafting grid's tradeskills use) — see tradeskillGridHTML
// and renderGatheringCategories/renderGatheringPage, which all share this
// one check rather than hardcoding a tradeskill name. Disenchanting sits in
// Gathering's grid (2026-07-19, user's own call) while still being an
// ordinary recipe-based tradeskill under the hood, so it needs the "recipe"
// treatment even though every other card there is node-based — detected
// here by it actually having crafting.json entries. A tradeskill with
// neither nodes nor recipes yet (e.g. Foraging, moved to Gathering
// 2026-07-19 with no data of either kind recorded so far) defaults to
// node-based, since that's the far more common shape for something living
// on the Gathering page — this only flips to recipe-based once real
// crafting.json entries for it actually exist, same as Disenchanting.
function gatheringTradeskillIsNodeBased(name) {
  if (gatheringData.some(n => n.tradeskill === name)) return true;
  return craftingData.filter(r => r.tradeskill === name).length === 0;
}

// Shared by the Crafting and Gathering category grids (split into separate
// top-level pages on 2026-07-13, Gathering placed above Crafting in the
// sidebar) — same card markup either way, just a different count label and
// click target depending on whether a given card is node-based.
// `isGathering` is the page-level default (Gathering's grid passes true,
// Crafting's passes false); a card's own node-based-ness on the Gathering
// grid is further refined per-card by gatheringTradeskillIsNodeBased (see
// there) rather than hardcoding any tradeskill name here.
function tradeskillGridHTML(list, isGathering) {
  return `
    <div class="craft-grid">
      ${list.map(ts => {
        const isNodeBased = isGathering && gatheringTradeskillIsNodeBased(ts.name);
        const count = isNodeBased
          ? gatheringData.filter(n => n.tradeskill === ts.name).length
          : craftingData.filter(r => r.tradeskill === ts.name).length;
        const icon = TRADESKILL_ICON[ts.name] || 'material';
        return `
          <div class="craft-card" data-tradeskill="${escapeAttr(ts.name)}" data-node-based="${isNodeBased}">
            <div class="craft-card-icon">${svgIcon(icon)}</div>
            <div class="craft-card-body">
              <div class="craft-card-name">
                ${ts.name}
                ${ts.status === 'planned' ? '<span class="badge-planned">Planned</span>' : ''}
              </div>
              <div class="craft-card-count">${count} ${isNodeBased ? 'node' : 'recipe'}${count === 1 ? '' : 's'}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Ordinary crafted-goods tradeskills only — see renderGatheringCategories for
// the resource-node tradeskills (Mining, Lumberjacking, Herbalism, Fishing),
// which moved to their own Gathering page on 2026-07-13 (Disenchanting
// joined them there 2026-07-19, despite being recipe-based, at the user's
// own request — see renderGatheringCategories). Enchanting briefly had its
// own top-level page too (2026-07-17–2026-07-19) before being folded back
// into this grid as an ordinary tradeskill card.
function renderCraftingCategories(container) {
  const crafted = tradeskillsData.filter(ts => ts.category !== 'gathering').sort((a, b) => a.name.localeCompare(b.name));

  container.innerHTML = `
    <h1>Crafting</h1>
    <p>Browse recipes by tradeskill, or search below to jump straight to a specific recipe.
    "Planned" tradeskills exist in the game's design but aren't usable yet.</p>
    <div class="items-quick-search">
      <div class="items-quick-search-row">
        <input type="search" id="craft-quick-search-box" class="items-search items-quick-search-box" placeholder="Search all recipes by name or tradeskill..." autocomplete="off">
        <button type="button" class="items-clear-btn search-clear-btn" data-clear-target="craft-quick-search-box">Clear</button>
      </div>
      <div id="craft-quick-search-results" class="items-quick-search-results"></div>
    </div>
    ${tradeskillGridHTML(crafted, false)}
  `;

  container.querySelectorAll('.craft-card').forEach(card => {
    card.addEventListener('click', () => renderCraftingRecipes(container, card.dataset.tradeskill));
  });

  // A shortcut past the tradeskill grid for anyone who already knows which
  // recipe they want: scoped to crafting.json only, clicking a result reuses
  // goToRecipe for the same tradeskill-jump + card-flash behavior as a
  // header search result.
  const quickSearchBox = container.querySelector('#craft-quick-search-box');
  const quickSearchResults = container.querySelector('#craft-quick-search-results');

  quickSearchBox.addEventListener('input', () => {
    const query = quickSearchBox.value.toLowerCase().trim();
    if (!query) {
      quickSearchResults.classList.remove('open');
      quickSearchResults.innerHTML = '';
      return;
    }

    const matches = craftingData
      .filter(r => `${r.name} ${r.tradeskill}`.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 20);

    quickSearchResults.innerHTML = matches.length
      ? matches.map(m => `
          <a href="#" class="search-result-link items-quick-search-result" data-slug="${escapeAttr(m.slug)}">
            ${escapeAttr(m.name)}
            <span class="items-quick-search-type">${escapeAttr(m.tradeskill)}</span>
          </a>
        `).join('')
      : '<p class="search-results-empty">No recipes match.</p>';
    quickSearchResults.classList.add('open');

    quickSearchResults.querySelectorAll('.items-quick-search-result').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const recipe = craftingData.find(r => r.slug === link.dataset.slug);
        if (recipe) goToRecipe(recipe);
      });
    });
  });
}

async function renderGatheringPage(container) {
  await ensureCraftingData();

  // Landed here from a header search result for a specific tradeskill —
  // jump straight to it instead of the category grid, same idea as
  // pendingCraftingTradeskill on the Crafting page. Not every tradeskill on
  // this page is node-based (see gatheringTradeskillIsNodeBased) — Disenchanting
  // is recipe-based under the hood, so it needs the recipe view rather than
  // renderGatheringNodes's table.
  if (pendingGatheringTradeskill) {
    const target = pendingGatheringTradeskill;
    pendingGatheringTradeskill = null;
    if (gatheringTradeskillIsNodeBased(target)) {
      renderGatheringNodes(container, target);
    } else {
      await renderGatheringRecipes(container, target);
    }
    return;
  }

  renderGatheringCategories(container);
}

// Gathering tradeskills — Mining, Lumberjacking, Herbalism, Fishing — whose
// skill nodes have no components/crafted result at all, just a min skill to
// attempt, a trivial skill, and where to find them (see renderGatheringNodes,
// gathering-nodes.json). Split out from the Crafting page into its own
// top-level page on 2026-07-13, placed above Crafting in the sidebar, since
// interacting with a world resource node is a different activity from
// combining components into a crafted result even though both are tracked
// under a "tradeskill" in-game.
//
// Disenchanting joined this grid too (2026-07-19, user's own call), despite
// being recipe-based rather than node-based under the hood — it still
// consumes a specific item to produce something (much closer to gathering's
// "get material from world state" flavor than a typical multi-component
// recipe), so it reads as a better fit here than on the Crafting page. Its
// card is still built from tradeskillGridHTML's generic node-based check
// (see there) and routed to the recipe view by both the click handler below
// and renderGatheringPage's own pendingGatheringTradeskill handling above.
function renderGatheringCategories(container) {
  const gathering = tradeskillsData.filter(ts => ts.category === 'gathering').sort((a, b) => a.name.localeCompare(b.name));

  container.innerHTML = `
    <h1>Gathering</h1>
    <p>Resource nodes you interact with directly in the world instead of crafting from components —
    each one has a minimum skill to attempt it and a trivial skill where it stops giving skill-ups.
    Search below to jump straight to a specific node.</p>
    <div class="items-quick-search">
      <div class="items-quick-search-row">
        <input type="search" id="gathering-quick-search-box" class="items-search items-quick-search-box" placeholder="Search all gathering nodes by name or tradeskill..." autocomplete="off">
        <button type="button" class="items-clear-btn search-clear-btn" data-clear-target="gathering-quick-search-box">Clear</button>
      </div>
      <div id="gathering-quick-search-results" class="items-quick-search-results"></div>
    </div>
    ${tradeskillGridHTML(gathering, true)}
  `;

  container.querySelectorAll('.craft-card').forEach(card => {
    card.addEventListener('click', () => {
      if (card.dataset.nodeBased === 'true') renderGatheringNodes(container, card.dataset.tradeskill);
      else renderGatheringRecipes(container, card.dataset.tradeskill);
    });
  });

  const quickSearchBox = container.querySelector('#gathering-quick-search-box');
  const quickSearchResults = container.querySelector('#gathering-quick-search-results');

  quickSearchBox.addEventListener('input', () => {
    const query = quickSearchBox.value.toLowerCase().trim();
    if (!query) {
      quickSearchResults.classList.remove('open');
      quickSearchResults.innerHTML = '';
      return;
    }

    const matches = gatheringData
      .filter(n => `${n.name} ${n.tradeskill}`.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 20);

    quickSearchResults.innerHTML = matches.length
      ? matches.map(m => `
          <a href="#" class="search-result-link items-quick-search-result" data-tradeskill="${escapeAttr(m.tradeskill)}">
            ${escapeAttr(m.name)}
            <span class="items-quick-search-type">${escapeAttr(m.tradeskill)}</span>
          </a>
        `).join('')
      : '<p class="search-results-empty">No gathering nodes match.</p>';
    quickSearchResults.classList.add('open');

    quickSearchResults.querySelectorAll('.items-quick-search-result').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        renderGatheringNodes(container, link.dataset.tradeskill);
      });
    });
  });
}

// Disenchanting recipes are structurally backwards from every other
// tradeskill: `components` holds the single MAGIC item fed into the cube
// (the thing a reader is actually looking up), while `name` holds the
// resulting dust output — so the normal card layout (name at top, inputs at
// the bottom under "Components:") reads backwards for this one tradeskill.
// This flips it (user's own call, 2026-07-17): the source item leads the
// card, with its own thumbnail, and the dust results it produces are listed
// at the bottom instead. A source item's thumbnail is `findItemByName(...).
// image` when that item has a card yet, or a dashed placeholder otherwise —
// most of these source items don't have a screenshot yet, so the placeholder
// is the common case, not an error (same convention as
// dustTierThumbHTML/.dust-tier-placeholder for Disenchanting's own tier
// chart, just sized for a card header instead of a small chart thumbnail).
function renderDisenchantCardHTML(recipe) {
  const sourceComponent = (recipe.components && recipe.components[0]) || null;
  const sourceName = sourceComponent ? sourceComponent.item : recipe.name;
  const sourceItem = sourceComponent ? findItemByName(sourceComponent.item) : null;

  const thumbHtml = sourceItem && sourceItem.image
    ? `<img src="${escapeAttr(sourceItem.image)}" alt="${escapeAttr(sourceName)}">`
    : `<div class="item-card-icon-thumb-placeholder">No image yet</div>`;

  const nameHtml = sourceItem
    ? `<a href="#" class="craft-component-link item-name-hover" data-alt="${escapeAttr(sourceItem.name)}" data-recipe="${escapeAttr(recipe.name)}" data-item="${escapeAttr(sourceItem.name)}">${escapeAttr(sourceName)}</a>`
    : escapeAttr(sourceName);

  const fields = [];
  const skillInfo = estimateRecipeSkill(recipe);
  if (skillInfo) {
    fields.push({ label: 'Skill', value: skillInfo.estimated ? `~${skillInfo.skill} (estimated)` : skillInfo.skill });
  }
  if (sourceComponent && sourceComponent.quantity !== 1) {
    fields.push({ label: 'Quantity', value: `${sourceComponent.quantity}x` });
  }

  // The recipe's own `name` (e.g. "Enchanted Powder (x1-5) & Mote of Magic
  // (x0-2)") names the dust tier's two possible outputs — same parsing as
  // disenchantingDustTiers(), just kept local here since this also needs
  // each piece's quantity range (the tier chart deliberately doesn't, see
  // CLAUDE.md). Falls back to the whole name as one unlabeled result if it
  // doesn't match that two-part shape.
  const resultMatch = recipe.name.match(/^(.*?)\s*\(x([\d-]+)\)\s*&\s*(.*?)\s*\(x([\d-]+)\)$/);
  const results = resultMatch
    ? [{ name: resultMatch[1].trim(), range: resultMatch[2] }, { name: resultMatch[3].trim(), range: resultMatch[4] }]
    : [{ name: recipe.name, range: null }];

  const resultsHtml = `
    <div class="item-card-section">
      Produces:
      <ul class="item-card-components">
        ${results.map(r => {
          const m = findItemByName(r.name);
          const label = r.range ? `${escapeAttr(r.name)} &times;${escapeAttr(r.range)}` : escapeAttr(r.name);
          return m
            ? `<li><a href="#" class="craft-result-link item-name-hover" data-alt="${escapeAttr(m.name)}" data-recipe="${escapeAttr(r.name)}">${label}</a></li>`
            : `<li>${label}</li>`;
        }).join('')}
      </ul>
    </div>
  `;

  return `
    <div class="item-card item-card-recipe" data-recipe-slug="${escapeAttr(recipe.slug)}">
      <div class="item-card-header">
        <div class="item-card-icon item-card-icon-recipe item-card-icon-thumb">${thumbHtml}</div>
        <div class="item-card-titles">
          <div class="item-card-name item-card-name-recipe">${nameHtml}</div>
          ${formatLastUpdated(recipe.lastUpdated)}
        </div>
        <div class="item-card-badges"><span class="badge-tag badge-tag-craft">${escapeAttr(recipe.tradeskill)}</span>${recipe.needsInfo ? '<span class="badge-tag badge-needs-info">NEEDS INFO</span>' : ''}</div>
      </div>
      <div class="item-card-body">
        ${recipe.needsInfo ? `<div class="item-card-section item-card-needs-info">This recipe needs more info &middot; confirmed to exist, but a full recipe card hasn't been captured yet. <a href="#submit">Submit a screenshot</a> to help fill it in!</div>` : ''}
        ${fields.length ? `<div class="item-card-grid">${fields.map(f => `<div class="item-card-field"><span class="item-card-field-label">${f.label}</span><span>${f.value}</span></div>`).join('')}</div>` : ''}
        ${resultsHtml}
        ${recipe.note ? `<div class="item-card-section"><em>${escapeAttr(recipe.note)}</em></div>` : ''}
      </div>
    </div>
  `;
}

// Renders a recipe's card — same structural language as renderItemCardHTML
// (icon square, header badges, body sections) but in the teal "craft" accent
// with the tradeskill name as its badge, so a recipe is never mistaken for
// an item card at a glance even though both use the same card system.
// The recipe's own name links to the Item Database (like a component does)
// if a matching item exists there yet, with a hover preview of that item's
// own card — the recipe card itself only shows what the recipe card shows
// (weight/size/components), not the crafted result's full stats.
// Disenchanting is the one exception — see renderDisenchantCardHTML — since
// its "components"/"name" are the reverse of what every other recipe means
// by those fields (source item vs. crafted result).
function renderRecipeCardHTML(recipe) {
  if (recipe.tradeskill === 'Disenchanting') return renderDisenchantCardHTML(recipe);

  const matched = findItemByName(recipe.name);
  const nameHtml = matched
    ? `<a href="#" class="craft-result-link item-name-hover" data-alt="${escapeAttr(matched.name)}" data-recipe="${escapeAttr(recipe.name)}">${escapeAttr(recipe.name)}</a>`
    : escapeAttr(recipe.name);

  const fields = [];
  // Confirmed recipeSkillLevel shows as a plain number; an interpolated
  // estimate (see estimateRecipeSkill) is explicitly labeled so it's never
  // mistaken for a confirmed value.
  const skillInfo = estimateRecipeSkill(recipe);
  if (skillInfo) {
    fields.push({ label: 'Skill', value: skillInfo.estimated ? `~${skillInfo.skill} (estimated)` : skillInfo.skill });
  }
  if (recipe.weight != null) {
    fields.push({ label: 'Weight', value: recipe.weight });
    fields.push({ label: 'Size', value: recipe.size });
  }
  // Bag/container-crafting recipes (e.g. Cloth Satchel) show the crafted
  // result's capacity the same way a Container item does.
  if (recipe.capacity != null) {
    fields.push({ label: 'Capacity', value: recipe.capacity });
    fields.push({ label: 'Max size', value: recipe.maxSize });
  }
  // Most recipes produce exactly one of `name` — Tanning is the first
  // exception (a single pelt processed in a vat yields a stack of scrap
  // material), so only show a "Yields" field when it's set instead of
  // assuming every recipe's quantity is 1.
  if (recipe.resultQuantity != null) {
    fields.push({ label: 'Yields', value: `${recipe.resultQuantity}x` });
  }

  const componentsHtml = (recipe.components && recipe.components.length) ? `
    <div class="item-card-section">
      Components:
      <ul class="item-card-components">
        ${recipe.components.map(c => {
          const m = findItemByName(c.item);
          const label = `${c.quantity}&times; ${escapeAttr(c.item)}`;
          return m
            ? `<li><a href="#" class="craft-component-link item-name-hover" data-alt="${escapeAttr(m.name)}" data-recipe="${escapeAttr(recipe.name)}" data-item="${escapeAttr(m.name)}">${label}</a></li>`
            : `<li>${label}</li>`;
        }).join('')}
      </ul>
    </div>
  ` : '';

  // Alchemy consumables (potions/serums/tinctures) are the first recipes
  // whose result has its own flavor text and use-effect, same idea as an
  // item's description/effect — recipes don't have a matching items.json
  // entry to show that on, so it lives on the recipe card itself instead.
  const flavor = [recipe.effect, recipe.description].filter(Boolean);

  return `
    <div class="item-card item-card-recipe" data-recipe-slug="${escapeAttr(recipe.slug)}">
      <div class="item-card-header">
        <div class="item-card-icon item-card-icon-recipe">${TRADESKILL_ICON[recipe.tradeskill] ? svgIcon(TRADESKILL_ICON[recipe.tradeskill]) : (recipe.tradeskill || '?').charAt(0)}</div>
        <div class="item-card-titles">
          <div class="item-card-name item-card-name-recipe">${nameHtml}</div>
          ${formatLastUpdated(recipe.lastUpdated)}
        </div>
        <div class="item-card-badges"><span class="badge-tag badge-tag-craft">${escapeAttr(recipe.tradeskill)}</span>${recipe.needsInfo ? '<span class="badge-tag badge-needs-info">NEEDS INFO</span>' : ''}</div>
      </div>
      <div class="item-card-body">
        ${recipe.needsInfo ? `<div class="item-card-section item-card-needs-info">This recipe needs more info &middot; confirmed to exist, but a full recipe card hasn't been captured yet. <a href="#submit">Submit a screenshot</a> to help fill it in!</div>` : ''}
        ${fields.length ? `<div class="item-card-grid">${fields.map(f => `<div class="item-card-field"><span class="item-card-field-label">${f.label}</span><span>${f.value}</span></div>`).join('')}</div>` : ''}
        ${flavor.length ? `<div class="item-card-section item-card-section-flavor">${flavor.map(escapeAttr).join('<br><br>')}</div>` : ''}
        ${componentsHtml}
        ${recipe.note ? `<div class="item-card-section"><em>${escapeAttr(recipe.note)}</em></div>` : ''}
      </div>
    </div>
  `;
}

// Gemstone reference tables (gemstones.json) are general Jewelcrafting
// knowledge — which gem gives which stat bonus when socketed — not tied to
// any one recipe, so they render as their own section above the recipe grid
// rather than living inside a recipe card. Extend to other tradeskills the
// same way if a similar reference chart ever comes in for one of them.
function renderGemstoneTablesHTML(tradeskillName) {
  if (tradeskillName !== 'Jewelcrafting' || !gemstonesData) return '';
  const categories = [...new Set(gemstonesData.map(g => g.category))];
  return `
    <div class="gem-reference">
      <h2>Gemstone Stat Bonuses</h2>
      <p class="gem-reference-note">Which stats each gem grants when socketed into a ring or earring — general
      Jewelcrafting knowledge, not tied to any specific recipe below.</p>
      <div class="gem-reference-tables">
        ${categories.map(cat => `
          <table class="gem-table">
            <thead><tr><th colspan="2">${escapeAttr(cat)}</th></tr></thead>
            <tbody>
              ${gemstonesData.filter(g => g.category === cat).map(g => `
                <tr>
                  <td>${escapeAttr(g.gem)}${g.wyrmsbaneTurnIn ? ' *' : ''}</td>
                  <td>${g.stats.join(', ')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `).join('')}
      </div>
      ${gemstonesData.some(g => g.wyrmsbaneTurnIn) ? '<p class="gem-reference-footnote">* = Wyrmsbane Turn-In Gem</p>' : ''}
    </div>
  `;
}

// Matched against the local search box below — recipe name plus every
// ingredient/tool in its components list (both are just entries in the same
// `components` array; the schema doesn't distinguish a "tool" from a
// consumed material), and the result's flavor text where it has one.
function recipeSearchHaystack(recipe) {
  return [
    recipe.name,
    recipe.effect || '',
    recipe.description || '',
    (recipe.components || []).map(c => c.item).join(' ')
  ].join(' ').toLowerCase();
}

// Estimates a recipe's real skill requirement from whatever's already known,
// so the recipe grid can sort by skill required (matching the in-game
// crafting window's own order) even for recipes whose exact number was never
// confirmed. Priority: a confirmed `recipeSkillLevel` wins outright (not an
// estimate). Otherwise, if the recipe has a `listOrder` and the same
// tradeskill has at least one other recipe with *both* `listOrder` and
// `recipeSkillLevel` (an "anchor"), linearly interpolate a skill number from
// the nearest anchor(s) surrounding its listOrder position — flat-extending
// from a single anchor if only one side is available. With no listOrder, or
// no anchors at all in that tradeskill, there's nothing to interpolate from
// and this returns null (that recipe keeps today's listOrder/alphabetical
// fallback with no fabricated number). Purely a render-time computation,
// never written back into crafting.json — cached per tradeskill since the
// underlying data doesn't change during a session. 2026-07-15.
const recipeSkillEstimateCache = new Map();
function estimateRecipeSkill(recipe) {
  if (!recipeSkillEstimateCache.has(recipe.tradeskill)) {
    const siblings = craftingData.filter(r => r.tradeskill === recipe.tradeskill);
    const anchors = siblings
      .filter(r => r.listOrder != null && r.recipeSkillLevel != null)
      .map(r => ({ order: r.listOrder, skill: r.recipeSkillLevel }))
      .sort((a, b) => a.order - b.order);

    const map = new Map();
    siblings.forEach(r => {
      if (r.recipeSkillLevel != null) {
        map.set(r, { skill: r.recipeSkillLevel, estimated: false });
        return;
      }
      let skill = null;
      if (r.listOrder != null && anchors.length) {
        let before = null, after = null;
        for (const a of anchors) {
          if (a.order <= r.listOrder) before = a;
          if (a.order >= r.listOrder && !after) after = a;
        }
        if (before && after && before.order !== after.order) {
          const t = (r.listOrder - before.order) / (after.order - before.order);
          skill = before.skill + (after.skill - before.skill) * t;
        } else if (before) {
          skill = before.skill;
        } else if (after) {
          skill = after.skill;
        }
      }
      map.set(r, skill != null ? { skill: Math.round(skill), estimated: true } : null);
    });
    recipeSkillEstimateCache.set(recipe.tradeskill, map);
  }
  return recipeSkillEstimateCache.get(recipe.tradeskill).get(recipe) || null;
}

// Disenchanting's own recipes double as the data source for its magic-dust
// tiers instead of a separate schema field: each distinct recipe result name
// (e.g. "Enchanted Powder (x1-5) & Mote of Magic (x0-2)") names one tier's
// two possible outputs — a common "Powder" and a rarer "of Magic" essence.
// Tier order comes from the shared recipeSkillLevel/listOrder those recipes
// already carry (lowest first). The exact formula for which source item
// yields which tier isn't confirmed yet, so this only shows what a tier
// produces, not what feeds into it. Just the dust names are pulled out here
// (not the "(x1-4)" quantity ranges) — this chart is only meant to show which
// items belong to which tier, since the actual quantities are already shown
// on each recipe card further down the page.
function disenchantingDustTiers() {
  const seen = new Map();
  craftingData
    .filter(r => r.tradeskill === 'Disenchanting')
    .forEach(r => {
      if (seen.has(r.name)) return;
      const m = r.name.match(/^(.*?)\s*\(x[\d-]+\)\s*&\s*(.*?)\s*\(x[\d-]+\)$/);
      if (!m) return;
      seen.set(r.name, {
        tierOrder: r.listOrder ?? Infinity,
        powder: m[1].trim(),
        essence: m[2].trim()
      });
    });
  return [...seen.values()].sort((a, b) => a.tierOrder - b.tierOrder);
}

// One dust's thumbnail — the real item image when items.json has one, a
// dashed placeholder box otherwise (item not added yet, or added but with no
// image uploaded yet) so the tier chart's layout stays stable either way.
function dustTierThumbHTML(dustName) {
  const item = findItemByName(dustName);
  const thumb = item && item.image
    ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(dustName)}">`
    : `<div class="dust-tier-placeholder">No image yet</div>`;
  return `
    <div class="dust-tier-thumb">
      ${thumb}
      <div class="dust-tier-thumb-name">${escapeAttr(dustName)}</div>
    </div>
  `;
}

function renderDisenchantingDustTiersHTML() {
  const tiers = disenchantingDustTiers();
  if (!tiers.length) return '';
  return `
    <div class="dust-tiers">
      <h2>Magic Dust Tiers</h2>
      <p class="dust-tiers-intro">Lowest to highest tier. The exact formula for which source item yields which tier isn't confirmed yet.</p>
      <div class="dust-tiers-grid">
        ${tiers.map((t, i) => `
          <div class="dust-tier">
            <div class="dust-tier-label">Tier ${i + 1}</div>
            <div class="dust-tier-pair">
              ${dustTierThumbHTML(t.powder)}
              ${dustTierThumbHTML(t.essence)}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Renders one tradeskill's full recipe list (search box, needs-info toggle,
// count, station-grouped grid, item/recipe link handlers, highlight-on-
// arrival) into `rootEl`. Shared by every tradeskill reached from either
// grid — the Crafting page for ordinary tradeskills (including Enchanting)
// and the Gathering page for any recipe-based tradeskill living there (see
// renderCraftingRecipes/renderGatheringRecipes, both of which pass
// `showBackLink: true` and their own grid's `onBack`).
// `idSuffix` keeps element ids unique on the rare page that renders more than
// one of these sections at once (none currently do, but the option remains
// from when Enchanting and Disenchanting briefly shared a page, before each
// got its own top-level page, before that idea was dropped too — see
// CLAUDE.md for the full history if this area gets touched again).
async function renderTradeskillSection(rootEl, tradeskillName, opts = {}) {
  const { showBackLink = false, onBack = null, idSuffix = '', headingTag = 'h1', highlightSlug = null } = opts;
  const tradeskill = tradeskillsData.find(ts => ts.name === tradeskillName);
  if (tradeskillName === 'Jewelcrafting') await ensureGemstonesData();

  // This is the single choke point for "landing on one tradeskill's own
  // recipe list" — reached from the Crafting grid or the Gathering grid
  // (Disenchanting only), or from a pending-tradeskill jump — so it's where
  // a "Most Visited Tradeskills" visit gets recorded for the tradeskill
  // itself (see recordVisit's own comment for why only tradeskills track).
  recordVisit('craft', tradeskillName);
  updateVisitedSidebarSections();

  const backLinkId = `craft-back-link${idSuffix}`;
  const searchId = `craft-recipe-search${idSuffix}`;
  const needsInfoId = `craft-recipe-filter-needsinfo${idSuffix}`;
  const countId = `craft-recipe-count${idSuffix}`;
  const gridId = `craft-recipe-grid${idSuffix}`;
  const slotFilterId = `craft-recipe-filter-slot${idSuffix}`;
  const typeFilterId = `craft-recipe-filter-type${idSuffix}`;
  const sortId = `craft-recipe-sort${idSuffix}`;
  const showCardsId = `craft-recipe-show-cards${idSuffix}`;

  // Sorted by the recipe's real skill requirement (lowest first) — a
  // confirmed `recipeSkillLevel` where one exists, otherwise the
  // interpolated estimate from estimateRecipeSkill() above, otherwise
  // (no signal at all) the old listOrder/alphabetical fallback. This is the
  // default order every tradeskill uses; the sort dropdown (below) can
  // switch the displayed order to alphabetical without touching this base
  // array.
  const allRecipes = craftingData
    .filter(r => r.tradeskill === tradeskillName)
    .sort((a, b) => {
      const ea = estimateRecipeSkill(a);
      const eb = estimateRecipeSkill(b);
      const as = ea ? ea.skill : null;
      const bs = eb ? eb.skill : null;
      if (as != null && bs != null && as !== bs) return as - bs;
      if (as != null && bs == null) return -1;
      if (as == null && bs != null) return 1;
      const ao = a.listOrder ?? Infinity;
      const bo = b.listOrder ?? Infinity;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });

  // Enchanting recipes carry two extra fields no other tradeskill uses:
  // `enchantSlot` (the equipment slot a scroll's buff applies to, e.g.
  // "Gloves" — unset for a raw enchanted-material recipe, which has no
  // slot) and `craftType` ("Scroll" for a buff scroll, or "Armor"/"Weapon"/
  // "Jewelry" for a raw material recipe, categorized by which other
  // tradeskill actually uses that material). Both dropdowns are derived from
  // whatever values actually exist in the data (same "no code change needed
  // for a new value" philosophy as every other filter dropdown on the site),
  // and only rendered at all for Enchanting — no other tradeskill has this
  // slot/type shape.
  const isEnchanting = tradeskillName === 'Enchanting';
  const enchantSlots = isEnchanting ? [...new Set(allRecipes.map(r => r.enchantSlot).filter(Boolean))].sort() : [];
  const enchantTypes = isEnchanting ? [...new Set(allRecipes.map(r => r.craftType).filter(Boolean))].sort() : [];

  rootEl.innerHTML = `
    ${showBackLink ? `<p><a href="#" id="${backLinkId}">&larr; All tradeskills</a></p>` : ''}
    <${headingTag}>
      ${tradeskillName}
      ${tradeskill && tradeskill.status === 'planned' ? '<span class="badge-planned">Planned</span>' : ''}
    </${headingTag}>
    ${tradeskill && tradeskill.note ? `<p class="craft-tradeskill-note">${escapeAttr(tradeskill.note)}</p>` : ''}
    ${tradeskillName === 'Disenchanting' ? renderDisenchantingDustTiersHTML() : ''}
    ${renderGemstoneTablesHTML(tradeskillName)}
    ${
      tradeskill && tradeskill.status === 'planned'
        ? '<p>This tradeskill hasn\'t been implemented in the game yet.</p>'
        : allRecipes.length
          ? `
            <div class="items-toolbar">
              <input type="search" id="${searchId}" class="items-search" placeholder="Search ${escapeAttr(tradeskillName)} recipes, ingredients, tools..." autocomplete="off">
              <button type="button" class="items-clear-btn search-clear-btn" data-clear-target="${searchId}">Clear</button>
              ${isEnchanting ? `
                <select id="${slotFilterId}" class="items-select">
                  <option value="">All Slots</option>
                  ${enchantSlots.map(s => `<option value="${escapeAttr(s)}">${escapeAttr(s)}</option>`).join('')}
                </select>
                <select id="${typeFilterId}" class="items-select">
                  <option value="">All Types</option>
                  ${enchantTypes.map(t => `<option value="${escapeAttr(t)}">${escapeAttr(t)}</option>`).join('')}
                </select>
              ` : ''}
              <select id="${sortId}" class="items-select">
                <option value="skill">Sort: Skill Required</option>
                <option value="alpha">Sort: Alphabetical</option>
              </select>
              <label class="needsinfo-toggle" for="${needsInfoId}">
                <input type="checkbox" id="${needsInfoId}">
                <span class="needsinfo-toggle-slider"></span>
                <span>Show only recipes that need info</span>
              </label>
              ${showCardsToggleHTML(showCardsId)}
            </div>
            <p class="items-count" id="${countId}"></p>
            <div id="${gridId}"></div>
          `
          : '<p>No recipes yet for this tradeskill.</p>'
    }
  `;

  if (showBackLink) {
    rootEl.querySelector(`#${backLinkId}`).addEventListener('click', e => {
      e.preventDefault();
      onBack && onBack();
    });
  }

  if (!allRecipes.length) return;

  const searchBox = rootEl.querySelector(`#${searchId}`);
  const needsInfoFilter = rootEl.querySelector(`#${needsInfoId}`);
  const grid = rootEl.querySelector(`#${gridId}`);
  const countEl = rootEl.querySelector(`#${countId}`);
  const slotFilter = isEnchanting ? rootEl.querySelector(`#${slotFilterId}`) : null;
  const typeFilter = isEnchanting ? rootEl.querySelector(`#${typeFilterId}`) : null;
  const sortSelect = rootEl.querySelector(`#${sortId}`);
  setupShowCardsToggle(rootEl, showCardsId);

  function attachRecipeLinkHandlers() {
    grid.querySelectorAll('.craft-result-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const item = findItemByName(link.dataset.recipe);
        if (item) goToItem(item, { tradeskill: tradeskillName, name: link.dataset.recipe });
      });
    });

    grid.querySelectorAll('.craft-component-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const item = findItemByName(link.dataset.item);
        if (item) goToItem(item, { tradeskill: tradeskillName, name: link.dataset.recipe });
      });
    });
  }

  // A recipe's optional `station` (e.g. Alchemy's "Mortar and Pestle" vs
  // "Cauldron", first needed 2026-07-13) groups the grid into headed
  // sections instead of one flat list, when the tradeskill's recipes
  // actually use it — most tradeskills have no `station` on any recipe, so
  // this falls back to the plain flat grid for them automatically. Ordered
  // to match the real crafting process (grind into powder first, then
  // combine into a potion) rather than whatever order the names happen to
  // sort in; an unlisted future station value just sorts first.
  const STATION_ORDER = ['Mortar and Pestle', 'Cauldron'];
  const stations = [...new Set(allRecipes.map(r => r.station).filter(Boolean))]
    .sort((a, b) => STATION_ORDER.indexOf(a) - STATION_ORDER.indexOf(b));

  function updateGrid() {
    const query = searchBox.value.toLowerCase().trim();
    const needsInfo = needsInfoFilter.checked;
    const slotValue = slotFilter ? slotFilter.value : '';
    const typeValue = typeFilter ? typeFilter.value : '';
    let filtered = allRecipes;
    if (needsInfo) filtered = filtered.filter(r => r.needsInfo);
    if (slotValue) filtered = filtered.filter(r => r.enchantSlot === slotValue);
    if (typeValue) filtered = filtered.filter(r => r.craftType === typeValue);
    if (query) filtered = filtered.filter(r => recipeSearchHaystack(r).includes(query));
    // Alphabetical is the one non-default sort option, available for every
    // tradeskill — the default otherwise displays in the same skill-required
    // order `allRecipes` was already sorted into above.
    if (sortSelect.value === 'alpha') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

    if (!filtered.length) {
      grid.innerHTML = '<p class="items-empty">No recipes match your search.</p>';
    } else if (stations.length) {
      const groups = stations.map(station => {
        const inStation = filtered.filter(r => r.station === station);
        return inStation.length
          ? `<h2>${escapeAttr(station)}</h2><div class="craft-recipe-grid">${inStation.map(renderRecipeCardHTML).join('')}</div>`
          : '';
      });
      const unstationed = filtered.filter(r => !r.station);
      if (unstationed.length) groups.push(`<div class="craft-recipe-grid">${unstationed.map(renderRecipeCardHTML).join('')}</div>`);
      grid.innerHTML = groups.join('');
    } else {
      grid.innerHTML = `<div class="craft-recipe-grid">${filtered.map(renderRecipeCardHTML).join('')}</div>`;
    }

    countEl.textContent = (query || needsInfo || slotValue || typeValue) ? `Showing ${filtered.length} of ${allRecipes.length} recipes` : '';
    setupItemTooltip(grid);
    attachRecipeLinkHandlers();
  }

  searchBox.addEventListener('input', updateGrid);
  needsInfoFilter.addEventListener('change', updateGrid);
  slotFilter && slotFilter.addEventListener('change', updateGrid);
  typeFilter && typeFilter.addEventListener('change', updateGrid);
  sortSelect.addEventListener('change', updateGrid);
  updateGrid();

  if (highlightSlug) {
    const card = rootEl.querySelector(`.item-card-recipe[data-recipe-slug="${CSS.escape(highlightSlug)}"]`);
    if (card) {
      suppressScrollReset = true;
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('recipe-flash');
      card.addEventListener('animationend', () => card.classList.remove('recipe-flash'), { once: true });
    }
  }
}

async function renderCraftingRecipes(container, tradeskillName) {
  const highlightSlug = pendingHighlightRecipe;
  pendingHighlightRecipe = null;
  await renderTradeskillSection(container, tradeskillName, {
    showBackLink: true,
    onBack: () => renderCraftingCategories(container),
    highlightSlug
  });
}

// Same idea as renderCraftingRecipes, but for a recipe-based tradeskill that
// lives on the Gathering grid instead of Crafting's (per
// gatheringTradeskillIsNodeBased — Disenchanting is the original case,
// 2026-07-19 user's own call; any other recipe-based tradeskill later added
// to this grid, e.g. Foraging if it ever gets real crafting.json recipes,
// reaches this same generic renderer) — its "back" link needs to return to
// the Gathering grid instead of Crafting's, and Disenchanting's own
// dust-tier thumbnails need itemsData loaded (findItemByName lookups) the
// same way the old dedicated Disenchanting page used to ensure.
async function renderGatheringRecipes(container, tradeskillName) {
  await ensureItemsData();
  const highlightSlug = pendingHighlightRecipe;
  pendingHighlightRecipe = null;
  await renderTradeskillSection(container, tradeskillName, {
    showBackLink: true,
    onBack: () => renderGatheringCategories(container),
    highlightSlug
  });
}

// Matched against a gathering node's own search box — name plus its results
// and locations, same idea as recipeSearchHaystack.
function gatheringNodeSearchHaystack(node) {
  return [
    node.name,
    (node.results || []).join(' '),
    (node.locations || []).join(' '),
    node.rarity || '',
    node.baitRequired || '',
    node.note || ''
  ].join(' ').toLowerCase();
}

// Gathering tradeskills (Mining, Lumberjacking, Herbalism, Fishing) don't
// have recipes — a node has no components and no single crafted result, just
// a minimum skill to interact with it, a trivial skill where skill-ups stop,
// and where in the world to find it (gathering-nodes.json). This renders as
// a sortable/searchable table (same structural pattern as renderMonstersList)
// rather than the recipe-card grid renderCraftingRecipes uses, since a node
// has no image/components to justify a card. `results` — what the node
// actually yields — is optional; only Lumberjacking's source table listed
// it explicitly (2026-07-13), Mining's didn't, so most Mining rows just omit
// it rather than guessing (see gathering-nodes.json).
// The extra columns beyond Name/Min Skill/Location vary by tradeskill —
// Mining has neither Trivial-for-every-row nor Results, Lumberjacking has
// Trivial+Results, Fishing has Rarity+Bait Required instead of either. Rather
// than hard-code one fixed column set, the columns actually shown are derived
// from whichever optional fields any node of this tradeskill actually uses —
// same "derive from data, no code change needed for the next tradeskill"
// philosophy as the Item Database's filter dropdowns.
function gatheringColumns(nodes) {
  const columns = [
    { key: 'name', label: 'Name', sortable: true, colClass: 'col-gathering-name' },
    { key: 'minSkill', label: 'Min Skill', sortable: true, colClass: 'col-gathering-skill' }
  ];
  if (nodes.some(n => n.trivialSkill != null)) {
    columns.push({ key: 'trivialSkill', label: 'Trivial', sortable: true, colClass: 'col-gathering-skill' });
  }
  if (nodes.some(n => n.results && n.results.length)) {
    columns.push({ key: 'results', label: 'Results', sortable: false, colClass: 'col-gathering-results' });
  }
  if (nodes.some(n => n.rarity)) {
    columns.push({ key: 'rarity', label: 'Rarity', sortable: false, colClass: 'col-gathering-rarity' });
  }
  if (nodes.some(n => n.baitRequired)) {
    columns.push({ key: 'baitRequired', label: 'Bait Required', sortable: false, colClass: 'col-gathering-bait' });
  }
  columns.push({ key: 'locations', label: 'Location', sortable: false, colClass: 'col-gathering-location' });
  return columns;
}

function gatheringCellHTML(node, key) {
  switch (key) {
    case 'name':
      return `<td data-label="Name">${node.image ? `<button type="button" class="gathering-node-thumb" data-full="${escapeAttr(node.image)}"><img src="${escapeAttr(node.image)}" alt="${escapeAttr(node.name)}"></button>` : ''}${escapeAttr(node.name)}${node.needsInfo ? ' <span class="badge-tag badge-needs-info">NEEDS INFO</span>' : ''}</td>`;
    case 'minSkill':
    case 'trivialSkill':
      return `<td data-label="${key === 'minSkill' ? 'Min Skill' : 'Trivial'}"${node[key] == null ? ' class="cell-empty"' : ''}>${node[key] != null ? node[key] : '?'}</td>`;
    case 'results':
      return `<td data-label="Results"${!(node.results && node.results.length) ? ' class="cell-empty"' : ''}>${
        (node.results || []).map(r => {
          const m = findItemByName(r);
          return m
            ? `<a href="#" class="item-name-hover gathering-result-link" data-alt="${escapeAttr(m.name)}" data-item="${escapeAttr(m.name)}">${escapeAttr(r)}</a>`
            : escapeAttr(r);
        }).join(', ') || '—'
      }</td>`;
    case 'rarity':
      return `<td data-label="Rarity"${!node.rarity ? ' class="cell-empty"' : ''}>${escapeAttr(node.rarity || '—')}</td>`;
    case 'baitRequired':
      return `<td data-label="Bait Required"${!node.baitRequired ? ' class="cell-empty"' : ''}>${escapeAttr(node.baitRequired || '—')}</td>`;
    case 'locations':
      return `<td data-label="Location"${!(node.locations && node.locations.length) ? ' class="cell-empty"' : ''}>${escapeAttr((node.locations || []).join('; ')) || '—'}</td>`;
    default:
      return '<td></td>';
  }
}

function renderGatheringNodes(container, tradeskillName) {
  const tradeskill = tradeskillsData.find(ts => ts.name === tradeskillName);
  const allNodes = gatheringData.filter(n => n.tradeskill === tradeskillName);
  const columns = gatheringColumns(allNodes);

  // Same idea as the recordVisit call in renderTradeskillSection — this is
  // the choke point for "landing on one gathering tradeskill's own node
  // table", tracking the specific tradeskill reached rather than the
  // Gathering grid page itself.
  recordVisit('gathering', tradeskillName);
  updateVisitedSidebarSections();

  container.innerHTML = `
    <p><a href="#" id="gathering-back-link">&larr; All tradeskills</a></p>
    <h1>
      ${tradeskillName}
      ${tradeskill && tradeskill.status === 'planned' ? '<span class="badge-planned">Planned</span>' : ''}
    </h1>
    ${tradeskill && tradeskill.note ? `<p class="craft-tradeskill-note">${escapeAttr(tradeskill.note)}</p>` : ''}
    ${
      tradeskill && tradeskill.status === 'planned'
        ? '<p>This tradeskill hasn\'t been implemented in the game yet.</p>'
        : allNodes.length
          ? `
            <div class="items-toolbar">
              <input type="search" id="gathering-search" class="items-search" placeholder="Search ${escapeAttr(tradeskillName)} nodes, results, locations..." autocomplete="off">
              <button type="button" class="items-clear-btn search-clear-btn" data-clear-target="gathering-search">Clear</button>
              ${showCardsToggleHTML('gathering-show-cards')}
            </div>
            <p class="items-count" id="gathering-count"></p>
            <div class="items-table-wrap">
              <table class="items-table">
                <colgroup>
                  ${columns.map(c => `<col class="${c.colClass}">`).join('')}
                </colgroup>
                <thead>
                  <tr>
                    ${columns.map(c => c.sortable
                      ? `<th data-sort-key="${c.key}" class="sortable">${c.label}</th>`
                      : `<th>${c.label}</th>`
                    ).join('')}
                  </tr>
                </thead>
                <tbody id="gathering-tbody"></tbody>
              </table>
            </div>
          `
          : '<p>No gathering nodes recorded yet for this tradeskill.</p>'
    }
  `;

  container.querySelector('#gathering-back-link').addEventListener('click', e => {
    e.preventDefault();
    renderGatheringCategories(container);
  });

  if (!allNodes.length) return;

  const searchBox = container.querySelector('#gathering-search');
  const tbody = container.querySelector('#gathering-tbody');
  const countEl = container.querySelector('#gathering-count');
  const sortHeaders = [...container.querySelectorAll('th[data-sort-key]')];
  const columnCount = columns.length;
  setupShowCardsToggle(container, 'gathering-show-cards');

  let sortKey = 'minSkill';
  let sortDir = 'asc';

  function updateSortIndicators() {
    sortHeaders.forEach(th => {
      th.classList.toggle('sorted-asc', th.dataset.sortKey === sortKey && sortDir === 'asc');
      th.classList.toggle('sorted-desc', th.dataset.sortKey === sortKey && sortDir === 'desc');
    });
  }

  sortHeaders.forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sortKey;
      if (key === sortKey) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey = key;
        sortDir = 'asc';
      }
      update();
    });
  });

  function nodeSortValue(node, key) {
    if (key === 'name') return node.name.toLowerCase();
    return node[key];
  }

  function renderRows(nodes) {
    if (!nodes.length) {
      tbody.innerHTML = `<tr><td colspan="${columnCount}" class="items-empty">No nodes match your search.</td></tr>`;
      return;
    }
    tbody.innerHTML = nodes.map(node => `
      <tr>
        ${columns.map(c => gatheringCellHTML(node, c.key)).join('')}
      </tr>
      ${node.note ? `<tr class="gathering-note-row"><td colspan="${columnCount}"><em>${escapeAttr(node.note)}</em></td></tr>` : ''}
      ${node.needsInfo ? `<tr class="gathering-note-row"><td colspan="${columnCount}"><div class="item-card-needs-info">This node needs more info &middot; confirmed to exist, but not fully identified yet. <a href="#submit">Submit a screenshot</a> to help fill it in!</div></td></tr>` : ''}
    `).join('');

    tbody.querySelectorAll('.gathering-result-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const item = findItemByName(link.dataset.item);
        if (item) goToItem(item);
      });
    });
    tbody.querySelectorAll('.gathering-node-thumb').forEach(btn => {
      btn.addEventListener('click', () => openSampleViewer(btn.dataset.full));
    });
    setupItemTooltip(tbody);
  }

  function update() {
    const query = searchBox.value.toLowerCase().trim();
    let filtered = query ? allNodes.filter(n => gatheringNodeSearchHaystack(n).includes(query)) : allNodes;

    filtered = [...filtered].sort((a, b) => {
      const av = nodeSortValue(a, sortKey);
      const bv = nodeSortValue(b, sortKey);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    updateSortIndicators();
    renderRows(filtered);
    countEl.textContent = query ? `Showing ${filtered.length} of ${allNodes.length} nodes` : '';
  }

  searchBox.addEventListener('input', update);
  update();
}

/* ============================================
   Monsters
   Data lives in monsters.json. To add a new monster, add an object with a
   name/slug/image (dropped into images/Monsters/, see that folder's
   README.txt) plus whatever of maps/levelRange/drops the screenshot shows —
   no code changes needed, same "derive filters from data" pattern as the
   Item Database's slot/class/race dropdowns.

   Named (boss) monsters get an explicit `"named": true` flag (2026-07-11) —
   name casing alone isn't a reliable signal, since some confirmed bosses use
   the same lowercase "a/the X" style as regular mobs (e.g. "a corrupted
   ashira", "a shimmering shadow"). Monsters without this flag are treated as
   regular. The page is a two-level drill-down, same pattern as the Item
   Database and Crafting page: a top-level view (renderMonstersCategories)
   showing two separate areas — Named Monsters (Bosses) and Regular
   Monsters — each a grid of zone cards (one per map, derived from the
   data), and renderMonstersList, the actual sortable/searchable table,
   scoped to one (named, zone) combination at a time.
   ============================================ */

function monsterSearchHaystack(monster) {
  return [
    monster.name,
    (monster.maps || []).join(' '),
    (monster.areas || []).join(' '),
    monster.levelRange || '',
    (monster.drops || []).map(d => d.item).join(' ')
  ].join(' ').toLowerCase();
}

// The zone a monster is filed under for the category-grid browsing view —
// its first map, or a fallback bucket for the handful of monsters with no
// map recorded yet.
function monsterZone(monster) {
  return (monster.maps && monster.maps[0]) || 'Unknown Zone';
}

// Named and Regular monsters are two separate top-level pages (pages.json,
// both "monsters"-typed, grouped under "Monsters" in the sidebar) — split the
// same way Gathering/Crafting are split under "Tradeskilling" (2026-07-17,
// user's own call), rather than one shared page with both sections stacked
// on it. `file` is "monsters-named" or "monsters-regular", telling
// renderMonstersPage which one it's rendering.
async function renderMonstersPage(container, file) {
  await ensureMonstersData();

  // A zone-scoped view is encoded as a sub-route in the hash itself —
  // "monsters-named/<map>" or "monsters-regular/<map>" (see goToMonster and
  // the zone-card click handler in renderMonstersCategories) — rather than a
  // pending variable, so that drilling into a zone creates a real
  // browser-history entry: pressing Back pops to that page's own zone grid
  // instead of leaving the page entirely.
  const parts = (file || 'monsters-named').split('/');
  const named = parts[0] === 'monsters-named';

  if (parts.length >= 2) {
    renderMonstersList(container, { named, map: decodeURIComponent(parts[1]) });
    return;
  }

  renderMonstersCategories(container, named);
}

function renderMonstersCategories(container, named) {
  const list = monstersData.filter(m => !!m.named === named);
  const icon = named ? 'boss' : 'paw';
  const heading = named ? 'Named Monsters (Bosses)' : 'Regular Monsters';
  const baseHash = named ? 'monsters-named' : 'monsters-regular';

  function zoneCards() {
    if (!list.length) return '<p class="items-empty">None recorded yet.</p>';
    const zones = [...new Set(list.map(monsterZone))].sort();
    return `
      <div class="items-category-grid">
        ${zones.map(zone => {
          const count = list.filter(m => monsterZone(m) === zone).length;
          return `
            <div class="items-category-card" data-zone="${escapeAttr(zone)}">
              <div class="items-category-card-icon">${svgIcon(icon)}</div>
              <div class="items-category-card-body">
                <div class="items-category-card-name">${escapeAttr(zone)}</div>
                <div class="items-category-card-count">${count} monster${count === 1 ? '' : 's'}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  container.innerHTML = `
    <h1 class="monsters-section-heading">${svgIcon(icon)} ${escapeAttr(heading)}</h1>
    <p>Browse ${named ? 'named (boss)' : 'regular'} monsters by zone, or search below to jump
    straight to a specific monster.</p>
    <div class="items-quick-search">
      <div class="items-quick-search-row">
        <input type="search" id="monsters-quick-search-box" class="items-search items-quick-search-box" placeholder="Search ${named ? 'named' : 'regular'} monsters by name, map, drop..." autocomplete="off">
        <button type="button" class="items-clear-btn search-clear-btn" data-clear-target="monsters-quick-search-box">Clear</button>
      </div>
      <div id="monsters-quick-search-results" class="items-quick-search-results"></div>
    </div>
    ${zoneCards()}
  `;

  container.querySelectorAll('.items-category-card').forEach(card => {
    card.addEventListener('click', () => {
      // Navigate via the hash (rather than calling renderMonstersList
      // directly) so this creates a browser-history entry — pressing Back
      // from the zone list returns here instead of leaving the page.
      location.hash = `${baseHash}/${encodeURIComponent(card.dataset.zone)}`;
    });
  });

  // A shortcut past the zone drill-down for anyone who already knows what
  // they're looking for — same live-inline-results pattern as Crafting/
  // Gathering's own quick searches, scoped to just this page's own named/
  // regular subset.
  const quickSearchBox = container.querySelector('#monsters-quick-search-box');
  const quickSearchResults = container.querySelector('#monsters-quick-search-results');

  quickSearchBox.addEventListener('input', () => {
    const query = quickSearchBox.value.toLowerCase().trim();
    if (!query) {
      quickSearchResults.classList.remove('open');
      quickSearchResults.innerHTML = '';
      return;
    }

    const matches = list
      .filter(monster => monsterSearchHaystack(monster).includes(query))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 20);

    // The zone name is its own separate link (not nested inside the monster
    // link — anchors can't nest) so it can jump straight to that area's map
    // instead of the monster, per the user's own request: searching here
    // (without having drilled into a zone folder first) should let the zone
    // itself open the Maps viewer. Only linked when the monster actually has
    // a real map recorded — the "Unknown Zone" fallback bucket (monsterZone)
    // has no matching maps.json entry to open, so it stays plain text.
    quickSearchResults.innerHTML = matches.length
      ? matches.map(monster => {
          const zone = monsterZone(monster);
          const zoneHtml = (monster.maps && monster.maps.length)
            ? `<a href="#" class="items-quick-search-type monster-quick-search-zone-link" data-zone="${escapeAttr(zone)}">${escapeAttr(zone)}</a>`
            : `<span class="items-quick-search-type">${escapeAttr(zone)}</span>`;
          return `
          <div class="monster-quick-search-row">
            <a href="#" class="search-result-link items-quick-search-result" data-slug="${escapeAttr(monster.slug)}">${escapeAttr(monster.name)}</a>
            ${zoneHtml}
          </div>
        `;
        }).join('')
      : '<p class="search-results-empty">No monsters match.</p>';
    quickSearchResults.classList.add('open');

    quickSearchResults.querySelectorAll('.items-quick-search-result').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const monster = findMonsterBySlug(link.dataset.slug);
        if (monster) goToMonster(monster);
      });
    });

    quickSearchResults.querySelectorAll('.monster-quick-search-zone-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        goToMap(link.dataset.zone);
      });
    });
  });
}

function renderMonstersList(container, scope) {
  const scopedMonsters = monstersData.filter(m => !!m.named === scope.named && monsterZone(m) === scope.map);
  const sectionLabel = scope.named ? 'Named Monsters (Bosses)' : 'Regular Monsters';
  const backLabel = `All ${scope.named ? 'named' : 'regular'} monster zones`;

  container.innerHTML = `
    <p class="items-back-link"><a href="#" id="monsters-back-to-categories">&larr; ${escapeAttr(backLabel)}</a></p>
    <h1>${escapeAttr(scope.map)} — ${escapeAttr(sectionLabel)}</h1>
    <p>Browse, search, and sort ${escapeAttr(scope.named ? 'named (boss)' : 'regular')} monsters in
    ${escapeAttr(scope.map)}. Click a monster's name to see its picture and drop table.</p>
    <div class="items-toolbar">
      <input type="search" id="monsters-search" class="items-search" placeholder="Search name, drop..." autocomplete="off">
      <button type="button" class="items-clear-btn search-clear-btn" data-clear-target="monsters-search">Clear</button>
      <label class="needsinfo-toggle" for="monsters-filter-needsinfo">
        <input type="checkbox" id="monsters-filter-needsinfo">
        <span class="needsinfo-toggle-slider"></span>
        <span>Show only monsters that need info</span>
      </label>
      ${showCardsToggleHTML('monsters-show-cards')}
    </div>
    <p class="items-count" id="monsters-count"></p>
    <div class="items-table-wrap">
      <table class="items-table">
        <colgroup>
          <col class="col-monster-name">
        </colgroup>
        <thead>
          <tr>
            <th data-sort-key="name" class="sortable">Name</th>
          </tr>
        </thead>
        <tbody id="monsters-tbody"></tbody>
      </table>
    </div>
  `;

  container.querySelector('#monsters-back-to-categories').addEventListener('click', e => {
    e.preventDefault();
    // Set via the hash (not a direct renderMonstersCategories call) so this
    // stays consistent with the browser's history — matches whatever the
    // Back button would already do from here. Routes back to whichever of
    // the two Monsters pages this zone list belongs to.
    location.hash = scope.named ? 'monsters-named' : 'monsters-regular';
  });

  const searchBox = container.querySelector('#monsters-search');
  const needsInfoFilter = container.querySelector('#monsters-filter-needsinfo');
  const sortHeaders = [...container.querySelectorAll('th[data-sort-key]')];
  setupShowCardsToggle(container, 'monsters-show-cards');

  // Landed here from a header search result — pre-fill the search box with
  // that monster's name so the table filters straight down to it.
  if (pendingMonsterQuery) {
    searchBox.value = pendingMonsterQuery;
    pendingMonsterQuery = null;
  }

  let sortKey = 'name';
  let sortDir = 'asc';

  function updateSortIndicators() {
    sortHeaders.forEach(th => {
      th.classList.toggle('sorted-asc', th.dataset.sortKey === sortKey && sortDir === 'asc');
      th.classList.toggle('sorted-desc', th.dataset.sortKey === sortKey && sortDir === 'desc');
    });
  }

  sortHeaders.forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sortKey;
      if (key === sortKey) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey = key;
        sortDir = 'asc';
      }
      update();
    });
  });

  function monsterSortValue(monster, key) {
    switch (key) {
      case 'name': return monster.name.toLowerCase();
      default: return '';
    }
  }

  function update() {
    const query = searchBox.value.toLowerCase().trim();
    const needsInfo = needsInfoFilter.checked;

    let filtered = scopedMonsters.filter(monster => {
      if (needsInfo && !monster.needsInfo) return false;
      if (query && !monsterSearchHaystack(monster).includes(query)) return false;
      return true;
    });

    filtered.sort((a, b) => {
      const av = monsterSortValue(a, sortKey);
      const bv = monsterSortValue(b, sortKey);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    updateSortIndicators();
    renderMonsterRows(container.querySelector('#monsters-tbody'), filtered);
    container.querySelector('#monsters-count').textContent =
      `Showing ${filtered.length} of ${scopedMonsters.length} monsters`;
  }

  searchBox.addEventListener('input', update);
  needsInfoFilter.addEventListener('change', update);

  update();
  setupMonsterClickToView(container.querySelector('#monsters-tbody'));
  setupMonsterTooltip(container.querySelector('#monsters-tbody'));

  if (pendingHighlightMonster) {
    const slug = pendingHighlightMonster;
    pendingHighlightMonster = null;
    const row = container.querySelector(`#monsters-tbody tr[data-slug="${CSS.escape(slug)}"]`);
    if (row) {
      suppressScrollReset = true;
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.add('row-flash');
      row.addEventListener('animationend', () => row.classList.remove('row-flash'), { once: true });
    }
  }
}

function renderMonsterRows(tbody, monsters) {
  if (!monsters.length) {
    tbody.innerHTML = `<tr><td colspan="1" class="items-empty">${monstersData.length ? 'No monsters match your filters.' : 'No monsters yet.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = monsters.map(monster => `
    <tr data-slug="${escapeAttr(monster.slug)}">
      <td data-label="Name"><span class="item-name-hover monster-name-hover" data-slug="${escapeAttr(monster.slug)}">${escapeAttr(monster.name)}</span>${monster.needsInfo ? ' <span class="badge-tag badge-needs-info">NEEDS INFO</span>' : ''}</td>
    </tr>
  `).join('');
}

function findMonsterBySlug(slug) {
  return (monstersData || []).find(m => m.slug === slug);
}

function setupMonsterClickToView(tbody) {
  tbody.addEventListener('click', e => {
    const span = e.target.closest('.monster-name-hover');
    if (!span) return;
    const monster = findMonsterBySlug(span.dataset.slug);
    if (monster) openMonsterViewer(monster);
  });
}

// Hover-to-preview a monster's card, same idea and positioning logic as
// setupItemTooltip (flip-above-if-no-room-below) — but unlike an item's
// tooltip, this one is clickable (2026-07-17, user's own call: clicking the
// card itself should open the full viewer with its screenshot and
// clickable drops, not just the underlying table row). The tooltip element
// is a singleton (like #item-tooltip) reused across every call to this
// function, so the monster it's currently showing is tracked as a property
// on the element itself (tooltip._monster) rather than a closed-over local
// — a local would go stale the moment a second page calls this function
// again with a new closure, while the click/mouseleave listeners registered
// on the first call are still the ones attached to the shared element.
function setupMonsterTooltip(container) {
  let tooltip = document.getElementById('monster-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'monster-tooltip';
    document.body.appendChild(tooltip);
    // Lets hovering a drop-link's item name inside the preview show that
    // item's own hover card on top, same as it would in the full viewer.
    setupItemTooltip(tooltip);

    const hideTooltip = () => {
      tooltip.style.display = 'none';
      tooltip._monster = null;
    };
    tooltip.addEventListener('mouseleave', hideTooltip);

    tooltip.addEventListener('click', e => {
      const dropLink = e.target.closest('.monster-drop-link');
      if (dropLink) {
        e.preventDefault();
        const item = findItemByName(dropLink.dataset.item);
        const monster = findMonsterBySlug(dropLink.dataset.monster);
        hideTooltip();
        if (item && monster) goToItem(item, { kind: 'monster', name: monster.name, slug: monster.slug });
        return;
      }
      const relatedLink = e.target.closest('.monster-related-link');
      if (relatedLink) {
        e.preventDefault();
        const related = findMonsterBySlug(relatedLink.dataset.slug);
        hideTooltip();
        if (related) openMonsterViewer(related);
        return;
      }
      const suggestLink = e.target.closest('.monster-suggest-link');
      if (suggestLink) {
        e.preventDefault();
        hideTooltip();
        goToSubmit({ kind: 'monster', name: suggestLink.dataset.name });
        return;
      }
      // Anywhere else on the card — the "click for more info" affordance.
      const monster = tooltip._monster;
      hideTooltip();
      if (monster) openMonsterViewer(monster);
    });
  }

  container.addEventListener('mouseover', e => {
    const span = e.target.closest('.monster-name-hover');
    if (!span) return;
    const monster = findMonsterBySlug(span.dataset.slug);
    if (!monster) return;
    const rect = span.getBoundingClientRect();
    tooltip.innerHTML = renderMonsterCardHTML(monster, { isTooltip: true });
    tooltip._monster = monster;
    tooltip.style.display = 'block';

    const left = Math.min(rect.left, window.innerWidth - 336);
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 260 && rect.top > spaceBelow) {
      tooltip.style.top = '';
      tooltip.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
    } else {
      tooltip.style.bottom = '';
      tooltip.style.top = (rect.bottom + 8) + 'px';
    }
    tooltip.style.left = Math.max(left, 8) + 'px';
  });

  container.addEventListener('mouseout', e => {
    const span = e.target.closest('.monster-name-hover');
    if (!span) return;
    // Moving the mouse into the tooltip itself (to click something in it)
    // shouldn't hide it — only mouseleave on the tooltip (registered above)
    // does that.
    if (span.contains(e.relatedTarget) || tooltip.contains(e.relatedTarget)) return;
    tooltip.style.display = 'none';
    tooltip._monster = null;
  });
}

// Full monster viewer modal — picture, map(s), level range, and a drop table
// whose items link to the Item Database when a matching item exists yet
// (same findItemByName/goToItem dynamic-linking pattern as a recipe's
// component list), same modal shell as the item viewer (#item-viewer).
function setupMonsterViewer() {
  if (document.getElementById('monster-viewer')) return;

  const viewer = document.createElement('div');
  viewer.id = 'monster-viewer';
  viewer.innerHTML = `
    <button id="monster-viewer-close" aria-label="Close">&times;</button>
    <div id="monster-viewer-panel">
      <div id="monster-viewer-card"></div>
    </div>
  `;
  document.body.appendChild(viewer);

  viewer.addEventListener('click', e => {
    if (e.target === viewer) {
      closeMonsterViewer();
      return;
    }
    const link = e.target.closest('.monster-drop-link');
    if (link) {
      e.preventDefault();
      const item = findItemByName(link.dataset.item);
      const monster = findMonsterBySlug(link.dataset.monster);
      if (item && monster) {
        closeMonsterViewer();
        goToItem(item, { kind: 'monster', name: monster.name, slug: monster.slug });
      }
      return;
    }
    const relatedLink = e.target.closest('.monster-related-link');
    if (relatedLink) {
      e.preventDefault();
      const related = findMonsterBySlug(relatedLink.dataset.slug);
      if (related) {
        closeMonsterViewer();
        openMonsterViewer(related);
      }
      return;
    }
    const suggestLink = e.target.closest('.monster-suggest-link');
    if (suggestLink) {
      e.preventDefault();
      closeMonsterViewer();
      goToSubmit({ kind: 'monster', name: suggestLink.dataset.name });
    }
  });

  viewer.querySelector('#monster-viewer-close').addEventListener('click', closeMonsterViewer);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMonsterViewer();
  });
}

// Shared by the full monster viewer modal and the hover tooltip
// (setupMonsterTooltip) — same card markup either way. `opts.isTooltip` adds
// a small "Click for more info" hint at the bottom, shown only in the
// tooltip (the modal IS the "more info" destination, so it doesn't need the
// hint pointing at itself).
function renderMonsterCardHTML(monster, opts = {}) {
  const drops = monster.drops || [];
  const related = monster.relatedMonsters || [];

  return `
    <div class="monster-card">
      ${monster.image
        ? `<img class="monster-card-image" src="${escapeAttr(monster.image)}" alt="${escapeAttr(monster.name)}">`
        : '<div class="monster-card-image-placeholder">No image yet</div>'}
      <div class="monster-card-body">
        <h2 class="monster-card-name">${escapeAttr(monster.name)}</h2>
        ${formatLastUpdated(monster.lastUpdated)}
        ${(monster.areas && monster.areas.length) ? `<div class="monster-card-field"><span class="item-card-field-label">Area</span><span>${escapeAttr(monster.areas.join(', '))}</span></div>` : ''}
        ${related.length ? `
        <div class="monster-card-field">
          <span class="item-card-field-label">Place Holder</span>
          <span>${related.map(r => {
            const m = findMonsterBySlug(r.slug);
            return m
              ? `<a href="#" class="monster-related-link" data-slug="${escapeAttr(m.slug)}">${escapeAttr(r.label)}</a>`
              : escapeAttr(r.label);
          }).join(', ')}</span>
        </div>` : ''}
        <div class="item-card-section">
          Drops:
          ${drops.length ? `
            <ul class="item-card-components">
              ${drops.map(d => {
                const item = findItemByName(d.item);
                return item
                  ? `<li><a href="#" class="monster-drop-link item-name-hover" data-alt="${escapeAttr(item.name)}" data-item="${escapeAttr(item.name)}" data-monster="${escapeAttr(monster.slug)}">${escapeAttr(d.item)}</a></li>`
                  : `<li>${escapeAttr(d.item)}</li>`;
              }).join('')}
            </ul>
          ` : '<p class="monster-card-no-drops">No known drops yet.</p>'}
        </div>
        ${monster.needsInfo ? `<div class="item-card-section item-card-needs-info">This monster needs more info &middot; confirmed to exist, but a full picture/details haven't been captured yet. <a href="#submit">Submit a screenshot</a> to help fill it in!</div>` : ''}
        ${monster.named ? `<div class="item-card-section item-card-suggest">Wrong or missing info? <a href="#" class="monster-suggest-link" data-name="${escapeAttr(monster.name)}">Click here</a> to let us know.</div>` : ''}
        ${opts.isTooltip ? '<p class="monster-card-tooltip-hint">Click for more info</p>' : ''}
      </div>
    </div>
  `;
}

function openMonsterViewer(monster) {
  setupMonsterViewer();

  const viewer = document.getElementById('monster-viewer');
  viewer.querySelector('#monster-viewer-card').innerHTML = renderMonsterCardHTML(monster);
  setupItemTooltip(viewer.querySelector('#monster-viewer-card'));

  viewer.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMonsterViewer() {
  const viewer = document.getElementById('monster-viewer');
  if (!viewer) return;
  viewer.classList.remove('open');
  document.body.style.overflow = '';
}

/* ============================================
   Beastmaster Companions
   Data lives in companions.json (one entry per tamed animal type) and
   companion-skills.json (the abilities every companion shares — Provoke and
   Bite, confirmed identical across every companion seen so far, so they're
   recorded once here instead of being repeated on every companion entry).
   Rendered as item-card-style cards (see renderItemCardHTML), not the raw
   Pet-window/skill-tooltip screenshots they're sourced from — those are UI
   reference captures (several stacked windows per screenshot), not a single
   clean per-entry card, so like a crafting-window screenshot they're
   processed for their data and discarded rather than archived.
   ============================================ */

function companionSearchHaystack(companion) {
  return [
    companion.name,
    companion.animal || '',
    (companion.skills || []).map(s => `${s.name} ${s.description || ''}`).join(' ')
  ].join(' ').toLowerCase();
}

function renderCompanionSkillHTML(skill) {
  const meta = [
    skill.castTime ? `Cast: ${skill.castTime}` : '',
    skill.cooldown ? `Cooldown: ${skill.cooldown}` : '',
    skill.range ? `Range: ${skill.range}` : ''
  ].filter(Boolean).join(' &middot; ');

  return `
    <div class="companion-skill">
      <div class="companion-skill-header">
        <span class="companion-skill-name">${escapeAttr(skill.name)}</span>
        ${skill.type ? `<span class="companion-skill-type">${escapeAttr(skill.type)}</span>` : ''}
      </div>
      ${skill.description ? `<div class="companion-skill-desc">${escapeAttr(skill.description)}</div>` : ''}
      ${meta ? `<div class="companion-skill-meta">${meta}</div>` : ''}
    </div>
  `;
}

function renderCompanionCardHTML(companion) {
  const skills = companion.skills || [];
  return `
    <div class="item-card" data-companion-slug="${escapeAttr(companion.slug)}">
      <div class="item-card-header">
        <div class="item-card-icon">${svgIcon(companion.animal)}</div>
        <div class="item-card-titles">
          <div class="item-card-name">${escapeAttr(companion.name)}</div>
          <div class="item-card-category">Beastmaster Companion</div>
          ${formatLastUpdated(companion.lastUpdated)}
        </div>
      </div>
      <div class="item-card-body">
        ${companion.observedAtLevel != null ? `
        <div class="item-card-grid">
          <div class="item-card-field"><span class="item-card-field-label">Level</span><span>${companion.observedAtLevel}</span></div>
        </div>` : ''}
        <div class="item-card-section">
          Abilities:
          <div class="companion-skills">
            ${skills.length ? skills.map(renderCompanionSkillHTML).join('') : '<p class="item-card-muted">No unique abilities known yet.</p>'}
          </div>
        </div>
      </div>
    </div>
  `;
}

async function renderCompanionsPage(container) {
  await ensureCompanionsData();

  container.innerHTML = `
    <h1>Beastmaster Companions</h1>
    <p>Pets tamed and summoned by the Beastmaster class. Every companion shares the two
    abilities below regardless of animal type, plus one or more unique abilities of its own.</p>
    <div class="gem-reference companion-shared-abilities">
      <h2>Shared Abilities (Every Companion)</h2>
      <div class="companion-skills">
        ${companionSkillsData.map(renderCompanionSkillHTML).join('')}
      </div>
    </div>
    <div class="items-toolbar">
      <input type="search" id="companion-search" class="items-search" placeholder="Search companions, abilities..." autocomplete="off">
      <button type="button" class="items-clear-btn search-clear-btn" data-clear-target="companion-search">Clear</button>
    </div>
    <p class="items-count" id="companion-count"></p>
    <div class="companion-grid" id="companion-grid"></div>
  `;

  const searchBox = container.querySelector('#companion-search');
  const grid = container.querySelector('#companion-grid');
  const countEl = container.querySelector('#companion-count');

  function update() {
    const query = searchBox.value.toLowerCase().trim();
    const filtered = query ? companionsData.filter(c => companionSearchHaystack(c).includes(query)) : companionsData;
    grid.innerHTML = filtered.length
      ? filtered.map(renderCompanionCardHTML).join('')
      : `<p class="items-empty">${companionsData.length ? 'No companions match your search.' : 'No companions yet.'}</p>`;
    countEl.textContent = query ? `Showing ${filtered.length} of ${companionsData.length} companions` : '';
  }

  searchBox.addEventListener('input', update);
  update();

  if (pendingHighlightCompanion) {
    const slug = pendingHighlightCompanion;
    pendingHighlightCompanion = null;
    const card = container.querySelector(`.item-card[data-companion-slug="${CSS.escape(slug)}"]`);
    if (card) {
      suppressScrollReset = true;
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('card-flash');
      card.addEventListener('animationend', () => card.classList.remove('card-flash'), { once: true });
    }
  }
}

/* ============================================
   Submit a Screenshot
   A plain on-wiki form — visitors never see GitHub or need an account. The
   form POSTs directly to a small Cloudflare Worker (see
   cloudflare-worker/submit-worker.js), which is the only piece of this
   feature GitHub Pages itself can't host, since Pages can only serve static
   files and can't safely hold the GitHub token needed to open a pull
   request. The Worker adds the screenshot to images/Inbox/ on a new branch
   and opens a PR — merging it is the accept, closing it is the deny, and
   the live site never changes until that decision is made (same "check
   inbox" workflow as any other screenshot once merged).
   ============================================ */

// Set this to your deployed Worker's URL (Cloudflare dashboard -> your
// worker -> the "workers.dev" URL shown at the top) once you've deployed
// cloudflare-worker/submit-worker.js. Until then the form shows a clear
// "not set up yet" message instead of silently failing.
const SUBMIT_WORKER_URL = 'https://muddy-bar-88a7.mnm-wiki.workers.dev';

// Example screenshots shown on the Submit page so visitors know what a
// usable submission looks like — added directly to images/samples/ (not
// images/Inbox/, since these are permanent site content the page displays,
// not archival/pending-review material). Extend this array the same way if
// another example type is ever needed.
const SUBMIT_EXAMPLES = [
  { image: 'images/samples/sample-loot.jpg', label: 'Item / loot window' },
  { image: 'images/samples/sample-monster.jpg', label: 'Monster picture' },
  { image: 'images/samples/sample-companion.jpg', label: 'Companion / ability screenshot' },
  {
    image: 'images/samples/sample-gathering-node.jpg',
    label: 'Gathering node',
    note: 'Name the file after the node or resource itself (e.g. "Lionleaf.jpg") — that\'s how we match it up.'
  }
];

// Set by an item's or a named monster's "Wrong or missing info?" link
// (goToSubmit) — consumed once here and shown as a
// dismissible "Regarding: <name>" banner, folded into the notes actually
// sent rather than passed to the Worker as its own field, so the Worker's
// own logic doesn't need to know anything about items/monsters at all.
async function renderSubmitPage(container) {
  const context = pendingSubmitContext;
  pendingSubmitContext = null;

  // Powers the optional "Which map/zone is this about?" dropdown — maps.json
  // failing to load shouldn't block the rest of the page, just leave that
  // dropdown empty.
  await ensureMapsData().catch(() => null);
  const zoneGroups = mapsData ? groupMapsByArea(mapsData) : [];

  container.innerHTML = `
    <h1>Submit a Screenshot</h1>
    <p>Found something not on the wiki yet? Attach a screenshot below — an item card, a
    monster picture, a map, a recipe card, anything from the game — or, if you don't have
    one, just write in what you know. It won't appear on the wiki automatically; every
    submission is reviewed first.</p>
    <div class="submit-examples">
      <div class="submit-examples-grid">
        ${SUBMIT_EXAMPLES.map(ex => `
          <button type="button" class="submit-example" data-full="${escapeAttr(ex.image)}">
            <img src="${escapeAttr(ex.image)}" alt="Example: ${escapeAttr(ex.label)}">
            <span>${escapeAttr(ex.label)}</span>
            ${ex.note ? `<small class="submit-example-note">${escapeAttr(ex.note)}</small>` : ''}
          </button>
        `).join('')}
      </div>
      <p class="submit-examples-note">Click an example to see it full-size. What matters most
      isn't a perfectly framed screenshot — it's making sure every bit of <strong>text</strong>
      is readable and nothing gets cut off. If a card or window has too much text to fit in one
      screenshot, just take two instead of cropping anything out. A screenshot missing part of
      the text (a stat, a name, a component) is much less useful than a couple of slightly messy
      ones that show everything.</p>
    </div>
    ${!SUBMIT_WORKER_URL ? `
      <p class="submit-form-notice">This form isn't finished being set up yet (no Worker URL
      configured), so submissions can't be sent right now. Come back soon!</p>
    ` : `
      ${context ? `
        <div class="submit-context-banner" id="submit-context-banner">
          Regarding: <strong>${escapeAttr(context.name)}</strong>
          <button type="button" id="submit-context-clear">&times; Not about this</button>
        </div>
      ` : ''}
      <form id="submit-form" class="submit-form">
        <label class="submit-drop-zone" id="submit-drop-zone" for="submit-file-input">
          <div id="submit-drop-zone-empty">
            <strong>Click to choose a screenshot (optional)</strong>
            <span>or drag and drop it here — or skip this and just write in the notes below</span>
          </div>
          <div id="submit-drop-zone-preview" class="submit-drop-zone-preview" hidden>
            <img id="submit-preview-img" alt="Selected screenshot preview">
            <span id="submit-preview-name"></span>
            <button type="button" id="submit-preview-clear">&times; Remove</button>
          </div>
        </label>
        <input type="file" id="submit-file-input" accept="image/png,image/jpeg,image/webp,image/gif" hidden>

        <label for="submit-zone">Which map/zone is this about? (optional)</label>
        <select id="submit-zone">
          <option value="">&mdash; not sure / not applicable &mdash;</option>
          ${zoneGroups.map(g => `<option value="${escapeAttr(g.base)}">${escapeAttr(g.base)}</option>`).join('')}
        </select>

        <label for="submit-notes">Notes ${context ? '' : '(optional if you attach a screenshot)'}</label>
        <textarea id="submit-notes" rows="3" placeholder="Don't have a screenshot? Describe what you know here — where something drops, where a boss spawns, which map/zone, anything else worth recording." maxlength="2000"></textarea>

        <!-- Honeypot: hidden from real visitors via CSS, so anything that fills it in is a bot. -->
        <div class="submit-honeypot" aria-hidden="true">
          <label for="submit-website">Leave this field blank</label>
          <input type="text" id="submit-website" name="website" tabindex="-1" autocomplete="off">
        </div>

        <button type="submit" id="submit-button">Submit</button>
        <p id="submit-status" class="submit-status" role="status"></p>
      </form>
    `}
  `;

  container.querySelectorAll('.submit-example').forEach(btn => {
    btn.addEventListener('click', () => openSampleViewer(btn.dataset.full));
  });

  if (!SUBMIT_WORKER_URL) return;

  // Mutable copy — the "Not about this" button clears it without needing
  // another render pass.
  let activeContext = context;
  const contextBanner = container.querySelector('#submit-context-banner');
  if (contextBanner) {
    container.querySelector('#submit-context-clear').addEventListener('click', () => {
      activeContext = null;
      contextBanner.remove();
    });
  }

  const form = container.querySelector('#submit-form');
  const dropZone = container.querySelector('#submit-drop-zone');
  const fileInput = container.querySelector('#submit-file-input');
  const emptyState = container.querySelector('#submit-drop-zone-empty');
  const previewState = container.querySelector('#submit-drop-zone-preview');
  const previewImg = container.querySelector('#submit-preview-img');
  const previewName = container.querySelector('#submit-preview-name');
  const zoneSelect = container.querySelector('#submit-zone');
  const notesBox = container.querySelector('#submit-notes');
  const button = container.querySelector('#submit-button');
  const status = container.querySelector('#submit-status');

  function clearFile() {
    fileInput.value = '';
    emptyState.hidden = false;
    previewState.hidden = true;
  }
  container.querySelector('#submit-preview-clear').addEventListener('click', e => {
    e.preventDefault();
    clearFile();
  });

  function showPreview(file) {
    const url = URL.createObjectURL(file);
    previewImg.src = url;
    previewName.textContent = `${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
    emptyState.hidden = true;
    previewState.hidden = false;
  }

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) showPreview(fileInput.files[0]);
  });

  ['dragover', 'dragleave', 'drop'].forEach(evt => {
    dropZone.addEventListener(evt, e => e.preventDefault());
  });
  dropZone.addEventListener('dragover', () => dropZone.classList.add('submit-drop-zone-active'));
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('submit-drop-zone-active'));
  dropZone.addEventListener('drop', e => {
    dropZone.classList.remove('submit-drop-zone-active');
    const file = e.dataTransfer.files[0];
    if (file) {
      fileInput.files = e.dataTransfer.files;
      showPreview(file);
    }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const file = fileInput.files[0];
    const userNotes = notesBox.value.trim();
    if (!file && !userNotes) {
      status.textContent = 'Please attach a screenshot or write a note.';
      status.className = 'submit-status submit-status-error';
      return;
    }

    // The Worker itself doesn't need to know anything about items/monsters/
    // maps — the "regarding" context and chosen zone are just folded into
    // the plain notes text it already handles, as their own labeled lines.
    const notesParts = [];
    if (activeContext) {
      notesParts.push(`Regarding: ${activeContext.kind === 'item' ? 'Item' : 'Monster'} — ${activeContext.name}`);
    }
    if (zoneSelect.value) notesParts.push(`Zone/Map: ${zoneSelect.value}`);
    if (userNotes) notesParts.push(userNotes);

    const formData = new FormData();
    if (file) formData.append('screenshot', file);
    formData.append('notes', notesParts.join('\n'));
    formData.append('website', container.querySelector('#submit-website').value);

    button.disabled = true;
    status.textContent = 'Submitting...';
    status.className = 'submit-status';

    // Only a real, API-provided error message (from a JSON response) is
    // shown verbatim — a raw network/CORS failure (e.g. the browser's own
    // "Failed to fetch") is never surfaced to the visitor as-is, since
    // that's meaningless to a non-technical reader.
    let friendlyError = null;
    try {
      const res = await fetch(SUBMIT_WORKER_URL, { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        friendlyError = data.error || 'Submission failed — please try again.';
      } else {
        form.hidden = true;
        const thanks = document.createElement('p');
        thanks.className = 'submit-status submit-status-success';
        thanks.textContent = file
          ? 'Thanks! Your screenshot has been submitted for review.'
          : 'Thanks! Your note has been submitted for review.';
        form.insertAdjacentElement('afterend', thanks);
        return;
      }
    } catch (err) {
      friendlyError = 'Could not reach the submission service — please check your connection and try again.';
    }
    status.textContent = friendlyError;
    status.className = 'submit-status submit-status-error';
    button.disabled = false;
  });
}

// Minimal full-size image lightbox for the Submit page's example thumbnails
// — same overlay/close-button shell as #monster-viewer, just showing a plain
// <img> instead of a data-rendered card, since there's no card data here.
function setupSampleViewer() {
  if (document.getElementById('sample-viewer')) return;

  const viewer = document.createElement('div');
  viewer.id = 'sample-viewer';
  viewer.innerHTML = `
    <button id="sample-viewer-close" aria-label="Close">&times;</button>
    <img id="sample-viewer-img" alt="Example screenshot, full size">
  `;
  document.body.appendChild(viewer);

  viewer.addEventListener('click', e => {
    if (e.target === viewer) closeSampleViewer();
  });
  viewer.querySelector('#sample-viewer-close').addEventListener('click', closeSampleViewer);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSampleViewer();
  });
}

function openSampleViewer(imageSrc) {
  setupSampleViewer();
  document.getElementById('sample-viewer-img').src = imageSrc;
  document.getElementById('sample-viewer').classList.add('open');
}

function closeSampleViewer() {
  const viewer = document.getElementById('sample-viewer');
  if (viewer) viewer.classList.remove('open');
}

init();
