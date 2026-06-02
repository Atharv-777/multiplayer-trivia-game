import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  initJestSDK,
  getPlayer,
  getPlayerData,
  setPlayerData,
  flushPlayerData,
  loginPlayer,
  isJestSDKAvailable,
} from "../services/jestService";
import SplashScreen from "../components/SplashScreen";

/**
 * Shape exposed by the context:
 *  - player      : { playerId, registered } | null
 *  - sdkReady    : boolean
 *  - sdkAvailable: boolean  (false when running outside Jest platform)
 *  - savedProfile: { username, country } | null  (loaded from JestSDK.data)
 *  - login       : () => Promise<void>
 *  - saveProfile : (username, country) => void
 */
const JestContext = createContext(null);

export function useJest() {
  const ctx = useContext(JestContext);
  if (!ctx) throw new Error("useJest must be used inside <JestProvider>");
  return ctx;
}

export function JestProvider({ children }) {
  const [sdkReady, setSdkReady] = useState(false);
  const [player, setPlayer] = useState(null);
  const [savedProfile, setSavedProfile] = useState(null);
  const sdkAvailable = isJestSDKAvailable();

  // Initialise the SDK once on mount
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        await initJestSDK();

        if (cancelled) return;

        const p = getPlayer();
        setPlayer(p);

        // If registered, try to load saved profile from Jest data store
        if (p.registered) {
          const username = getPlayerData("username");
          const country = getPlayerData("country");
          if (username) {
            setSavedProfile({ username, country: country || "" });
            // Also sync to sessionStorage for socket identification
            sessionStorage.setItem("myUsername", username);
            if (country) sessionStorage.setItem("myCountry", country);
          }
        }
      } catch (err) {
        console.error("[JestContext] SDK init failed:", err);
        // Fallback: treat as guest
        setPlayer({ playerId: `fallback_${Date.now()}`, registered: false });
      } finally {
        if (!cancelled) setSdkReady(true);
      }
    }

    boot();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger Jest platform login (SMS/RCS popup)
  const login = useCallback(async () => {
    await loginPlayer();
    // After login flow completes, re-read player state
    const p = getPlayer();
    setPlayer(p);
  }, []);

  // Persist profile to JestSDK data store + sessionStorage
  const saveProfile = useCallback((username, country) => {
    setPlayerData({ username, country });
    flushPlayerData().catch(() => { });
    setSavedProfile({ username, country });
    sessionStorage.setItem("myUsername", username);
    sessionStorage.setItem("myCountry", country);
  }, []);

  // Clear the profile — wipes Jest data store, sessionStorage, and context state
  const clearProfile = useCallback(() => {
    setPlayerData({ username: null, country: null, lastScore: null, gamesPlayed: null, rooms_used: null, sp_rounds_today: null, sp_rounds_reset_date: null });
    flushPlayerData().catch(() => {});
    sessionStorage.removeItem("myUsername");
    sessionStorage.removeItem("myCountry");
    setSavedProfile(null);
  }, []);

  // Show splash screen while SDK is booting
  if (!sdkReady) {
    return <SplashScreen />;
  }

  return (
    <JestContext.Provider value={{ player, sdkReady, sdkAvailable, savedProfile, login, saveProfile, clearProfile }}>
      {children}
    </JestContext.Provider>
  );
}

export default JestContext;
