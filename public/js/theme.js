// Theme + cosmetic engine.
// Owns: light/dark mode, accent colour, custom-cursor toggle, animated
// background toggle, scroll-animation toggle, CV-link swap.
//
// Reads sane defaults from Store.data.theme, then layers any user/admin
// overrides from Prefs (localStorage). Everything is reflected on
// <html data-theme="..."> and a handful of CSS variables.

import { Prefs } from "./store.js";

const root = document.documentElement;

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return "124,92,255";
  return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`;
}

export const Theme = {
  state: { mode: "dark", accent: "#7c5cff", customCursor: true, animatedBg: true, scrollAnims: true },
  data: null,
  listeners: new Set(),

  init(themeData) {
    this.data = themeData || {};
    const prefs = Prefs.read();
    this.state.mode = prefs.mode || themeData.default || "dark";
    this.state.accent = prefs.accent || themeData.accent || "#7c5cff";
    this.state.customCursor = prefs.customCursor ?? themeData.customCursor ?? true;
    this.state.animatedBg = prefs.animatedBackground ?? themeData.animatedBackground ?? true;
    this.state.scrollAnims = prefs.scrollAnimations ?? themeData.scrollAnimations ?? true;
    this._apply();
  },

  setMode(mode) {
    this.state.mode = mode;
    Prefs.write({ mode });
    this._apply();
  },

  toggleMode() {
    this.setMode(this.state.mode === "dark" ? "light" : "dark");
  },

  setAccent(hex) {
    this.state.accent = hex;
    Prefs.write({ accent: hex });
    this._apply();
  },

  setFlag(key, value) {
    this.state[key] = value;
    const map = {
      customCursor: "customCursor",
      animatedBg: "animatedBackground",
      scrollAnims: "scrollAnimations",
    };
    Prefs.write({ [map[key]]: value });
    this._apply();
  },

  cvHref(cv) {
    if (!cv) return "#";
    return this.state.mode === "light" ? cv.light : cv.dark;
  },

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },

  _apply() {
    root.setAttribute("data-theme", this.state.mode);
    root.setAttribute("data-cursor", this.state.customCursor ? "custom" : "default");
    root.setAttribute("data-animated-bg", this.state.animatedBg ? "on" : "off");
    root.setAttribute("data-scroll-anims", this.state.scrollAnims ? "on" : "off");
    root.style.setProperty("--accent", this.state.accent);
    root.style.setProperty("--accent-rgb", hexToRgb(this.state.accent));
    document
      .querySelectorAll("[data-cv-link]")
      .forEach((el) => {
        const cv = this.data && this.data.cv ? this.data.cv : null;
        if (cv) el.setAttribute("href", this.cvHref(cv));
      });
    this.listeners.forEach((fn) => fn(this.state));
  },
};
