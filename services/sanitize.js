// Server-side HTML sanitizer — strips dangerous tags, event handlers, and JS URLs
// Allows only safe formatting tags produced by contenteditable editors

function sanitizeHtml(html) {
  if (!html) return '';
  // Remove script/style/iframe/object/embed/form and their content
  html = html.replace(/<(script|style|iframe|object|embed|form|link|meta)[\s\S]*?<\/\1>/gi, '');
  // Remove self-closing dangerous tags
  html = html.replace(/<(script|style|iframe|object|embed|form|link|meta|input|textarea|select|button)[^>]*\/?>/gi, '');
  // Remove all event handlers (on*)
  html = html.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
  // Remove javascript: and data: URLs in href/src/action
  html = html.replace(/(href|src|action)\s*=\s*["']?\s*(javascript|data):/gi, '$1="');
  return html;
}

module.exports = { sanitizeHtml };
