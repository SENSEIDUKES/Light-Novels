# Sentinel Learnings

## SSRF Prevention in Client Downloads
When accepting URLs for client-side fetches or downloads, validating just the protocol is insufficient, as it leaves the application vulnerable to Server-Side Request Forgery (SSRF) targeting the local network of the user's browser (e.g., probing `localhost`, internal routers `192.168.1.1`, or cloud metadata services like `169.254.169.254`).
- When cross-origin URLs are supplied, the `hostname` must be checked against internal/private IP ranges and local domain suffixes (`.local`, `.localhost`, `.internal`).
- This applies to utilities like `handleDownload` that use `fetch()` or dynamic `<a>` tags.

## Reverse Tabnabbing
When using fallback `<a>` tags with `target="_blank"` for navigation or downloads, always ensure `rel="noopener noreferrer"` is included. This prevents the newly opened tab from hijacking the original page's window object (reverse tabnabbing).
