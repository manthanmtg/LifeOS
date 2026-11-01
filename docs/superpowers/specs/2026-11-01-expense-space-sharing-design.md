# Live sharing for Expense Spaces

## Intent

Allow an owner to share one Expense Space through a live, public, read-only link. Anyone holding the link can see its complete ledger, budget and attached documents without signing in. Updates appear on subsequent visits or refreshes.

## Approaches

- **Live link (selected):** reflects current data and can be revoked. Recipients may see later additions, so the owner must understand that access is ongoing.
- **Snapshot:** freezes a report at creation time, but becomes stale and does not meet the live requirement.

## Owner experience

Add a Share control inside each space. The sharing panel explains that anyone with the link can view the complete space and documents, including future changes. The owner can generate and copy a link. A public shares manager on the Expense Spaces home page lists links and allows copying, pausing, resuming, and permanently deleting them. Pausing preserves the link; deleting it invalidates it permanently, and creating another produces a new link. Sharing is off by default. Deleting a space also removes access.

## Public experience

A dedicated public page presents the space name and budget overview first, followed by the complete expense ledger and documents. Use the space's currency and number formatting. On desktop, use a readable centered layout and a structured ledger table; on mobile, use compact expense cards with labels and comfortable touch targets. Allow read-only search, filters and pagination without hiding the ability to reach all entries. Show clear loading, empty, unavailable and error states. Documents open or download via a share-scoped route; supported safe formats may preview inline. Provide no create, update, delete or admin navigation controls.

## Access and data boundaries

Derive a high-entropy bearer token from a cryptographically random per-share nonce and the server secret. Store the nonce and a hash of the token in a dedicated share record so the owner can copy it again without storing the token itself. Authenticate public reads by hashing the supplied token and checking the active share on every request, including document requests. Scope every query to that space; never reuse an unprotected general content endpoint or expose other spaces. Public responses use an explicit allowlist of fields needed for the page and documents, excluding tokens and internal metadata. Management endpoints require admin authentication. Public routes accept reads only; existing write routes remain admin-protected. Revoked, invalid and deleted links return the same generic unavailable response. Do not index share pages; use no-store caching and a restrictive referrer policy to reduce token leakage. Treat the link as a bearer credential; anyone receiving it can forward it.

Documents must be checked for membership in the shared space on every request. Serve untrusted files with safe content types and content-disposition, preventing active content from executing on the application origin; prefer download for unsafe formats. Do not expose storage credentials or private paths. Apply reasonable request limits and avoid logging token values.

## Implementation boundaries and verification

Use dedicated public page and share-scoped read endpoints alongside the existing `src/app/api/expense-spaces/[spaceId]` routes. Extend the existing workspace and settings UI for share management; reuse existing formatting and ledger components only where they cannot expose mutation controls or internal fields. Keep existing admin authentication and document authorization intact.

Test token generation, lookup, revocation and rotation; unauthenticated access to valid links; rejection of invalid links and writes; cross-space isolation for entries and documents; live changes; and safe document responses. Verify ledger pagination and empty/error states, plus desktop and mobile layouts. Run the repository's required checks and visually verify the public page at both viewport sizes.

## Scope

No recipient accounts, passwords, expiry dates, per-recipient permissions or historical snapshots in the initial design. Sharing grants ongoing access to all current and future ledger entries and documents until revoked.
