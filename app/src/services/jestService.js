/**
 * jestService.js — Thin wrapper around the global JestSDK object.
 *
 * When the SDK CDN is unavailable (e.g. local dev), every helper
 * falls back gracefully so the app still works as a guest session.
 */

const sdk = () => window.JestSDK;

/** Returns true when the CDN script has loaded the global. */
export function isJestSDKAvailable() {
  return typeof window !== "undefined" && !!window.JestSDK;
}

/** Initialise the SDK. No-op when the CDN isn't loaded. */
export async function initJestSDK() {
  if (!isJestSDKAvailable()) {
    console.warn("[jestService] JestSDK not available — running in local/dev mode");
    return;
  }
  await sdk().init();
}

/**
 * Get the current player identity.
 * @returns {{ playerId: string, registered: boolean }}
 */
export function getPlayer() {
  if (!isJestSDKAvailable()) {
    return { playerId: `local_${Date.now()}`, registered: false };
  }
  return sdk().getPlayer();
}

/**
 * Get a signed player payload (JWT) for backend verification.
 * Send the returned `playerSigned` string to your server's
 * POST /api/verify-player endpoint to cryptographically confirm identity.
 * @returns {Promise<{ player: object, playerSigned: string }>}
 */
export async function getPlayerSigned() {
  if (!isJestSDKAvailable()) {
    return { player: getPlayer(), playerSigned: "" };
  }
  return sdk().getPlayerSigned();
}

/**
 * Trigger the Jest platform registration popup (SMS / RCS).
 * No-op in local dev.
 */
export async function loginPlayer() {
  if (!isJestSDKAvailable()) {
    console.warn("[jestService] login() skipped — SDK not available");
    return;
  }
  return sdk().login();
}

/** Read a single key from the per-player data store. */
export function getPlayerData(key) {
  if (!isJestSDKAvailable()) return undefined;
  return sdk().data.get(key);
}

/** Read all per-player data. */
export function getAllPlayerData() {
  if (!isJestSDKAvailable()) return {};
  return sdk().data.getAll();
}

/** Merge key-value pairs into the per-player data store. */
export function setPlayerData(data) {
  if (!isJestSDKAvailable()) return;
  sdk().data.set(data);
}

/** Flush pending data writes to the Jest server. */
export async function flushPlayerData() {
  if (!isJestSDKAvailable()) return;
  return sdk().data.flush();
}

// ─────────────────────────────────────────────
// Subscription enforcement helpers
// These read/write to the Jest data store so limits
// persist across sessions and devices for the same player.
// ─────────────────────────────────────────────

/**
 * Get the number of multiplayer rooms used (lifetime).
 * Free tier cap: 3 (create + join combined).
 * @returns {number}
 */
export function getRoomsUsed() {
  return getPlayerData("rooms_used") || 0;
}

/**
 * Increment the lifetime multiplayer rooms used count by 1
 * and flush to the Jest data store.
 */
export async function incrementRoomsUsed() {
  const current = getRoomsUsed();
  setPlayerData({ rooms_used: current + 1 });
  return flushPlayerData().catch(() => {});
}

/**
 * Get the number of single-player rounds played today.
 * Automatically resets to 0 when the date (UTC) has changed since last play.
 * @returns {number}
 */
export function getSPRoundsToday() {
  const todayUTC = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const lastResetDate = getPlayerData("sp_rounds_reset_date");
  if (lastResetDate !== todayUTC) {
    // New day — treat count as 0 (actual reset happens on increment)
    return 0;
  }
  return getPlayerData("sp_rounds_today") || 0;
}

/**
 * Increment today's single-player round count by 1.
 * Automatically resets the counter if the UTC date has changed.
 * Flushes to the Jest data store.
 */
export async function incrementSPRoundsToday() {
  const todayUTC = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const lastResetDate = getPlayerData("sp_rounds_reset_date");
  const currentCount = lastResetDate === todayUTC
    ? (getPlayerData("sp_rounds_today") || 0)
    : 0; // new day — reset

  setPlayerData({
    sp_rounds_today: currentCount + 1,
    sp_rounds_reset_date: todayUTC,
  });
  return flushPlayerData().catch(() => {});
}
