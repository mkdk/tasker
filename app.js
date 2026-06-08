// app.js – UI logic for Read‑it‑later PWA
import { signIn, signOut, tryRestoreSession, createTaskEvent, updateTaskEvent, listTaskEvents, deleteTaskEvent, isSignedIn } from "./api.js";
import { initLanguage, setLanguage, getLanguage, t } from "./i18n.js";


// ─── Theme ───────────────────────────────────────────────────────────────────
const themeToggle = document.getElementById("theme-toggle");

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
}

// ─── Elements ────────────────────────────────────────────────────────────────
const langSelect = document.getElementById("lang-select");
const signInBtn = document.getElementById("sign-in-btn");
const signOutBtn = document.getElementById("sign-out-btn");
const welcomeScreen = document.getElementById("welcome-screen");
const appScreen = document.getElementById("app-screen");
const taskList = document.getElementById("task-list");
const addBtn = document.getElementById("add-btn");
const toast = document.getElementById("toast");
const syncBanner = document.getElementById("sync-banner");
const syncSigninBtn = document.getElementById("sync-signin-btn");

// Create/Edit modal elements
const modalOverlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const modalClose = document.getElementById("modal-close");
const modalCancel = document.getElementById("modal-cancel");
const modalSave = document.getElementById("modal-save");
const inputUrl = document.getElementById("input-url");
const inputTitle = document.getElementById("input-title");
const inputNote = document.getElementById("input-note");
const inputDatetime = document.getElementById("input-datetime");
const presetBtns = document.querySelectorAll(".preset-btn");

// View modal elements
const viewOverlay = document.getElementById("view-overlay");
const viewClose = document.getElementById("view-close");
const viewModalTitle = document.getElementById("view-modal-title");
const viewUrl = document.getElementById("view-url");
const viewUrlText = document.getElementById("view-url-text");
const viewNote = document.getElementById("view-note");
const viewTime = document.getElementById("view-time");
const viewEditBtn = document.getElementById("view-edit-btn");
const viewDoneBtn = document.getElementById("view-done-btn");

// ─── Theme & Language Listeners ──────────────────────────────────────────────
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });
}

if (langSelect) {
  langSelect.value = getLanguage();
  langSelect.addEventListener("change", (e) => {
    setLanguage(e.target.value);
    // Reload task list with new language strings
    const googleBtn = document.getElementById("sign-in-btn");
    if (googleBtn && googleBtn.querySelector("span")) {
      googleBtn.querySelector("span").textContent = t("sign-in-btn");
    }
    if (document.getElementById("modal-overlay").classList.contains("hidden") === false) {
      const isEdit = !!editingEventId;
      modalTitle.textContent = isEdit ? t("modal-title-edit") : t("modal-title-new");
      modalSave.textContent = isEdit ? t("modal-save-edit") : t("modal-save-new");
    }
    if (document.getElementById("view-overlay").classList.contains("hidden") === false && viewingEvent) {
      // Refresh view modal title/time
      const desc = viewingEvent.description || "";
      const lines = desc.split("\n");
      const url = lines[0]?.startsWith("http") ? lines[0].trim() : "";
      const title = viewingEvent.summary?.replace(/^Read:\s*/, "") || url || t("default-title-note");
      const start = new Date(viewingEvent.start?.dateTime || viewingEvent.start?.date);
      const timeStr = start.toLocaleString(getLanguage(), { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      viewModalTitle.textContent = title;
      viewTime.textContent = timeStr;
    }
    if (isSignedIn() || localStorage.getItem("tasker_was_logged_in") === "1") {
      loadTasks();
    }
  });
}

// ─── Auth ────────────────────────────────────────────────────────────────────
function updateUiState() {
  const wasLoggedIn = localStorage.getItem("tasker_was_logged_in") === "1";
  const signedIn = isSignedIn();

  if (signedIn) {
    if (signInBtn) signInBtn.classList.add("hidden");
    if (signOutBtn) signOutBtn.classList.remove("hidden");
    if (welcomeScreen) welcomeScreen.classList.add("hidden");
    if (appScreen) appScreen.classList.remove("hidden");
    if (syncBanner) syncBanner.classList.add("hidden");
    if (pendingShare) {
      openModal(pendingShare);
      pendingShare = null;
    }
  } else if (wasLoggedIn) {
    if (signInBtn) signInBtn.classList.add("hidden");
    if (signOutBtn) signOutBtn.classList.remove("hidden");
    if (welcomeScreen) welcomeScreen.classList.add("hidden");
    if (appScreen) appScreen.classList.remove("hidden");
    if (syncBanner) syncBanner.classList.remove("hidden");
    if (pendingShare) {
      openModal(pendingShare);
      pendingShare = null;
    }
  } else {
    if (signInBtn) {
      signInBtn.classList.remove("hidden");
      signInBtn.disabled = false;
      signInBtn.innerHTML = `<svg class="google-icon" viewBox="0 0 24 24" width="20" height="20"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> <span data-i18n="sign-in-btn">${t("sign-in-btn")}</span>`;
    }
    if (signOutBtn) signOutBtn.classList.add("hidden");
    if (welcomeScreen) welcomeScreen.classList.remove("hidden");
    if (appScreen) appScreen.classList.add("hidden");
    if (syncBanner) syncBanner.classList.add("hidden");
  }
}

if (signInBtn) {
  signInBtn.addEventListener("click", async () => {
    signInBtn.disabled = true;
    signInBtn.textContent = t("msg-signing-in");
    try {
      await signIn();
      updateUiState();
      loadTasks();
    } catch (e) {
      showToast(t("msg-signin-failed") + e.message);
      updateUiState();
    }
  });
}

if (signOutBtn) {
  signOutBtn.addEventListener("click", () => {
    signOut();
    updateUiState();
    showToast(t("msg-signed-out"));
  });
}

if (syncSigninBtn) {
  syncSigninBtn.addEventListener("click", async () => {
    syncSigninBtn.disabled = true;
    const originalText = syncSigninBtn.textContent;
    syncSigninBtn.textContent = "...";
    try {
      await signIn();
      updateUiState();
      loadTasks();
    } catch (e) {
      showToast(t("msg-signin-failed") + e.message);
    } finally {
      if (syncSigninBtn) {
        syncSigninBtn.disabled = false;
        syncSigninBtn.textContent = originalText;
      }
    }
  });
}

// ─── Toast ───────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, duration = 3000) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  requestAnimationFrame(() => {
    toast.classList.add("show");
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.classList.add("hidden"), 300);
    }, duration);
  });
}

// ─── Create / Edit Modal ─────────────────────────────────────────────────────
let selectedDate = null;
let editingEventId = null;   // null = create mode, string = edit mode

function openModal(preFill = {}, eventId = null) {
  editingEventId = eventId;
  inputUrl.value = preFill.url || "";
  inputTitle.value = preFill.title || "";
  inputNote.value = preFill.note || "";
  inputDatetime.value = "";
  selectedDate = null;
  presetBtns.forEach(b => b.classList.remove("active"));
  // Pre-set the date if editing or default to 8 hours
  if (preFill.datetime) {
    selectedDate = new Date(preFill.datetime);
    const local = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    inputDatetime.value = local;
  } else {
    const defaultBtn = Array.from(presetBtns).find(b => b.dataset.hours === "8");
    if (defaultBtn) defaultBtn.click();
  }
  modalTitle.textContent = eventId ? t("modal-title-edit") : t("modal-title-new");
  modalSave.textContent = eventId ? t("modal-save-edit") : t("modal-save-new");
  modalOverlay.classList.remove("hidden");
  setTimeout(() => (inputUrl.value ? inputTitle.focus() : inputUrl.focus()), 100);
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  editingEventId = null;
}

addBtn.addEventListener("click", () => openModal());
modalClose.addEventListener("click", closeModal);
modalCancel.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeModal(); closeViewModal(); } });

presetBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    presetBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const hours = parseFloat(btn.dataset.hours);
    const d = new Date();
    d.setTime(d.getTime() + hours * 3600 * 1000);
    selectedDate = d;
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    inputDatetime.value = local;
  });
});

inputDatetime.addEventListener("change", () => {
  if (inputDatetime.value) {
    selectedDate = new Date(inputDatetime.value);
    presetBtns.forEach(b => b.classList.remove("active"));
  }
});

async function ensureAuthAndExecute(actionCallback) {
  if (isSignedIn()) {
    await actionCallback();
    return;
  }

  const ok = confirm(t("msg-login-warning"));
  if (!ok) return;

  try {
    await signIn();
    updateUiState();
    if (isSignedIn()) {
      await actionCallback();
    }
  } catch (e) {
    showToast(t("msg-signin-failed") + e.message);
  }
}

modalSave.addEventListener("click", async () => {
  const url = inputUrl.value.trim();
  const title = inputTitle.value.trim();
  const note = inputNote.value.trim();

  if (!url && !note && !title) { showToast(t("msg-validation-failed")); return; }
  if (!selectedDate) { showToast(t("msg-select-time")); return; }

  const saveAction = async () => {
    modalSave.disabled = true;
    modalSave.textContent = t("msg-saving");
    try {
      if (editingEventId) {
        await updateTaskEvent(editingEventId, { title, url, note, datetime: selectedDate });
        showToast(t("msg-updated"));
      } else {
        await createTaskEvent({ title, url, note, datetime: selectedDate });
        showToast(t("msg-saved"));
      }
      closeModal();
      loadTasks();
    } catch (e) {
      showToast("Failed to save: " + e.message);
    } finally {
      modalSave.disabled = false;
      modalSave.textContent = editingEventId ? t("modal-save-edit") : t("modal-save-new");
    }
  };

  await ensureAuthAndExecute(saveAction);
});

// ─── View Modal ───────────────────────────────────────────────────────────────
let viewingEvent = null;

function openViewModal(ev) {
  viewingEvent = ev;
  const desc = ev.description || "";
  const lines = desc.split("\n");
  const url = lines[0]?.startsWith("http") ? lines[0].trim() : "";
  const noteRaw = desc.match(/Note:\s*([\s\S]*)/)?.[1]?.trim() || (!url ? desc.trim() : "");
  const title = ev.summary?.replace(/^Read:\s*/, "") || url || t("default-title-note");
  const start = new Date(ev.start?.dateTime || ev.start?.date);
  const timeStr = start.toLocaleString(getLanguage(), { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  viewModalTitle.textContent = title;
  viewTime.textContent = timeStr;

  // Reset Done button state
  viewDoneBtn.disabled = false;
  viewDoneBtn.textContent = t("view-done-btn");

  if (url) {
    viewUrl.href = url;
    viewUrlText.textContent = url.replace(/^https?:\/\//, "");
    viewUrl.classList.remove("hidden");
  } else {
    viewUrl.classList.add("hidden");
  }

  if (noteRaw) {
    viewNote.textContent = noteRaw;
    viewNote.classList.remove("hidden");
  } else {
    viewNote.classList.add("hidden");
  }

  viewOverlay.classList.remove("hidden");
}

function closeViewModal() {
  viewOverlay.classList.add("hidden");
  viewingEvent = null;
}

viewClose.addEventListener("click", closeViewModal);
viewOverlay.addEventListener("click", (e) => { if (e.target === viewOverlay) closeViewModal(); });

viewEditBtn.addEventListener("click", () => {
  if (!viewingEvent) return;
  const desc = viewingEvent.description || "";
  const lines = desc.split("\n");
  const url = lines[0]?.startsWith("http") ? lines[0].trim() : "";
  const noteRaw = desc.match(/Note:\s*([\s\S]*)/)?.[1]?.trim() || (!url ? desc.trim() : "");
  const title = viewingEvent.summary?.replace(/^Read:\s*/, "") || "";
  const datetime = viewingEvent.start?.dateTime || viewingEvent.start?.date;
  closeViewModal();
  openModal({ url, title, note: noteRaw, datetime }, viewingEvent.id);
});

viewDoneBtn.addEventListener("click", async () => {
  if (!viewingEvent) return;
  const deleteAction = async () => {
    viewDoneBtn.disabled = true;
    viewDoneBtn.textContent = "…";
    try {
      await deleteTaskEvent(viewingEvent.id);
      closeViewModal();
      showToast(t("msg-done"));
      loadTasks();
    } catch (e) {
      showToast(t("msg-delete-failed") + e.message);
      viewDoneBtn.disabled = false;
      viewDoneBtn.textContent = t("view-done-btn");
    }
  };

  await ensureAuthAndExecute(deleteAction);
});

// ─── Task List ───────────────────────────────────────────────────────────────
async function loadTasks() {
  taskList.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><p class="empty-text">${t("empty-loading")}</p></div>`;
  if (isSignedIn()) {
    try {
      const events = await listTaskEvents();
      localStorage.setItem("tasker_cached_events", JSON.stringify(events));
      renderTasks(events);
    } catch (e) {
      loadTasksFromCache();
    }
  } else {
    loadTasksFromCache();
  }
}

function loadTasksFromCache() {
  const cachedData = localStorage.getItem("tasker_cached_events");
  if (cachedData) {
    try {
      const events = JSON.parse(cachedData);
      renderTasks(events);
    } catch (e) {
      renderEmptyError();
    }
  } else {
    renderTasks([]);
  }
}

function renderEmptyError() {
  const errorText = getLanguage() === "ru" 
    ? "Не удалось загрузить задачи.<br/>Проверьте подключение." 
    : "Could not load tasks.<br/>Check your connection.";
  taskList.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p class="empty-text">${errorText}</p></div>`;
}

function renderTasks(events) {
  if (!events.length) {
    taskList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p class="empty-text">${t("empty-desc")}</p>
      </div>`;
    return;
  }

  // Store events for quick lookup
  const eventsMap = {};
  events.forEach(ev => { eventsMap[ev.id] = ev; });

  taskList.innerHTML = events.map(ev => {
    const start = new Date(ev.start?.dateTime || ev.start?.date);
    const desc = ev.description || "";
    const lines = desc.split("\n");
    const url = lines[0]?.startsWith("http") ? lines[0].trim() : "";
    const noteRaw = desc.match(/Note:\s*([\s\S]*)/)?.[1]?.trim() || "";
    const title = ev.summary?.replace(/^Read:\s*/, "") || url || t("default-title-note");
    const isUrl = !!url;
    const timeStr = start.toLocaleString(getLanguage(), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

    return `
      <div class="task-card" data-id="${ev.id}" role="button" tabindex="0" aria-label="View ${title}">
        <div class="task-card-top">
          <div class="task-card-info">
            <span class="task-title ${isUrl ? '' : 'task-title--note'}">${title}</span>
            ${noteRaw ? `<div class="task-note">${noteRaw}</div>` : ""}
          </div>
          <div class="card-actions">
            <button class="btn--icon-edit edit-btn" data-id="${ev.id}" title="Edit" aria-label="Edit">✏️</button>
          </div>
        </div>
        <div class="task-meta">
          <span class="task-time">${timeStr}</span>
          ${isUrl ? `<span class="task-chip">${t("chip-link")}</span>` : `<span class="task-chip">${t("chip-note")}</span>`}
        </div>
      </div>`;
  }).join("");

  // Tap card → view modal
  taskList.querySelectorAll(".task-card").forEach(card => {
    card.addEventListener("click", (e) => {
      // Don't open view if user clicked on the edit button
      if (e.target.closest(".card-actions")) return;
      const ev = eventsMap[card.dataset.id];
      if (ev) openViewModal(ev);
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        const ev = eventsMap[card.dataset.id];
        if (ev) openViewModal(ev);
      }
    });
  });

  // Edit button → edit modal
  taskList.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const ev = eventsMap[btn.dataset.id];
      if (!ev) return;
      const desc = ev.description || "";
      const lines = desc.split("\n");
      const url = lines[0]?.startsWith("http") ? lines[0].trim() : "";
      const noteRaw = desc.match(/Note:\s*([\s\S]*)/)?.[1]?.trim() || (!url ? desc.trim() : "");
      const title = ev.summary?.replace(/^Read:\s*/, "") || "";
      const datetime = ev.start?.dateTime || ev.start?.date;
      openModal({ url, title, note: noteRaw, datetime }, ev.id);
    });
  });
}

// ─── Share Target ────────────────────────────────────────────────────────────
let pendingShare = null;

function parseShareParams() {
  const p = new URLSearchParams(window.location.search);
  const sharedUrl = p.get("url");
  const sharedText = p.get("text");
  const sharedTitle = p.get("title") || "";

  if (sharedUrl || sharedText) {
    history.replaceState(null, "", location.pathname);

    let url = "";
    let note = "";
    if (sharedUrl) {
      url = sharedUrl.trim();
      note = sharedText ? sharedText.trim() : "";
    } else if (sharedText) {
      const trimmed = sharedText.trim();
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        url = trimmed;
      } else {
        note = trimmed;
      }
    }

    pendingShare = { url, title: sharedTitle, note };
  }
}

// ─── Service Worker ──────────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(err =>
      console.warn("SW registration failed:", err)
    );
  });
}

// ─── Init ────────────────────────────────────────────────────────────────────
initTheme();
initLanguage();
parseShareParams();
updateUiState();

if (localStorage.getItem("tasker_was_logged_in") === "1") {
  loadTasks();
}

// Try to silently restore the previous session (no popup)
(async () => {
  try {
    const restored = await tryRestoreSession();
    updateUiState();
    if (restored) {
      loadTasks();
    }
  } catch (_) {
    // Silent fail — user will sign in manually
  }
})();
