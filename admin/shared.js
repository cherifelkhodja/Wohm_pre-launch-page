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
    { href: '/admin/', label: 'Dashboard', icon: '&#9636;' },
    { href: '/admin/jobs.html', label: 'Offres', icon: '&#9997;' },
    { href: '/admin/applications.html', label: 'Candidatures', icon: '&#128196;' },
    { href: '/admin/settings.html', label: 'Paramètres', icon: '&#9881;' },
  ];

  var nav = document.createElement('nav');
  nav.className = 'admin-nav';
  var html = '<div class="admin-nav-logo"><img src="/assets/Wohm - Light.png" alt="WOHM" style="height:28px"></div>';
  html += '<div class="admin-nav-links">';
  navItems.forEach(function(item) {
    var active = currentPage === item.href ? ' active' : '';
    html += '<a href="' + item.href + '" class="admin-nav-link' + active + '">' + item.icon + ' ' + item.label + '</a>';
  });
  html += '</div>';
  html += '<div class="admin-nav-footer">';
  html += '<button class="admin-nav-logout" id="btn-logout">Déconnexion</button>';
  html += '</div>';
  nav.innerHTML = html;
  document.body.insertBefore(nav, document.body.firstChild);

  document.getElementById('btn-logout').addEventListener('click', logout);
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
    'html.light .form-group input, html.light .form-group select, html.light .form-group textarea { background: #F9FAFB; border-color: #E5E7EB; color: #1A1A2E; }',
    'html.light .btn-secondary { background: #E5E7EB; color: #1A1A2E; }',
    'html.light .modal { background: #FFFFFF; border-color: #E5E7EB; }',
    'html.light tr:hover td { background: #F9FAFB; }',
    'body { font-family: "Outfit", sans-serif; background: var(--deep); color: var(--text); min-height: 100vh; display: flex; }',
    '.admin-nav { width: 220px; min-height: 100vh; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 20px 0; position: fixed; left: 0; top: 0; }',
    '.admin-nav-logo { padding: 0 20px 24px; border-bottom: 1px solid var(--border); margin-bottom: 12px; }',
    '.admin-nav-links { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 0 8px; }',
    '.admin-nav-link { display: block; padding: 10px 16px; color: var(--text-muted); text-decoration: none; font-size: 14px; border-radius: 6px; transition: all 0.15s; }',
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
    '@media (max-width: 768px) { .admin-nav { width: 60px; } .admin-nav-link { font-size: 0; } .admin-main { margin-left: 60px; padding: 20px 16px; } .form-row { grid-template-columns: 1fr; } }',
  ].join('\n');
  document.head.appendChild(style);
}
