/**
 * Cafe settings unlock — aliases of site-wide admin auth
 * so `/cafe/settings` and `/cafe/secret` share one cookie/password with `/admin`.
 */
export {
  SITE_ADMIN_COOKIE as CAFE_SETTINGS_COOKIE,
  clearSiteAdminCookie as clearCafeSettingsCookie,
  expectedSiteAdminToken as expectedCafeSettingsToken,
  getSiteAdminPassword,
  isSiteAdminUnlocked as isCafeSettingsUnlocked,
  setSiteAdminCookie as setCafeSettingsCookie,
  verifySiteAdminPassword as verifyCafeSettingsPassword,
} from "@/lib/site-admin-auth";
