// i18n.js – Localization helper

const translations = {
  en: {
    // Header
    "sign-out-btn": "Sign out",

    // Welcome Screen
    "welcome-badge": "✨ Your personal read‑it‑later",
    "welcome-title-1": "Save links.",
    "welcome-title-2": "Add notes.",
    "welcome-title-3": "Get reminded.",
    "welcome-subtitle": "Capture any URL or short task. Choose when you want to be reminded — the app creates a Google Calendar event with a push notification so you never forget.",
    "feature-1": "Share from any app",
    "feature-2": "Pick your reminder time",
    "feature-3": "Synced with Calendar",
    "sign-in-btn": "Sign in with Google",
    "welcome-note": "No data is stored on any server — everything stays in your Google account.",

    // App Screen
    "app-title": "Pending Items",
    "add-btn": "＋ New Item",
    "empty-loading": "Loading…",
    "empty-desc": "No reminders. Share something or click New Item!",

    // View Modal
    "view-modal-title": "Item",
    "view-meta-label": "Reminder",
    "view-edit-btn": "✏️ Edit",
    "view-done-btn": "✓ Done",

    // Create / Edit Modal
    "modal-title-new": "New Reminder",
    "modal-title-edit": "Edit Reminder",
    "label-url": "URL <span class=\"optional\">(optional)</span>",
    "label-title": "Title <span class=\"optional\">(optional)</span>",
    "label-note": "Note <span class=\"optional\">(optional)</span>",
    "label-presets": "Remind me in…",
    "label-datetime": "Or pick a date & time",
    "preset-1": "1 hour",
    "preset-3": "3 hours",
    "preset-6": "6 hours",
    "preset-8": "8 hours",
    "preset-24": "24 hours",
    "modal-cancel": "Cancel",
    "modal-save-new": "Save Reminder",
    "modal-save-edit": "Update",

    // Placeholders
    "placeholder-url": "https://example.com (optional)",
    "placeholder-title": "Article or task title",
    "placeholder-note": "Quick note to yourself…",

    // JS Code Strings
    "msg-signin-failed": "Sign‑in failed: ",
    "msg-signing-in": "Signing in…",
    "msg-signed-out": "Signed out",
    "msg-validation-failed": "Add a URL, title or note",
    "msg-select-time": "Please select a reminder time",
    "msg-saving": "Saving…",
    "msg-saved": "Reminder saved ✓",
    "msg-updated": "Updated ✓",
    "msg-done": "Marked as done ✓",
    "msg-delete-failed": "Could not delete: ",
    "chip-link": "link",
    "chip-note": "note",
    "default-title-note": "Note"
  },
  ru: {
    // Header
    "sign-out-btn": "Выйти",

    // Welcome Screen
    "welcome-badge": "✨ Ваш личный read‑it‑later",
    "welcome-title-1": "Сохраняйте ссылки.",
    "welcome-title-2": "Пишите заметки.",
    "welcome-title-3": "Получайте напоминания.",
    "welcome-subtitle": "Сохраняйте любые ссылки и заметки. Выбирайте время напоминания — приложение создаст событие в Google Календаре с пуш-уведомлением, чтобы вы ничего не забыли.",
    "feature-1": "Делитесь из любого приложения",
    "feature-2": "Выбирайте время",
    "feature-3": "Синхронизация с Календарем",
    "sign-in-btn": "Войти через Google",
    "welcome-note": "Данные не сохраняются на серверах — всё остается в вашем Google-аккаунте.",

    // App Screen
    "app-title": "Ожидающие элементы",
    "add-btn": "＋ Добавить",
    "empty-loading": "Загрузка…",
    "empty-desc": "Нет напоминаний. Поделитесь ссылкой или нажмите Добавить!",

    // View Modal
    "view-modal-title": "Просмотр",
    "view-meta-label": "Напоминание",
    "view-edit-btn": "✏️ Изменить",
    "view-done-btn": "✓ Готово",

    // Create / Edit Modal
    "modal-title-new": "Новое напоминание",
    "modal-title-edit": "Изменить напоминание",
    "label-url": "URL <span class=\"optional\">(опционально)</span>",
    "label-title": "Название <span class=\"optional\">(опционально)</span>",
    "label-note": "Заметка <span class=\"optional\">(опционально)</span>",
    "label-presets": "Напомнить через…",
    "label-datetime": "Или выберите дату и время",
    "preset-1": "1 час",
    "preset-3": "3 часа",
    "preset-6": "6 часов",
    "preset-8": "8 часов",
    "preset-24": "24 часа",
    "modal-cancel": "Отмена",
    "modal-save-new": "Сохранить",
    "modal-save-edit": "Обновить",

    // Placeholders
    "placeholder-url": "https://example.com (опционально)",
    "placeholder-title": "Название статьи или задачи",
    "placeholder-note": "Короткая заметка для себя…",

    // JS Code Strings
    "msg-signin-failed": "Ошибка входа: ",
    "msg-signing-in": "Вход…",
    "msg-signed-out": "Вы вышли из аккаунта",
    "msg-validation-failed": "Добавьте URL, название или заметку",
    "msg-select-time": "Пожалуйста, выберите время напоминания",
    "msg-saving": "Сохранение…",
    "msg-saved": "Напоминание сохранено ✓",
    "msg-updated": "Обновлено ✓",
    "msg-done": "Выполнено ✓",
    "msg-delete-failed": "Не удалось удалить: ",
    "chip-link": "ссылка",
    "chip-note": "заметка",
    "default-title-note": "Заметка"
  }
};

let currentLang = "en";

export function initLanguage() {
  const saved = localStorage.getItem("lang");
  if (saved === "ru" || saved === "en") {
    currentLang = saved;
  } else {
    // Detect from browser locale
    const navLang = navigator.language || navigator.userLanguage || "";
    currentLang = navLang.toLowerCase().startsWith("ru") ? "ru" : "en";
  }
  applyLanguage(currentLang);
}

export function toggleLanguage() {
  const next = currentLang === "en" ? "ru" : "en";
  setLanguage(next);
}

export function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  applyLanguage(lang);
}

export function getLanguage() {
  return currentLang;
}

export function t(key) {
  return translations[currentLang][key] || key;
}

function applyLanguage(lang) {
  // Update HTML lang attribute
  document.documentElement.setAttribute("lang", lang);

  // Update dynamic elements with data-i18n attribute
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const translation = translations[lang][key];
    if (translation) {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.placeholder = translation;
      } else {
        el.innerHTML = translation;
      }
    }
  });

  // Update elements that have placeholders in translation mapping
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    const translation = translations[lang][key];
    if (translation) {
      el.placeholder = translation;
    }
  });

  // Update lang toggle button text
  const langToggleText = document.getElementById("lang-toggle-text");
  if (langToggleText) {
    langToggleText.textContent = lang.toUpperCase();
  }
}
