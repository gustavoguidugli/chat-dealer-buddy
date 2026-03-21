

# Fix: WhatsApp link blocked in preview iframe

## Problem

The code is correctly generating `https://wa.me/556198289755` links (confirmed via session replay and code audit). Zero occurrences of `api.whatsapp.com` exist. The issue is that `<a href target="_blank">` gets intercepted by the preview iframe's security headers, causing `ERR_BLOCKED_BY_RESPONSE`.

## Solution

Replace the `<a href>` tag with a `<button>` that uses `window.open()` -- this escapes the iframe sandbox reliably.

### File: `src/components/crm/LeadDrawerFields.tsx` (lines 329-339)

Replace the current `<a>` tag:
```tsx
<a href={waLink} target="_blank" rel="noopener noreferrer" ...>
```

With a button using `window.open`:
```tsx
<button
  onClick={(e) => {
    e.stopPropagation();
    window.open(waLink, '_blank', 'noopener,noreferrer');
  }}
  className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1.5"
>
  {displayPhone}
  <svg .../>
</button>
```

No other files need changes. The utility function `buildWhatsAppLink` is already correct (`https://wa.me/${com55}`).

