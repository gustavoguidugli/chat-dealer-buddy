

# Fix WhatsApp Link Blocked in Preview

## Problem

The `wa.me` links redirect to `api.whatsapp.com` which returns `ERR_BLOCKED_BY_RESPONSE` when opened inside the Lovable preview iframe. The `target="_blank"` on `<a>` tags doesn't reliably escape the iframe context.

## Solution

Replace the `<a href>` approach with an explicit `window.open()` call via `onClick`. This forces a true new browser window/tab that escapes the preview iframe sandbox.

### File: `src/lib/lead-utils.ts`
- Change `buildWhatsAppLink` to use `https://api.whatsapp.com/send?phone=` format (more reliable across contexts than the `wa.me` shortener redirect)

### File: `src/components/crm/LeadDrawerFields.tsx`
- Change the WhatsApp `<a>` tag to a `<button>` with `onClick={() => window.open(waLink, '_blank', 'noopener')}` instead of relying on `href` + `target="_blank"` which gets intercepted by the iframe

Both changes are small — one line each in two files.

