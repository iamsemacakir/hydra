/*
 * Hydra login theme: Auto, Light and Dark.
 *
 * The same rule as the Hydra web app (frontend/web/src/components/landing/theme.ts): Auto shows Light
 * from 07:00 to 19:00 local time and Dark otherwise; Light and Dark are stored in localStorage under
 * the same key. Keycloak runs on its own origin, so its stored choice is separate from the app's.
 *
 * Loaded in <head> without defer, so the theme is on <html> before the first paint. The switch in the
 * header is wired once the page has loaded. The page also toggles PatternFly's dark class, so
 * Keycloak's own components follow the theme.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "dp-landing-theme";
  var LIGHT_FROM_HOUR = 7; // inclusive
  var LIGHT_UNTIL_HOUR = 19; // exclusive
  var PATTERNFLY_DARK_CLASS = "pf-v5-theme-dark";
  var root = document.documentElement;

  function isPreference(value) {
    return value === "auto" || value === "light" || value === "dark";
  }

  function readStoredPreference() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      return stored === "light" || stored === "dark" ? stored : "auto";
    } catch (error) {
      return "auto";
    }
  }

  function resolveTheme(preference) {
    if (preference !== "auto") return preference;
    var hour = new Date().getHours();
    return hour >= LIGHT_FROM_HOUR && hour < LIGHT_UNTIL_HOUR ? "light" : "dark";
  }

  function currentPreference() {
    var value = root.getAttribute("data-landing-pref");
    return isPreference(value) ? value : "auto";
  }

  /** Writes the preference and the theme onto <html> and marks the pressed segment of the switch. */
  function commit(preference) {
    var theme = resolveTheme(preference);
    root.setAttribute("data-landing-pref", preference);
    root.setAttribute("data-landing-theme", theme);
    root.classList.toggle(PATTERNFLY_DARK_CLASS, theme === "dark");
    var options = document.querySelectorAll("[data-theme-option]");
    for (var i = 0; i < options.length; i++) {
      options[i].setAttribute("aria-pressed", String(options[i].getAttribute("data-theme-option") === preference));
    }
  }

  /** Crossfades when the visible theme changes, unless the visitor prefers reduced motion. */
  function apply(preference, animate) {
    var changes = root.getAttribute("data-landing-theme") !== resolveTheme(preference);
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (animate && changes && !reduce && typeof document.startViewTransition === "function") {
      document.startViewTransition(function () {
        commit(preference);
      });
    } else {
      commit(preference);
    }
  }

  function choose(preference) {
    try {
      if (preference === "auto") window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, preference);
    } catch (error) {
      // Storage can be blocked (private mode, policies). The choice then lasts for this page only.
    }
    apply(preference, true);
  }

  // Before the first paint.
  commit(readStoredPreference());

  document.addEventListener("DOMContentLoaded", function () {
    commit(currentPreference());
    var options = document.querySelectorAll("[data-theme-option]");
    for (var i = 0; i < options.length; i++) {
      options[i].addEventListener("click", function (event) {
        var value = event.currentTarget.getAttribute("data-theme-option");
        if (isPreference(value)) choose(value);
      });
    }
  });

  // In Auto the theme follows the clock: check every minute and when the tab becomes visible again.
  function refresh() {
    if (currentPreference() === "auto") apply("auto", true);
  }
  window.setInterval(refresh, 60000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") refresh();
  });

  // Another tab changed the preference.
  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY || event.key === null) apply(readStoredPreference(), false);
  });
})();
