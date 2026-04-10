// Awesome AI Anatomy — Client-side filtering, search, tag clicks
(function () {
  'use strict';

  const searchInput = document.getElementById('search');
  const langSelect = document.getElementById('filter-lang');
  const ratingSelect = document.getElementById('filter-rating');
  const sortSelect = document.getElementById('sort-by');
  const grid = document.getElementById('project-grid');
  const noResults = document.getElementById('no-results');
  const activeTagsEl = document.getElementById('active-tags');

  const cards = Array.from(grid.querySelectorAll('.card'));
  let activeTags = new Set();

  const ratingMap = {
    'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D': 1.0, 'F': 0, 'N/A': -1
  };

  function ratingToNum(r) {
    return ratingMap[r] || 0;
  }

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

      // Search
      if (query) {
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

  function applySorting() {
    const sortBy = sortSelect.value;

    const sorted = [...cards].sort((a, b) => {
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

  // Event listeners
  searchInput.addEventListener('input', applyFilters);
  langSelect.addEventListener('change', applyFilters);
  ratingSelect.addEventListener('change', applyFilters);
  sortSelect.addEventListener('change', () => {
    applySorting();
    applyFilters();
  });

  // Tag click handling
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

})();
