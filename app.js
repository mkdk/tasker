// app.js – UI logic for Read‑it‑later PWA
import { signIn, signOut, tryRestoreSession, createTaskEvent, listTaskEvents, deleteTaskEvent } from "./api.js";

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

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

// ─── Elements ────────────────────────────────────────────────────────────────
const signInBtn     = document.getElementById("sign-in-btn");
const signOutBtn    = document.getElementById("sign-out-btn");
const welcomeScreen = document.getElementById("welcome-screen");
const appScreen     = document.getElementById("app-screen");
const taskList      = document.getElementById("task-list");
const addBtn        = document.getElementById("add-btn");
const toast         = document.getElementById("toast");

// Modal elements
const modalOverlay  = document.getElementById("modal-overlay");
const modalClose    = document.getElementById("modal-close");
const modalCancel   = document.getElementById("modal-cancel");
const modalSave     = document.getElementById("modal-save");
const inputUrl      = document.getElementById("input-url");
const inputTitle    = document.getElementById("input-title");
const inputNote     = document.getElementById("input-note");
const inputDatetime = document.getElementById("input-datetime");
const presetBtns    = document.querySelectorAll(".preset-btn");

// ─── Auth ────────────────────────────────────────────────────────────────────
function setAuthenticated(isAuth) {
  if (isAuth) {
    signInBtn.classList.add("hidden");
    signOutBtn.classList.remove("hidden");
    welcomeScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    loadTasks();
  } else {
    signInBtn.classList.remove("hidden");
    signOutBtn.classList.add("hidden");
    welcomeScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
  }
}

signInBtn.addEventListener("click", async () => {
  signInBtn.disabled = true;
  signInBtn.textContent = "Signing in…";
  try {
    await signIn();
    setAuthenticated(true);
  } catch (e) {
    showToast("Sign‑in failed: " + e.message);
    signInBtn.disabled = false;
    signInBtn.innerHTML = `<svg class="google-icon" viewBox="0 0 24 24" width="20" height="20"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Sign in with Google`;
  }
});

signOutBtn.addEventListener("click", () => {
  signOut();
  setAuthenticated(false);
  showToast("Signed out");
});

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

// ─── Modal ───────────────────────────────────────────────────────────────────
let selectedDate = null;

function openModal(preFill = {}) {
  inputUrl.value      = preFill.url   || "";
  inputTitle.value    = preFill.title || "";
  inputNote.value     = preFill.note  || "";
  inputDatetime.value = "";
  selectedDate        = null;
  presetBtns.forEach(b => b.classList.remove("active"));
  modalOverlay.classList.remove("hidden");
  // Focus first empty field
  setTimeout(() => (inputUrl.value ? inputTitle.focus() : inputUrl.focus()), 100);
}

function closeModal() {
  modalOverlay.classList.add("hidden");
}

addBtn.addEventListener("click", openModal);
modalClose.addEventListener("click", closeModal);
modalCancel.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

presetBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    presetBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const hours = parseFloat(btn.dataset.hours);
    const d = new Date();
    d.setTime(d.getTime() + hours * 3600 * 1000);
    selectedDate = d;
    // Show in picker (local datetime string)
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

modalSave.addEventListener("click", async () => {
  const url   = inputUrl.value.trim();
  const title = inputTitle.value.trim();
  const note  = inputNote.value.trim();

  // At least one of URL or note is required
  if (!url && !note && !title) {
    showToast("Add a URL, title or note");
    return;
  }
  if (!selectedDate) {
    showToast("Please select a reminder time");
    return;
  }

  modalSave.disabled = true;
  modalSave.textContent = "Saving…";

  try {
    await createTaskEvent({ title, url, note, datetime: selectedDate });
    closeModal();
    showToast("Reminder saved ✓");
    loadTasks();
  } catch (e) {
    showToast("Failed to save: " + e.message);
  } finally {
    modalSave.disabled = false;
    modalSave.textContent = "Save Reminder";
  }
});

// ─── Task List ───────────────────────────────────────────────────────────────
async function loadTasks() {
  taskList.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><p class="empty-text">Loading…</p></div>`;
  try {
    const events = await listTaskEvents();
    renderTasks(events);
  } catch (e) {
    taskList.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p class="empty-text">Could not load tasks.<br/>Check your connection.</p></div>`;
  }
}

function renderTasks(events) {
  if (!events.length) {
    taskList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p class="empty-text">No pending items.<br/>Add your first link or note!</p>
      </div>`;
    return;
  }

  taskList.innerHTML = events.map(ev => {
    const start = new Date(ev.start?.dateTime || ev.start?.date);
    const desc  = ev.description || "";
    // Parse URL and note from description
    const lines   = desc.split("\n");
    const url     = lines[0] || "";
    const noteRaw = desc.match(/Note:\s*([\s\S]*)/)?.[1]?.trim() || "";
    const title   = ev.summary?.replace(/^Read:\s*/, "") || url || "Note";
    const isUrl   = url.startsWith("http");
    const timeStr = start.toLocaleString(undefined, { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });

    return `
      <div class="task-card" data-id="${ev.id}">
        <div class="task-card-top">
          <div class="task-card-info">
            ${isUrl
              ? `<a href="${url}" target="_blank" rel="noopener" class="task-title">${title}</a>`
              : `<span class="task-title task-title--note">${title}</span>`
            }
            ${noteRaw ? `<div class="task-note">${noteRaw}</div>` : ""}
          </div>
          <button class="btn btn--danger mark-done" data-id="${ev.id}" title="Mark as done">✓ Done</button>
        </div>
        <div class="task-meta">
          <span class="task-time">${timeStr}</span>
          ${isUrl ? `<span class="task-chip">link</span>` : `<span class="task-chip">note</span>`}
        </div>
      </div>`;
  }).join("");

  taskList.querySelectorAll(".mark-done").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const card = taskList.querySelector(`.task-card[data-id="${id}"]`);
      btn.disabled = true;
      btn.textContent = "…";
      try {
        await deleteTaskEvent(id);
        card.style.animation = "none";
        card.style.opacity = "0";
        card.style.transform = "scale(0.96)";
        card.style.transition = "all 0.2s ease";
        setTimeout(() => { card.remove(); if (!taskList.querySelector(".task-card")) renderTasks([]); }, 220);
        showToast("Marked as done ✓");
      } catch (e) {
        showToast("Could not delete: " + e.message);
        btn.disabled = false;
        btn.textContent = "✓ Done";
      }
    });
  });
}

// ─── Share Target ────────────────────────────────────────────────────────────
function parseShareParams() {
  const p = new URLSearchParams(window.location.search);
  const url = p.get("url") || p.get("text");
  const title = p.get("title") || "";
  if (url) {
    history.replaceState(null, "", location.pathname);
    // Show modal once signed in; if not yet, queue it
    if (!appScreen.classList.contains("hidden")) {
      openModal({ url, title });
    } else {
      signInBtn.addEventListener("click", () => {
        setTimeout(() => openModal({ url, title }), 800);
      }, { once: true });
    }
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
setAuthenticated(false);
parseShareParams();

// Try to silently restore the previous session (no popup)
(async () => {
  try {
    const restored = await tryRestoreSession();
    if (restored) setAuthenticated(true);
  } catch (_) {
    // Silent fail — user will sign in manually
  }
})();
