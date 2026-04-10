// Awesome AI Anatomy -- Client-side filtering, search, tag clicks
(function () {
  'use strict';

  // -- DOM Elements --
  const searchInput = document.getElementById('search');
  const langSelect = document.getElementById('filter-lang');
  const sortSelect = document.getElementById('sort-by');
  const grid = document.getElementById('project-grid');
  const noResults = document.getElementById('no-results');
  const activeTagsEl = document.getElementById('active-tags');
  const presetBar = document.getElementById('filter-presets');

  const cards = Array.from(grid.querySelectorAll('.card'));
  let activeTags = new Set();
  let activePreset = 'all';

  // -- Staff Picks --
  // Hand-curated based on: teardown depth, uniqueness of findings,
  // and educational value.
  const STAFF_PICKS = new Set([
    'claude code',
    'openai codex cli',
    'goose',
    'openhands'
  ]);

  // Inject staff pick badges into card headers
  cards.forEach(function (card) {
    var name = card.dataset.name || '';
    if (STAFF_PICKS.has(name)) {
      card.dataset.staffPick = 'true';
      var header = card.querySelector('.card-header');
      if (header) {
        var badge = document.createElement('span');
        badge.className = 'staff-pick-badge';
        badge.title = 'Staff Pick -- Outstanding teardown';
        badge.textContent = 'Staff Pick';
        header.appendChild(badge);
      }
    }
  });

  // -- Filter Presets --
  var PRESETS = {
    all: {
      label: 'All',
      filter: function () { return true; }
    },
    coding: {
      label: 'Coding Agents',
      filter: function (card) {
        var tags = card.dataset.tags || '';
        return tags.indexOf('coding-agent') !== -1;
      }
    },
    'hidden-gems': {
      label: 'Hidden Gems',
      filter: function (card) {
        var stars = parseInt(card.dataset.stars, 10) || 0;
        return stars < 30000;
      }
    }
  };

  // -- Preset Button Rendering --
  function renderPresets() {
    if (!presetBar) return;
    presetBar.innerHTML = '';
    Object.keys(PRESETS).forEach(function (key) {
      var preset = PRESETS[key];
      var btn = document.createElement('button');
      btn.className = 'preset-btn' + (activePreset === key ? ' active' : '');
      btn.textContent = preset.label;
      btn.addEventListener('click', function () {
        activePreset = key;
        renderPresets();
        applyFilters();
      });
      presetBar.appendChild(btn);
    });
  }

  // -- Filtering Logic --
  function applyFilters() {
    var query = searchInput.value.toLowerCase().trim();
    var lang = langSelect.value;
    var visibleCount = 0;

    cards.forEach(function (card) {
      var name = card.dataset.name || '';
      var tags = card.dataset.tags || '';
      var cardLangs = card.dataset.lang || '';
      var keyFinding = (card.querySelector('.key-finding') ? card.querySelector('.key-finding').textContent : '').toLowerCase();
      var show = true;

      // Preset filter
      if (activePreset !== 'all' && PRESETS[activePreset]) {
        if (!PRESETS[activePreset].filter(card)) show = false;
      }

      // Search
      if (query && show) {
        var searchable = name + ' ' + tags.replace(/,/g, ' ') + ' ' + keyFinding;
        if (searchable.indexOf(query) === -1) show = false;
      }

      // Language filter
      if (lang && show) {
        if (cardLangs.split(',').indexOf(lang) === -1) show = false;
      }

      // Tag filter
      if (activeTags.size > 0 && show) {
        var cardTagSet = {};
        tags.split(',').forEach(function (t) { if (t) cardTagSet[t] = true; });
        activeTags.forEach(function (t) {
          if (!cardTagSet[t]) show = false;
        });
      }

      card.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });

    noResults.style.display = visibleCount === 0 ? '' : 'none';
  }

  // -- Sorting Logic --
  function applySorting() {
    var sortBy = sortSelect.value;
    var sorted = cards.slice().sort(function (a, b) {
      if (sortBy === 'stars') {
        return (parseInt(b.dataset.stars, 10) || 0) - (parseInt(a.dataset.stars, 10) || 0);
      }
      if (sortBy === 'name') {
        return (a.dataset.name || '').localeCompare(b.dataset.name || '');
      }
      return 0;
    });
    sorted.forEach(function (card) { grid.appendChild(card); });
  }

  // -- Active Tag Chips --
  function renderActiveTags() {
    activeTagsEl.innerHTML = '';
    activeTags.forEach(function (tag) {
      var el = document.createElement('span');
      el.className = 'active-tag';
      var text = document.createTextNode(tag + ' ');
      var remove = document.createElement('span');
      remove.className = 'remove';
      remove.textContent = 'x';
      el.appendChild(text);
      el.appendChild(remove);
      el.addEventListener('click', function () {
        activeTags.delete(tag);
        renderActiveTags();
        applyFilters();
      });
      activeTagsEl.appendChild(el);
    });
  }

  // -- Event Listeners --
  searchInput.addEventListener('input', applyFilters);
  langSelect.addEventListener('change', applyFilters);
  sortSelect.addEventListener('change', function () {
    applySorting();
    applyFilters();
  });

  // Tag click handling (on cards)
  grid.addEventListener('click', function (e) {
    var tagEl = e.target.closest('.tag');
    if (tagEl) {
      e.preventDefault();
      e.stopPropagation();
      var tag = tagEl.dataset.tag;
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

  // -- Initialize --
  renderPresets();
  applySorting();   // Sort by stars on page load (default)
  applyFilters();

})();
