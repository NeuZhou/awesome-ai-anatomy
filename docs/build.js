// Build script: reads meta.yaml files and generates static HTML pages
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOCS = __dirname;
const PROJECTS = [
  'dify', 'claude-code', 'openhands', 'deer-flow', 'mirofish', 'goose',
  'pi-mono', 'mempalace', 'lightpanda-browser', 'hermes-agent',
  'oh-my-claudecode', 'oh-my-codex', 'guardrails-ai', 'codex-cli', 'cline'
];

const REPO_URL = 'https://github.com/NeuZhou/awesome-ai-anatomy';

// Simple YAML parser for our specific schema
function parseYaml(text) {
  const obj = {};
  const lines = text.split('\n');
  let currentKey = null;
  let currentSubKey = null;
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);

    if (indent === 0 && line.includes(':')) {
      const colonIdx = line.indexOf(':');
      const key = line.substring(0, colonIdx).trim();
      const val = line.substring(colonIdx + 1).trim();
      currentKey = key;
      currentSubKey = null;

      if (val === '') {
        // Could be object or list - peek at next line
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.trim().startsWith('-')) {
          obj[key] = [];
          inList = true;
        } else {
          obj[key] = {};
          inList = false;
        }
      } else {
        obj[key] = cleanVal(val);
        inList = false;
      }
    } else if (indent > 0 && line.trim().startsWith('-')) {
      const val = line.trim().substring(1).trim();
      if (Array.isArray(obj[currentKey])) {
        obj[currentKey].push(cleanVal(val));
      }
    } else if (indent > 0 && line.includes(':')) {
      const colonIdx = line.indexOf(':');
      const key = line.substring(0, colonIdx).trim();
      const val = line.substring(colonIdx + 1).trim();
      if (typeof obj[currentKey] === 'object' && !Array.isArray(obj[currentKey])) {
        obj[currentKey][key] = cleanVal(val);
      }
    }
  }
  return obj;
}

function cleanVal(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'none') return 'none';
  // Remove quotes
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  // Remove inline comments
  const commentIdx = v.indexOf(' #');
  if (commentIdx > 0) v = v.substring(0, commentIdx).trim();
  // Number
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  return v;
}

// Read all project data
const projects = [];
for (const proj of PROJECTS) {
  const metaPath = path.join(ROOT, proj, 'meta.yaml');
  if (!fs.existsSync(metaPath)) {
    console.warn(`Missing meta.yaml for ${proj}`);
    continue;
  }
  const text = fs.readFileSync(metaPath, 'utf8');
  const meta = parseYaml(text);
  meta._slug = proj;
  projects.push(meta);
}

// Sort by stars descending
projects.sort((a, b) => (b.stars || 0) - (a.stars || 0));

// Rating to numeric for sorting/display
function ratingToNum(r) {
  const map = { 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D': 1.0, 'F': 0 };
  return map[r] || 0;
}

function ratingColor(r) {
  const n = ratingToNum(r);
  if (n >= 3.7) return '#3fb950';
  if (n >= 3.0) return '#58a6ff';
  if (n >= 2.3) return '#d29922';
  return '#f85149';
}

// Collect all tags and languages
const allTags = new Set();
const allLangs = new Set();
for (const p of projects) {
  if (p.tags) p.tags.forEach(t => allTags.add(t));
  if (p.language) {
    const langs = Array.isArray(p.language) ? p.language : [p.language];
    langs.forEach(l => allLangs.add(l));
  }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatStars(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function generateProjectCard(p) {
  const langs = Array.isArray(p.language) ? p.language : [p.language || 'Unknown'];
  const overall = p.ratings?.overall || 'N/A';
  const tagsHtml = (p.tags || []).map(t =>
    `<span class="tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`
  ).join('');

  return `
    <a href="${REPO_URL}/tree/main/${p._slug}" target="_blank" class="card" 
       data-tags="${(p.tags || []).join(',')}" 
       data-lang="${langs.join(',')}" 
       data-rating="${overall}"
       data-stars="${p.stars || 0}"
       data-name="${escapeHtml((p.name || p._slug).toLowerCase())}">
      <div class="card-img">
        <img src="../${p._slug}/architecture.png" alt="${escapeHtml(p.name)} architecture" loading="lazy">
      </div>
      <div class="card-body">
        <div class="card-header">
          <h3>${escapeHtml(p.name)}</h3>
          <span class="rating" style="background:${ratingColor(overall)}">${overall}</span>
        </div>
        <div class="card-meta">
          <span class="stars">⭐ ${formatStars(p.stars || 0)}</span>
          <span class="lang">${langs.map(l => `<span class="lang-badge">${escapeHtml(l)}</span>`).join(' ')}</span>
        </div>
        <p class="key-finding">${escapeHtml(p.key_finding || '')}</p>
        <div class="card-tags">${tagsHtml}</div>
      </div>
    </a>`;
}

// Generate index.html
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Awesome AI Anatomy — Source-Level Teardowns of AI Agent Projects</title>
  <meta name="description" content="15 AI agent projects dissected — architecture diagrams, design patterns, and the engineering decisions nobody documents. Claude Code, Dify, OpenHands, and more.">
  <meta property="og:title" content="Awesome AI Anatomy">
  <meta property="og:description" content="Source-level teardowns of how production AI systems actually work. 15 projects dissected.">
  <meta property="og:image" content="${REPO_URL}/raw/main/assets/social-preview.png">
  <meta property="og:url" content="https://neuzhou.github.io/awesome-ai-anatomy/">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Awesome AI Anatomy">
  <meta name="twitter:description" content="Source-level teardowns of how production AI systems actually work.">
  <meta name="twitter:image" content="${REPO_URL}/raw/main/assets/social-preview.png">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><text y='32' font-size='32'>🔬</text></svg>">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="hero">
    <div class="hero-content">
      <h1>🔬 Awesome AI Anatomy</h1>
      <p class="hero-subtitle">We read the source code. All of it. Here's what we found.</p>
      <p class="hero-desc">${projects.length} AI agent projects dissected — architecture diagrams, design patterns, and the engineering decisions nobody documents.</p>
      <div class="hero-links">
        <a href="${REPO_URL}" class="btn btn-primary" target="_blank">⭐ Star on GitHub</a>
        <a href="comparison.html" class="btn btn-secondary">📊 Compare All</a>
      </div>
    </div>
  </header>

  <main>
    <section class="filters">
      <div class="search-box">
        <input type="text" id="search" placeholder="Search projects..." autocomplete="off">
      </div>
      <div class="filter-row">
        <div class="filter-group">
          <label>Language</label>
          <select id="filter-lang">
            <option value="">All Languages</option>
            ${[...allLangs].sort().map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join('\n            ')}
          </select>
        </div>
        <div class="filter-group">
          <label>Min Rating</label>
          <select id="filter-rating">
            <option value="">Any Rating</option>
            <option value="A">A and above</option>
            <option value="A-">A- and above</option>
            <option value="B+">B+ and above</option>
            <option value="B">B and above</option>
            <option value="B-">B- and above</option>
            <option value="C+">C+ and above</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Sort By</label>
          <select id="sort-by">
            <option value="stars">Stars ↓</option>
            <option value="rating">Rating ↓</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>
      <div class="active-tags" id="active-tags"></div>
    </section>

    <section class="grid" id="project-grid">
      ${projects.map(generateProjectCard).join('\n')}
    </section>

    <div class="no-results" id="no-results" style="display:none">
      <p>No projects match your filters. Try adjusting your search.</p>
    </div>
  </main>

  <footer>
    <p>Built with ❤️ by <a href="https://github.com/NeuZhou" target="_blank">NeuZhou</a> · 
    <a href="${REPO_URL}" target="_blank">GitHub</a> · 
    <a href="${REPO_URL}/blob/main/CONTRIBUTING.md" target="_blank">Contribute</a></p>
  </footer>

  <script src="app.js"></script>
</body>
</html>`;

// Generate comparison.html
function generateComparisonTable() {
  const sorted = [...projects].sort((a, b) => (b.stars || 0) - (a.stars || 0));

  const rows = sorted.map(p => {
    const langs = Array.isArray(p.language) ? p.language.join(', ') : (p.language || '');
    const overall = p.ratings?.overall || 'N/A';
    const arch = p.ratings?.architecture || 'N/A';
    const code = p.ratings?.code_quality || 'N/A';
    const sec = p.ratings?.security || 'N/A';
    const f = p.features || {};

    return `<tr>
      <td><a href="${REPO_URL}/tree/main/${p._slug}" target="_blank">${escapeHtml(p.name)}</a></td>
      <td>${formatStars(p.stars || 0)}</td>
      <td>${escapeHtml(langs)}</td>
      <td><span class="rating-cell" style="color:${ratingColor(overall)}">${overall}</span></td>
      <td><span class="rating-cell" style="color:${ratingColor(arch)}">${arch}</span></td>
      <td><span class="rating-cell" style="color:${ratingColor(code)}">${code}</span></td>
      <td><span class="rating-cell" style="color:${ratingColor(sec)}">${sec}</span></td>
      <td>${escapeHtml(String(f.sandbox || 'none'))}</td>
      <td>${f.multi_agent ? '✅' : '❌'}</td>
      <td>${f.mcp_support ? '✅' : '❌'}</td>
      <td>${f.plugin_system ? '✅' : '❌'}</td>
      <td>${escapeHtml(String(f.security_layers || 0))}</td>
      <td class="key-finding-cell">${escapeHtml(p.key_finding || '')}</td>
    </tr>`;
  }).join('\n');

  return rows;
}

const comparisonHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Comparison — Awesome AI Anatomy</title>
  <meta name="description" content="Side-by-side comparison of 15 AI agent projects: ratings, features, architecture, and security.">
  <meta property="og:title" content="AI Agent Comparison — Awesome AI Anatomy">
  <meta property="og:description" content="Side-by-side comparison of 15 AI agent projects.">
  <meta property="og:image" content="${REPO_URL}/raw/main/assets/social-preview.png">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><text y='32' font-size='32'>🔬</text></svg>">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <nav class="top-nav">
    <a href="index.html" class="nav-back">← Back to Projects</a>
    <a href="${REPO_URL}" class="nav-github" target="_blank">GitHub</a>
  </nav>

  <main class="comparison-page">
    <h1>📊 Project Comparison</h1>
    <p class="comparison-desc">${projects.length} projects compared across ratings, features, and architecture decisions.</p>

    <div class="table-wrapper">
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Stars</th>
            <th>Language</th>
            <th>Overall</th>
            <th>Arch</th>
            <th>Code</th>
            <th>Security</th>
            <th>Sandbox</th>
            <th>Multi-Agent</th>
            <th>MCP</th>
            <th>Plugins</th>
            <th>Sec Layers</th>
            <th>Key Finding</th>
          </tr>
        </thead>
        <tbody>
          ${generateComparisonTable()}
        </tbody>
      </table>
    </div>

    <section class="comparison-charts">
      <h2>Rating Distribution</h2>
      <div class="chart-grid">
        ${projects.map(p => {
          const overall = p.ratings?.overall || 'N/A';
          const pct = (ratingToNum(overall) / 4.0 * 100).toFixed(0);
          return `<div class="bar-item">
            <span class="bar-label">${escapeHtml(p.name)}</span>
            <div class="bar-track">
              <div class="bar-fill" style="width:${pct}%; background:${ratingColor(overall)}"></div>
            </div>
            <span class="bar-value" style="color:${ratingColor(overall)}">${overall}</span>
          </div>`;
        }).join('\n        ')}
      </div>
    </section>

    <section class="comparison-charts">
      <h2>Feature Matrix</h2>
      <div class="table-wrapper">
        <table class="feature-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Context Mgmt</th>
              <th>Stuck Detection</th>
              <th>Provider Count</th>
              <th>License</th>
              <th>LOC</th>
            </tr>
          </thead>
          <tbody>
            ${projects.map(p => {
              const f = p.features || {};
              return `<tr>
                <td>${escapeHtml(p.name)}</td>
                <td>${escapeHtml(String(f.context_management || 'none'))}</td>
                <td>${f.stuck_detection ? '✅' : '❌'}</td>
                <td>${f.provider_count || 0}</td>
                <td>${escapeHtml(p.license || 'N/A')}</td>
                <td>${(p.loc || 0).toLocaleString()}</td>
              </tr>`;
            }).join('\n')}
          </tbody>
        </table>
      </div>
    </section>
  </main>

  <footer>
    <p>Built with ❤️ by <a href="https://github.com/NeuZhou" target="_blank">NeuZhou</a> · 
    <a href="${REPO_URL}" target="_blank">GitHub</a></p>
  </footer>
</body>
</html>`;

// Write files
fs.writeFileSync(path.join(DOCS, 'index.html'), indexHtml);
fs.writeFileSync(path.join(DOCS, 'comparison.html'), comparisonHtml);

console.log(`Generated index.html with ${projects.length} projects`);
console.log(`Generated comparison.html`);
