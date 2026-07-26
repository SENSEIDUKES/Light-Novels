/**
 * Accounts that hold the OWNER role by construction.
 *
 * This list is the single server-side source of truth. The browser must never
 * decide its own role: a client that promoted itself from its email address
 * rendered the admin surfaces while every admin query still failed the
 * `userAccount.role` check in PostgreSQL, which reads as an unexplained
 * persistence error. The role is assigned here, on the account row, so the
 * client can simply believe what the server tells it.
 */
const SYSTEM_OWNER_EMAILS: ReadonlySet<string> = new Set([
  'amaurylindy@gmail.com',
  'seihouseproductions@gmail.com',
]);

export function isSystemOwnerEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && SYSTEM_OWNER_EMAILS.has(email.trim().toLowerCase());
}
