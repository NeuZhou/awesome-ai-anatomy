// Awesome AI Anatomy — Client-side filtering, search, tag clicks, editorial scoring
(function () {
  'use strict';

  // ── DOM Elements ──────────────────────────────────────────────
  const searchInput = document.getElementById('search');
  const langSelect = document.getElementById('filter-lang');
  const ratingSelect = document.getElementById('filter-rating');
  const sortSelect = document.getElementById('sort-by');
  const grid = document.getElementById('project-grid');
  const noResults = document.getElementById('no-results');
  const activeTagsEl = document.getElementById('active-tags');
  const presetBar = document.getElementById('filter-presets');

  const cards = Array.from(grid.querySelectorAll('.card'));
  let activeTags = new Set();
  let activePreset = 'all';

  // ── Rating Conversion ─────────────────────────────────────────
  // Letter grades → GPA-style numeric (A=4.0 down to F=0)
  const ratingMap = {
    'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D': 1.0, 'F': 0, 'N/A': -1
  };

  function ratingToNum(r) {
    return ratingMap[r] || 0;
  }

  // ── Editorial Score Formula ───────────────────────────────────
  // Composite score: editorial rating dominates, stars contribute
  // on log scale, and rich key findings get a small bonus.
  //
  // Stars ≠ quality. MiroFish has 50K stars but C rating.
  // The formula ensures a B+ with 6K stars (Guardrails AI) can
  // outscore a C with 50K stars (MiroFish).
  //
  // Components (out of ~100):
  //   Rating:        0-60 pts  (60% weight — our editorial judgment)
  //   Log stars:     0-25 pts  (25% weight — community signal, log dampened)
  //   Finding bonus: 0-15 pts  (15% weight — teardown richness)
  //
  // Formula:
  //   rating_score  = (ratingNum / 4.0) * 60
  //   star_score    = (log10(stars) / log10(150000)) * 25
  //   finding_score = finding length buckets (0/5/10/15)
  //   total         = rating_score + star_score + finding_score
  //
  function computeEditorialScore(card) {
    const ratingNum = ratingToNum(card.dataset.rating);
    const stars = parseInt(card.dataset.stars) || 0;
    const findingText = (card.querySelector('.key-finding')?.textContent || '').trim();

    // Rating component: 0–60 pts (A=60, A-=55.5, B+=49.5, ..., C=30)
    const ratingScore = (ratingNum / 4.0) * 60;

    // Stars component: logarithmic scale, 0–25 pts
    // log10(1) = 0, log10(150000) ≈ 5.18 → normalize to 25
    const maxLogStars = Math.log10(150000); // ~5.18
    const starScore = stars > 0
      ? Math.min((Math.log10(stars) / maxLogStars) * 25, 25)
      : 0;

    // Finding richness bonus: longer/richer findings = better teardown
    // Based on character count of the key_finding text
    let findingScore = 0;
    if (findingText.length > 60) findingScore = 15;       // Rich finding
    else if (findingText.length > 40) findingScore = 10;   // Good finding
    else if (findingText.length > 20) findingScore = 5;    // Some finding
    // else 0 — minimal/no finding

    return ratingScore + starScore + findingScore;
  }

  // Pre-compute editorial scores and store on each card's dataset
  cards.forEach(card => {
    card.dataset.editorialScore = computeEditorialScore(card).toFixed(2);
  });

  // ── Staff Picks ───────────────────────────────────────────────
  // Hand-curated based on: rating quality, teardown depth,
  // uniqueness of findings, and educational value.
  //
  // Claude Code (A-): 4-layer context cascade, hidden pet system — unique findings
  // Codex CLI (A):    Queue-pair arch, Guardian AI, 3-OS sandbox — highest rated
  // Goose (A-):       MCP-first design, 5-inspector pipeline — clean architecture
  // OpenHands (B+):   10 condensers, 3-layer security — most comprehensive context mgmt
  const STAFF_PICKS = new Set([
    'claude code',
    'openai codex cli',
    'goose',
    'openhands'
  ]);

  // Inject staff pick badges into card headers
  cards.forEach(card => {
    const name = card.dataset.name || '';
    if (STAFF_PICKS.has(name)) {
      card.dataset.staffPick = 'true';
      const header = card.querySelector('.card-header');
      if (header) {
        const badge = document.createElement('span');
        badge.className = 'staff-pick-badge';
        badge.title = 'Staff Pick — Outstanding teardown';
        badge.textContent = '⭐ Staff Pick';
        // Insert before the rating badge
        const ratingEl = header.querySelector('.rating');
        header.insertBefore(badge, ratingEl);
      }
    }
  });

  // ── Filter Presets ────────────────────────────────────────────
  // Quick-access buttons for common browsing patterns
  const PRESETS = {
    all: {
      label: 'All',
      filter: () => true
    },
    coding: {
      label: '💻 Coding Agents',
      filter: (card) => {
        const tags = card.dataset.tags || '';
        return tags.includes('coding-agent');
      }
    },
    'top-rated': {
      label: '🏆 Top Rated',
      filter: (card) => {
        const r = ratingToNum(card.dataset.rating);
        return r >= 3.7; // A or A-
      }
    },
    'hidden-gems': {
      label: '💎 Hidden Gems',
      filter: (card) => {
        const r = ratingToNum(card.dataset.rating);
        const stars = parseInt(card.dataset.stars) || 0;
        // High quality (B+ or above) + lower star count (< 30K)
        return r >= 3.3 && stars < 30000;
      }
    }
  };

  // ── Preset Button Rendering ───────────────────────────────────
  function renderPresets() {
    if (!presetBar) return;
    presetBar.innerHTML = '';
    Object.entries(PRESETS).forEach(([key, preset]) => {
      const btn = document.createElement('button');
      btn.className = 'preset-btn' + (activePreset === key ? ' active' : '');
      btn.textContent = preset.label;
      btn.addEventListener('click', () => {
        activePreset = key;
        renderPresets();
        applyFilters();
      });
      presetBar.appendChild(btn);
    });
  }

  // ── Filtering Logic ───────────────────────────────────────────
  function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();
    const lang = langSelect.value;
    const minRating = ratingSelect.value;
    const minRatingNum = minRating ? ratingToNum(minRating) : -Infinity;

    let visibleCount = 0;

    cards.forEach(card => {
      const name = card.dataset.name || '';
      const tags = card.dataset.tags || '';
      const cardLangs = card.dataset.lang || '';
      const rating = card.dataset.rating || '';
      const keyFinding = (card.querySelector('.key-finding')?.textContent || '').toLowerCase();

      let show = true;

      // Preset filter (applied first)
      if (activePreset !== 'all' && PRESETS[activePreset]) {
        if (!PRESETS[activePreset].filter(card)) show = false;
      }

      // Search
      if (query && show) {
        const searchable = name + ' ' + tags.replace(/,/g, ' ') + ' ' + keyFinding;
        if (!searchable.includes(query)) show = false;
      }

      // Language filter
      if (lang && show) {
        if (!cardLangs.split(',').includes(lang)) show = false;
      }

      // Rating filter
      if (minRating && show) {
        if (ratingToNum(rating) < minRatingNum) show = false;
      }

      // Tag filter
      if (activeTags.size > 0 && show) {
        const cardTagSet = new Set(tags.split(',').filter(Boolean));
        for (const t of activeTags) {
          if (!cardTagSet.has(t)) { show = false; break; }
        }
      }

      card.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });

    noResults.style.display = visibleCount === 0 ? '' : 'none';
  }

  // ── Sorting Logic ─────────────────────────────────────────────
  function applySorting() {
    const sortBy = sortSelect.value;

    const sorted = [...cards].sort((a, b) => {
      if (sortBy === 'editorial') {
        // Default: editorial score (composite of rating + log stars + finding richness)
        return parseFloat(b.dataset.editorialScore) - parseFloat(a.dataset.editorialScore);
      }
      if (sortBy === 'stars') {
        return (parseInt(b.dataset.stars) || 0) - (parseInt(a.dataset.stars) || 0);
      }
      if (sortBy === 'rating') {
        return ratingToNum(b.dataset.rating) - ratingToNum(a.dataset.rating);
      }
      if (sortBy === 'name') {
        return (a.dataset.name || '').localeCompare(b.dataset.name || '');
      }
      return 0;
    });

    sorted.forEach(card => grid.appendChild(card));
  }

  // ── Active Tag Chips ──────────────────────────────────────────
  function renderActiveTags() {
    activeTagsEl.innerHTML = '';
    activeTags.forEach(tag => {
      const el = document.createElement('span');
      el.className = 'active-tag';
      el.innerHTML = `${tag} <span class="remove">×</span>`;
      el.addEventListener('click', () => {
        activeTags.delete(tag);
        renderActiveTags();
        applyFilters();
      });
      activeTagsEl.appendChild(el);
    });
  }

  // ── Event Listeners ───────────────────────────────────────────
  searchInput.addEventListener('input', applyFilters);
  langSelect.addEventListener('change', applyFilters);
  ratingSelect.addEventListener('change', applyFilters);
  sortSelect.addEventListener('change', () => {
    applySorting();
    applyFilters();
  });

  // Tag click handling (on cards)
  grid.addEventListener('click', (e) => {
    const tagEl = e.target.closest('.tag');
    if (tagEl) {
      e.preventDefault();
      e.stopPropagation();
      const tag = tagEl.dataset.tag;
      if (tag) {
        if (activeTags.has(tag)) {
          activeTags.delete(tag);
        } else {
          activeTags.add(tag);
        }
        renderActiveTags();
        applyFilters();
      }
    }
  });

  // ── Initialize ────────────────────────────────────────────────
  renderPresets();
  applySorting();   // Apply editorial score sort on page load
  applyFilters();

})();
