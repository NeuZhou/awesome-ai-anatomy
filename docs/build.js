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

// Architecture pattern description from meta data
function archPattern(p) {
  const f = p.features || {};
  const loop = f.agent_loop || 'custom';
  // Map known patterns to descriptive strings
  const archMap = {
    'workflow-dag': 'workflow-DAG',
    'custom': 'custom loop',
    'event-driven': 'event-driven',
    'react': 'ReACT loop',
    'plan-execute': 'plan-execute',
  };
  return archMap[loop] || loop;
}

// Security approach description
function securityApproach(p) {
  const f = p.features || {};
  const sec = f.security || {};
  const layers = sec.layers || 0;
  const types = sec.types || [];
  if (layers === 0 && types.length === 0) return 'none';
  return types.join(' + ') + ' (' + layers + ' layer' + (layers !== 1 ? 's' : '') + ')';
}

// Context strategy description
function contextStrategy(p) {
  const f = p.features || {};
  const cm = f.context_management;
  if (!cm || cm === 'none') return 'none';
  return String(cm).replace(/_/g, ' ');
}

// Sandbox description
function sandboxDesc(p) {
  const f = p.features || {};
  return String(f.sandbox || 'none');
}

// Extensions description
function extensionsDesc(p) {
  const f = p.features || {};
  const parts = [];
  if (f.mcp_support) parts.push('MCP');
  if (f.plugin_system) parts.push('plugins');
  return parts.length > 0 ? parts.join(' + ') : 'none';
}

function generateProjectCard(p) {
  const langs = Array.isArray(p.language) ? p.language : [p.language || 'Unknown'];
  const tagsHtml = (p.tags || []).map(t =>
    `<span class="tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`
  ).join('');

  return `
    <a href="${REPO_URL}/tree/main/${p._slug}" target="_blank" class="card" 
       data-tags="${(p.tags || []).join(',')}" 
       data-lang="${langs.join(',')}" 
       data-stars="${p.stars || 0}"
       data-name="${escapeHtml((p.name || p._slug).toLowerCase())}">
      <div class="card-img">
        <img src="https://raw.githubusercontent.com/NeuZhou/awesome-ai-anatomy/main/${p._slug}/architecture.png" alt="${escapeHtml(p.name)} architecture" loading="lazy">
      </div>
      <div class="card-body">
        <div class="card-header">
          <h3>${escapeHtml(p.name)}</h3>
        </div>
        <div class="card-meta">
          <span class="stars">${formatStars(p.stars || 0)}</span>
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
  <title>Awesome AI Anatomy -- Source-Level Teardowns of AI Agent Projects</title>
  <meta name="description" content="${projects.length} AI agent projects dissected -- architecture, patterns, and the decisions nobody bothers to document. Claude Code, Dify, OpenHands, and more.">
  <meta property="og:title" content="Awesome AI Anatomy">
  <meta property="og:description" content="Source-level teardowns of how production AI systems actually work. ${projects.length} projects dissected.">
  <meta property="og:image" content="${REPO_URL}/raw/main/assets/social-preview.png">
  <meta property="og:url" content="https://neuzhou.github.io/awesome-ai-anatomy/">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Awesome AI Anatomy">
  <meta name="twitter:description" content="Source-level teardowns of how production AI systems actually work.">
  <meta name="twitter:image" content="${REPO_URL}/raw/main/assets/social-preview.png">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><text y='32' font-size='32'></text></svg>">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="hero">
    <div class="hero-content">
      <h1>Awesome AI Anatomy</h1>
      <p class="hero-subtitle">We read the source code. All of it. Here's what we found.</p>
      <p class="hero-desc">${projects.length} AI agent projects dissected -- architecture, patterns, and the decisions nobody bothers to document.</p>
      <div class="hero-links">
        <a href="${REPO_URL}" class="btn btn-primary" target="_blank">Star on GitHub</a>
        <a href="comparison.html" class="btn btn-secondary">Compare All</a>
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
          <label>Sort By</label>
          <select id="sort-by">
            <option value="stars">Stars</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>
      <div class="filter-presets" id="filter-presets"></div>
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
    <p>Built by <a href="https://github.com/NeuZhou" target="_blank">NeuZhou</a> | 
    <a href="${REPO_URL}" target="_blank">GitHub</a> | 
    <a href="${REPO_URL}/blob/main/CONTRIBUTING.md" target="_blank">Contribute</a></p>
  </footer>

  <script src="app.js"></script>
</body>
</html>`;

// Generate comparison.html
function generateComparisonRow(p) {
  const langs = Array.isArray(p.language) ? p.language.join(', ') : (p.language || '');
  const f = p.features || {};

  return `          <tr>
            <td data-label="Project"><a href="${REPO_URL}/tree/main/${p._slug}" target="_blank">${escapeHtml(p.name)}</a></td>
            <td data-label="Stars">${formatStars(p.stars || 0)}</td>
            <td data-label="Language">${escapeHtml(langs)}</td>
            <td data-label="Architecture">${escapeHtml(archPattern(p))}</td>
            <td data-label="Security">${escapeHtml(securityApproach(p))}</td>
            <td data-label="Context">${escapeHtml(contextStrategy(p))}</td>
            <td data-label="Sandbox">${escapeHtml(sandboxDesc(p))}</td>
            <td data-label="Extensions">${escapeHtml(extensionsDesc(p))}</td>
            <td data-label="Key Finding" class="key-finding-cell">${escapeHtml(p.key_finding || '')}</td>
          </tr>`;
}

const comparisonHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Comparison -- Awesome AI Anatomy</title>
  <meta name="description" content="${projects.length} AI agent projects compared on architecture, security, context strategy, and extensions -- based on source code, not README claims.">
  <meta property="og:title" content="AI Agent Comparison -- Awesome AI Anatomy">
  <meta property="og:description" content="${projects.length} AI agent projects compared side-by-side on real engineering decisions.">
  <meta property="og:image" content="${REPO_URL}/raw/main/assets/social-preview.png">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><text y='32' font-size='32'></text></svg>">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <nav class="top-nav">
    <a href="index.html" class="nav-back">Back to Projects</a>
    <a href="${REPO_URL}" class="nav-github" target="_blank">GitHub</a>
  </nav>

  <main class="comparison-page">
    <h1>Project Comparison</h1>
    <p class="comparison-desc">Every AI agent README says it's fast, extensible, and secure. This table cuts through that. We compared each project on architecture patterns, security approach, and context strategy based on what's actually in the source -- not what the landing page claims.</p>

    <div class="table-wrapper">
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Stars</th>
            <th>Language</th>
            <th>Architecture Pattern</th>
            <th>Security Approach</th>
            <th>Context Strategy</th>
            <th>Sandbox</th>
            <th>Extensions</th>
            <th>Key Finding</th>
          </tr>
        </thead>
        <tbody>
${projects.map(generateComparisonRow).join('\n')}
        </tbody>
      </table>
    </div>

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
                <td>${escapeHtml(String(f.context_management || 'none').replace(/_/g, ' '))}</td>
                <td>${f.stuck_detection ? 'yes' : '--'}</td>
                <td>${f.providers?.count || f.provider_count || 0}</td>
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
    <p>Built by <a href="https://github.com/NeuZhou" target="_blank">NeuZhou</a> | 
    <a href="${REPO_URL}" target="_blank">GitHub</a></p>
  </footer>
</body>
</html>`;

// Write files
fs.writeFileSync(path.join(DOCS, 'index.html'), indexHtml);
fs.writeFileSync(path.join(DOCS, 'comparison.html'), comparisonHtml);

console.log(`Generated index.html with ${projects.length} projects`);
console.log(`Generated comparison.html`);
