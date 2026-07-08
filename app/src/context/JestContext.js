import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  initJestSDK,
  getPlayer,
  getPlayerData,
  setPlayerData,
  flushPlayerData,
  isJestSDKAvailable,
  loginPlayer,
  getPlayerSigned,
  checkSubscription,
} from "../services/jestService";
import SplashScreen from "../components/SplashScreen";
import axios from "axios"
import API from "../services/apiEndpoints";

/**
 * Shape exposed by the context:
 *  - player       : { playerId, registered } | null
 *  - sdkReady     : boolean
 *  - sdkAvailable : boolean  (false when running outside Jest platform)
 *  - savedProfile : { username } — always populated (auto-generated if needed)
 *  - saveProfile  : (username) => void
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
  const [subscriptions, setSubscriptions] = useState([]);
  const sdkAvailable = isJestSDKAvailable();

  // Initialise the SDK once on mount
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        await initJestSDK();

        if (cancelled) return;

        const player = getPlayer();
        const { subscriptions, signed } = await checkSubscription()
        setSubscriptions(subscriptions || [])
        console.log("SUBSCRIPTION DETAILS : " + JSON.stringify(subscriptions))
        console.log("[JestContext] getPlayer() →", JSON.stringify(player));
        // console.log("[JestContext] SDK available?", isJestSDKAvailable());

        if (!player.registered)
          await loginPlayer()
        else {

        }

        const updatedPlayerSignedData = await getPlayerSigned()
        console.log("PLAYER DATA WITH SIGNED TOKEN : ", updatedPlayerSignedData)
        const updatedPlayer = updatedPlayerSignedData.player
        const response = await axios.post(API.USER.REGISTER, updatedPlayer, {
          headers: {
            Authorization: updatedPlayerSignedData.playerSigned
          }
        })
        console.log("UPDATED PLAYER DATA : " + JSON.stringify(response.data.data))

        setPlayer(updatedPlayer);
        // Try to load saved profile from Jest data store
        const savedUsername = updatedPlayer.registered ? getPlayerData("username") : null;

        let username;

        if (savedUsername) {
          // Verified user with a previously saved username
          username = savedUsername;
        } else if (player.registered) {
          // Verified user but no username saved yet — generate from playerId
          const suffix = (player.playerId || "").slice(-4) || Math.floor(Math.random() * 9000 + 1000);
          username = `Player_${suffix}`;
          // Persist the auto-generated name so they keep it next time
          // setPlayerData({ username });
          flushPlayerData().catch(() => { });
        } else {
          // Guest / unverified — ephemeral name
          username = `Guest_${Math.floor(Math.random() * 9000) + 1000}`;
        }

        setSavedProfile({ username });
        sessionStorage.setItem("myUsername", username);
      } catch (err) {
        console.error("[JestContext] SDK init failed:", err);
        // Fallback: treat as guest
        const fallbackName = `Guest_${Math.floor(Math.random() * 9000) + 1000}`;
        setPlayer({ playerId: `fallback_${Date.now()}`, registered: false });
        setSavedProfile({ username: fallbackName });
        sessionStorage.setItem("myUsername", fallbackName);
      } finally {
        if (!cancelled) setSdkReady(true);
      }
    }

    boot();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist profile to JestSDK data store + sessionStorage
  const saveProfile = useCallback((username) => {
    // setPlayerData({ username });
    flushPlayerData().catch(() => { });
    setSavedProfile({ username });
    sessionStorage.setItem("myUsername", username);
  }, []);

  // Show splash screen while SDK is booting
  if (!sdkReady) {
    return <SplashScreen />;
  }

  return (
    <JestContext.Provider value={{ player, sdkReady, sdkAvailable, savedProfile, saveProfile, subscriptions, setSubscriptions }}>
      {children}
    </JestContext.Provider>
  );
}

export default JestContext;
