// --- Admin Shared Utilities ---

// Fetch wrapper: auto-handles 401 redirect to login
async function fetchAPI(path, options) {
  var opts = Object.assign({ credentials: 'same-origin' }, options || {});
  if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    opts.body = JSON.stringify(opts.body);
  }
  var res = await fetch(path, opts);
  if (res.status === 401) {
    window.location.href = '/admin/login.html';
    throw new Error('Session expirée');
  }
  return res;
}

// Get current admin info
async function getCurrentAdmin() {
  var res = await fetchAPI('/api/admin/me');
  if (!res.ok) return null;
  return res.json();
}

// Logout
async function logout() {
  await fetchAPI('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login.html';
}

// Format date to French locale
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

// Format date short
function formatDateShort(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

// Status badge HTML
function statusBadge(status) {
  var labels = {
    'new': 'Nouveau',
    'contacte': 'Contacté',
    'entretien': 'Entretien',
    'valide': 'Validé',
    'refuse': 'Refusé',
  };
  var colors = {
    'new': '#2EA3E0',
    'contacte': '#F39C12',
    'entretien': '#9B59B6',
    'valide': '#27AE60',
    'refuse': '#E74C3C',
  };
  var label = labels[status] || status;
  var color = colors[status] || '#8A94A6';
  return '<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;background:' + color + '20;color:' + color + '">' + label + '</span>';
}

// Contract type labels
function contractLabel(type) {
  var labels = { 'CDI': 'CDI', 'CDD': 'CDD', 'Stage': 'Stage', 'Alternance': 'Alternance' };
  return labels[type] || type;
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Sanitize HTML — strip dangerous tags and event handlers, keep safe formatting
function sanitizeHtml(html) {
  if (!html) return '';
  var tmp = document.createElement('div');
  tmp.innerHTML = html;
  tmp.querySelectorAll('script, iframe, object, embed, form, input, textarea, select, button, link, meta, style').forEach(function(el) { el.remove(); });
  tmp.querySelectorAll('*').forEach(function(el) {
    Array.from(el.attributes).forEach(function(attr) {
      if (attr.name.startsWith('on') || (attr.name === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:'))) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return tmp.innerHTML;
}

// Force light mode on admin pages
function initAdminTheme() {
  document.documentElement.classList.add('light');
}

// Inject admin navigation sidebar
function renderAdminNav(currentPage) {
  initAdminTheme();

  var navItems = [
    { href: '/admin/', label: 'Dashboard', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>' },
    { href: '/admin/jobs.html', label: 'Offres', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' },
    { href: '/admin/applications.html', label: 'Candidatures', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
    { href: '/admin/settings.html', label: 'Paramètres', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' },
  ];

  var nav = document.createElement('nav');
  nav.className = 'admin-nav';
  var html = '<div class="admin-nav-logo"><img src="/assets/Wohm - Light.png" alt="WOHM" style="height:28px"></div>';
  html += '<div class="admin-nav-links">';
  navItems.forEach(function(item) {
    var active = currentPage === item.href ? ' active' : '';
    html += '<a href="' + item.href + '" class="admin-nav-link' + active + '"><span class="nav-icon">' + item.icon + '</span><span class="nav-label">' + item.label + '</span></a>';
  });
  html += '</div>';
  html += '<div class="admin-nav-footer">';
  html += '<button class="admin-nav-logout" id="btn-logout"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg><span class="nav-label">Déconnexion</span></button>';
  html += '</div>';
  nav.innerHTML = html;
  document.body.insertBefore(nav, document.body.firstChild);

  // Mobile hamburger toggle
  var hamburger = document.createElement('button');
  hamburger.className = 'admin-hamburger';
  hamburger.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  document.body.insertBefore(hamburger, document.body.firstChild);

  hamburger.addEventListener('click', function() {
    nav.classList.toggle('open');
  });

  // Close nav when clicking outside on mobile
  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 768 && nav.classList.contains('open') && !nav.contains(e.target) && e.target !== hamburger && !hamburger.contains(e.target)) {
      nav.classList.remove('open');
    }
  });

  // Close nav when clicking a link on mobile
  nav.querySelectorAll('.admin-nav-link').forEach(function(link) {
    link.addEventListener('click', function() {
      if (window.innerWidth <= 768) nav.classList.remove('open');
    });
  });

  document.getElementById('btn-logout').addEventListener('click', logout);

  // Start polling for new application count badge
  startBadgePolling();
}

// Badge polling: show unread application count in browser tab title
var _badgeIntervalId = null;
var _badgeOriginalTitle = '';

function startBadgePolling() {
  _badgeOriginalTitle = document.title;

  async function updateBadge() {
    if (document.hidden) return;
    try {
      var res = await fetch('/api/admin/applications/new-count', { credentials: 'same-origin' });
      if (!res.ok) return;
      var data = await res.json();
      var count = data.count || 0;
      if (count > 0) {
        document.title = '(' + count + ') ' + _badgeOriginalTitle;
      } else {
        document.title = _badgeOriginalTitle;
      }
    } catch (e) {
      // Silently ignore network errors
    }
  }

  updateBadge();
  _badgeIntervalId = setInterval(updateBadge, 60000);
}

// Shared admin CSS (injected once)
function injectAdminStyles() {
  var style = document.createElement('style');
  style.textContent = [
    '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }',
    ':root { --blue: #2EA3E0; --deep: #060A13; --surface: #0B1120; --text: #E8EDF5; --text-muted: #8A94A6; --border: #1A2235; --error: #E74C3C; --success: #27AE60; }',
    'html.light { --deep: #F5F7FA; --surface: #FFFFFF; --text: #1A1A2E; --text-muted: #6B7280; --border: #E5E7EB; }',
    'html.light .admin-nav { background: #FFFFFF; border-right-color: #E5E7EB; }',
    'html.light .admin-nav-link:hover { background: #F3F4F6; }',
    'html.light .admin-nav-link.active { background: #2EA3E015; }',
    'html.light .admin-hamburger { background: #FFFFFF; border-color: #E5E7EB; color: #1A1A2E; }',
    'html.light .form-group input, html.light .form-group select, html.light .form-group textarea { background: #F9FAFB; border-color: #E5E7EB; color: #1A1A2E; }',
    'html.light .btn-secondary { background: #E5E7EB; color: #1A1A2E; }',
    'html.light .modal { background: #FFFFFF; border-color: #E5E7EB; }',
    'html.light tr:hover td { background: #F9FAFB; }',
    'body { font-family: "Outfit", sans-serif; background: var(--deep); color: var(--text); min-height: 100vh; display: flex; }',
    '.admin-nav { width: 220px; min-height: 100vh; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 20px 0; position: fixed; left: 0; top: 0; }',
    '.admin-nav-logo { padding: 0 20px 24px; border-bottom: 1px solid var(--border); margin-bottom: 12px; }',
    '.admin-nav-links { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 0 8px; }',
    '.admin-nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 16px; color: var(--text-muted); text-decoration: none; font-size: 14px; border-radius: 6px; transition: all 0.15s; }',
    '.admin-nav-link .nav-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 20px; height: 20px; }',
    '.admin-nav-link .nav-icon svg { display: block; }',
    '.admin-nav-link:hover { background: var(--border); color: var(--text); }',
    '.admin-nav-link.active { background: var(--blue)15; color: var(--blue); font-weight: 600; }',
    '.admin-nav-footer { padding: 16px 20px; border-top: 1px solid var(--border); margin-top: auto; }',
    '.admin-nav-theme { background: none; border: none; cursor: pointer; font-size: 18px; padding: 8px 0; margin-bottom: 8px; display: block; }',
    '.admin-nav-logout { background: none; border: none; color: var(--text-muted); cursor: pointer; font-family: inherit; font-size: 13px; padding: 8px 0; }',
    '.admin-nav-logout:hover { color: var(--error); }',
    '.admin-main { margin-left: 220px; flex: 1; padding: 32px 40px; min-height: 100vh; }',
    '.admin-main h1 { font-size: 24px; font-weight: 600; margin-bottom: 24px; }',
    '.card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 24px; margin-bottom: 20px; }',
    '.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }',
    '.stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 20px; }',
    '.stat-card .stat-value { font-size: 32px; font-weight: 700; color: var(--blue); }',
    '.stat-card .stat-label { font-size: 13px; color: var(--text-muted); margin-top: 4px; }',
    'table { width: 100%; border-collapse: collapse; }',
    'th { text-align: left; padding: 10px 12px; font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); }',
    'td { padding: 12px; font-size: 14px; border-bottom: 1px solid var(--border); }',
    'tr:hover td { background: var(--border)40; }',
    '.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; border: none; font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.15s; }',
    '.btn:hover { opacity: 0.85; }',
    '.btn-primary { background: var(--blue); color: #fff; }',
    '.btn-secondary { background: var(--border); color: var(--text); }',
    '.btn-danger { background: var(--error); color: #fff; }',
    '.btn-sm { padding: 5px 10px; font-size: 12px; }',
    '.badge-new { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--blue); margin-right: 6px; }',
    '.empty-state { text-align: center; padding: 48px 20px; color: var(--text-muted); }',
    '.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }',
    '.modal { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 32px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; }',
    '.modal h2 { font-size: 18px; margin-bottom: 20px; }',
    '.form-group { margin-bottom: 16px; }',
    '.form-group label { display: block; font-size: 13px; font-weight: 500; color: var(--text-muted); margin-bottom: 4px; }',
    '.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px 12px; background: var(--deep); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-family: inherit; font-size: 14px; outline: none; }',
    '.form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: var(--blue); }',
    '.form-group textarea { resize: vertical; min-height: 100px; }',
    '.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }',
    '.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }',
    '.tag { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; background: var(--border); color: var(--text-muted); margin: 2px 4px 2px 0; }',
    '.rich-editor[data-empty="true"]:before { content: attr(data-placeholder); color: var(--text-muted); pointer-events: none; }',
    '.rich-editor:focus { border-color: var(--blue); }',
    'html.light .rich-editor { background: #F9FAFB; border-color: #E5E7EB; color: #1A1A2E; }',
    '.admin-hamburger { display: none; position: fixed; top: 12px; left: 12px; z-index: 200; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 8px; cursor: pointer; color: var(--text); line-height: 0; }',
    '@media (max-width: 768px) {',
    '  .admin-hamburger { display: block; }',
    '  .admin-nav { width: 260px; transform: translateX(-100%); transition: transform 0.25s ease; z-index: 150; box-shadow: 4px 0 20px rgba(0,0,0,0.15); }',
    '  .admin-nav.open { transform: translateX(0); }',
    '  .admin-main { margin-left: 0; padding: 60px 16px 20px; }',
    '  .admin-main h1 { font-size: 20px; }',
    '  .form-row { grid-template-columns: 1fr; }',
    '  .stat-grid { grid-template-columns: 1fr 1fr; gap: 10px; }',
    '  .stat-card { padding: 14px; }',
    '  .stat-card .stat-value { font-size: 24px; }',
    '  .card { padding: 16px; overflow-x: auto; }',
    '  table { min-width: 500px; }',
    '  .modal { margin: 16px; max-width: calc(100vw - 32px); padding: 24px 16px; }',
    '  .modal-overlay { padding: 0; }',
    '  .btn { padding: 10px 14px; font-size: 14px; }',
    '}',
    '@media (max-width: 480px) {',
    '  .stat-grid { grid-template-columns: 1fr; }',
    '}',
  ].join('\n');
  document.head.appendChild(style);
}
