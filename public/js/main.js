// Single entry-point for the portfolio.
//
// Boot order:
//   1. Load Store (data file + admin overlay)
//   2. Init Theme using theme prefs
//   3. Render the entire page
//   4. Wire UI bindings + animations + cursor + 3D background
//   5. Subscribe to Store changes (so the admin dashboard can edit live)

import { Store } from "./store.js";
import { Theme } from "./theme.js";
import { render } from "./render.js";
import { initUI, renderUI } from "./ui.js";
import { initAnimations } from "./animate.js";
import { initCursor } from "./cursor.js";
import { initThreeBackground } from "./three-bg.js";

async function boot() {
  await Store.load();
  Theme.init(Store.data.theme);
  render(Store.data);
  renderUI(Store.data);
  initUI();
  initAnimations();
  if (Theme.state.customCursor) initCursor();
  initThreeBackground();
  hidePreloader();

  Theme.onChange(() => renderUI(Store.data));

  Store.subscribe((data) => {
    render(data);
    renderUI(data);
    initAnimations();
  });
}

function hidePreloader() {
  const p = document.getElementById("preloader");
  if (!p) return;
  requestAnimationFrame(() => {
    p.classList.add("is-hidden");
    setTimeout(() => p.remove(), 700);
  });
}

boot().catch((e) => {
  console.error("Boot failure", e);
  hidePreloader();
});
