/**
 * apiEndpoints.js — Centralized API endpoint definitions.
 *
 * All REST API paths are defined here as constants so they can be
 * imported and reused across the frontend. If backend routes change,
 * only this file needs to be updated.
 */

const SERVER_URL = process.env.REACT_APP_SERVER_URL || `http://${window.location.hostname}:5002`;

const API = {
    // ── User Routes (mounted at /api/user on the server) ──
    USER: {
        REGISTER: `${SERVER_URL}/api/user/register-user`,
        UPDATE_SUBSCRIPTION: `${SERVER_URL}/api/user/update-subscription`,
        // GET_QUESTION: `${SERVER_URL}/api/user/get-question`,
    },
    GAME: {
        START_GAME: `${SERVER_URL}/api/game/start-game`,
        SUBMIT_ANSWER: `${SERVER_URL}/api/game/submit-answer`,
    }

    // ── Admin Routes (mounted at /api/admin on the server) — future ──
    // ADMIN: {
    //     DASHBOARD: `${SERVER_URL}/api/admin/dashboard`,
    // },
};

export default API;
