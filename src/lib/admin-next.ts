/** Where an admin page sends people without a team session: the hub's password form. */
export function adminLoginUrl(next: string) {
  return `/admin?next=${encodeURIComponent(next)}`;
}

export const ADMIN_FANART_LOGIN = adminLoginUrl("/admin/fanart");

/**
 * The `next` page to open after unlocking, or null. Only admin pages on this
 * site are accepted, so the link cannot send anyone elsewhere.
 */
export function safeAdminNext(raw: string | null): string | null {
  return raw && /^\/admin\/[a-z0-9/-]+$/.test(raw) ? raw : null;
}
