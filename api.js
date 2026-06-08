// api.js – Google Calendar integration
import { GOOGLE_CLIENT_ID } from "./config.js";

// ─── State ────────────────────────────────────────────────────────────────────
let tokenClient = null;
let accessToken = null;

// ─── GIS readiness ────────────────────────────────────────────────────────────
function waitForGis() {
  return new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const id = setInterval(() => {
      if (window.google?.accounts?.oauth2) { clearInterval(id); resolve(); }
    }, 50);
  });
}

function ensureClient() {
  if (!tokenClient) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/calendar.events",
      callback: () => {},
    });
  }
}

// ─── Token request wrapper ────────────────────────────────────────────────────
function requestToken(prompt) {
  return new Promise((resolve, reject) => {
    tokenClient.callback = (response) => {
      if (response.error) { reject(new Error(response.error)); return; }
      accessToken = response.access_token;
      
      // Calculate token expiry (expires_in is in seconds, e.g. 3600)
      const expiresIn = response.expires_in ? parseInt(response.expires_in, 10) : 3600;
      const expiryTime = Date.now() + expiresIn * 1000;
      
      localStorage.setItem("tasker_token", accessToken);
      localStorage.setItem("tasker_token_expiry", expiryTime.toString());
      localStorage.setItem("tasker_was_logged_in", "1");
      resolve();
    };
    tokenClient.requestAccessToken({ prompt });
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Called once on page load.
 * 1. Check sessionStorage (same tab, page refresh) → instant, no popup.
 * 2. If user was logged in before, try GIS silent grant (prompt:"") → no popup
 *    if Google session is still active in the browser.
 * 3. Otherwise → return false so the welcome screen stays.
 */
export async function tryRestoreSession() {
  // 1. Restore from localStorage if not expired
  const cached = localStorage.getItem("tasker_token");
  const expiry = localStorage.getItem("tasker_token_expiry");
  
  if (cached && expiry) {
    const isExpired = Date.now() > parseInt(expiry, 10);
    if (!isExpired) {
      accessToken = cached;
      console.log("[auth] restored from localStorage (valid token)");
      return true;
    } else {
      console.log("[auth] localStorage token expired");
      localStorage.removeItem("tasker_token");
      localStorage.removeItem("tasker_token_expiry");
    }
  }

  // 2. Was previously logged in — try silent GIS token grant
  if (!localStorage.getItem("tasker_was_logged_in")) {
    return false; // First-ever visit, don't bother
  }

  try {
    await waitForGis();
    ensureClient();
    await requestToken(""); // prompt:"" = silent (no popup if Google session active)
    console.log("[auth] silently restored via GIS");
    return true;
  } catch (err) {
    console.log("[auth] silent restore failed:", err.message);
    return false;
  }
}

/**
 * Interactive sign-in, always called from the Sign In button.
 */
export async function signIn() {
  await waitForGis();
  ensureClient();
  await requestToken(""); // Will show account chooser only if needed
}

export function signOut() {
  if (accessToken) google.accounts.oauth2.revoke(accessToken);
  accessToken = null;
  localStorage.removeItem("tasker_token");
  localStorage.removeItem("tasker_token_expiry");
  localStorage.removeItem("tasker_was_logged_in");
}

export function isSignedIn() { return !!accessToken; }

// ─── Auth headers ─────────────────────────────────────────────────────────────
function authHeaders() {
  if (!accessToken) throw new Error("Not authenticated");
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

// ─── API Error Helper ────────────────────────────────────────────────────────
async function handleApiError(resp) {
  const err = await resp.json().catch(() => ({}));
  if (resp.status === 401) {
    localStorage.removeItem("tasker_token");
    localStorage.removeItem("tasker_token_expiry");
  }
  throw new Error(err.error?.message || `HTTP ${resp.status}`);
}

// ─── Calendar API ─────────────────────────────────────────────────────────────
export async function createTaskEvent({ title, url, note, datetime }) {
  const start = new Date(datetime);
  const end   = new Date(start.getTime() + 15 * 60 * 1000);

  const summary = title
    ? `Read: ${title}`
    : url
      ? `Read: ${url.replace(/^https?:\/\//, "").split("/")[0]}`
      : `Note: ${note.slice(0, 60)}`;

  const description = [url, note ? `Note: ${note}` : ""].filter(Boolean).join("\n\n");

  const body = {
    summary, description,
    start: { dateTime: start.toISOString() },
    end:   { dateTime: end.toISOString()   },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 0 }] },
    extendedProperties: { private: { pwaTask: "true" } },
  };

  const resp = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    { method: "POST", headers: authHeaders(), body: JSON.stringify(body) }
  );
  if (!resp.ok) {
    await handleApiError(resp);
  }
  return resp.json();
}

export async function updateTaskEvent(eventId, { title, url, note, datetime }) {
  const start = new Date(datetime);
  const end   = new Date(start.getTime() + 15 * 60 * 1000);

  const summary = title
    ? `Read: ${title}`
    : url
      ? `Read: ${url.replace(/^https?:\/\//, "").split("/")[0]}`
      : `Note: ${note.slice(0, 60)}`;

  const description = [url, note ? `Note: ${note}` : ""].filter(Boolean).join("\n\n");

  const body = {
    summary, description,
    start: { dateTime: start.toISOString() },
    end:   { dateTime: end.toISOString()   },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 0 }] },
    extendedProperties: { private: { pwaTask: "true" } },
  };

  const resp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    { method: "PUT", headers: authHeaders(), body: JSON.stringify(body) }
  );
  if (!resp.ok) {
    await handleApiError(resp);
  }
  return resp.json();
}

export async function listTaskEvents() {
  const params = new URLSearchParams({
    privateExtendedProperty: "pwaTask=true",
    timeMin: new Date().toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const resp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: authHeaders() }
  );
  if (!resp.ok) {
    await handleApiError(resp);
  }
  return (await resp.json()).items || [];
}

export async function deleteTaskEvent(eventId) {
  const resp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    { method: "DELETE", headers: authHeaders() }
  );
  if (resp.status === 204 || resp.ok) return;
  await handleApiError(resp);
}
