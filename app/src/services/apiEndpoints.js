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
        // GET_QUESTION: `${SERVER_URL}/api/user/get-question`,
    },

    // ── Admin Routes (mounted at /api/admin on the server) — future ──
    // ADMIN: {
    //     DASHBOARD: `${SERVER_URL}/api/admin/dashboard`,
    // },
};

export default API;
