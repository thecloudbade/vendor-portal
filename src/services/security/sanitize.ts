/**
 * Basic sanitization for user-controlled HTML (e.g. email preview).
 * For full HTML sanitization, consider DOMPurify - this is a minimal allowlist.
 */

const ALLOWED_TAGS = ['b', 'i', 'u', 'em', 'strong', 'br', 'p', 'a'];
const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ['href', 'target', 'rel'],
};

function isAllowedUrl(href: string): boolean {
  try {
    const u = new URL(href, window.location.origin);
    return u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:';
  } catch {
    return false;
  }
}

/**
 * Strip or escape dangerous HTML; keep a minimal set of safe tags.
 * Use for preview only; never for trusting user input as script.
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent ?? '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.includes(tag)) return '';
    const allowedAttrs = ALLOWED_ATTRS[tag];
    let attrs = '';
    if (allowedAttrs && el.hasAttributes()) {
      for (const name of allowedAttrs) {
        const val = el.getAttribute(name);
        if (val && (name !== 'href' || isAllowedUrl(val))) {
          attrs += ` ${name}="${escapeHtml(val)}"`;
        }
      }
    }
    const inner = Array.from(el.childNodes)
      .map((n) => walk(n))
      .join('');
    return `<${tag}${attrs}>${inner}</${tag}>`;
  };
  return Array.from(doc.body.childNodes).map((n) => walk(n)).join('');
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return s.replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
}

/**
 * Validate returnUrl to prevent open redirects.
 */
export function validateReturnUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed, window.location.origin);
    if (u.origin !== window.location.origin) return null;
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.pathname + u.search;
  } catch {
    return null;
  }
}
