// Entry point — composes the small modules that power the site.
import { initBootScreen } from './modules/boot.js';
import { initTheme }       from './modules/theme.js';
import { initThreeBg }     from './modules/three-bg.js';
import { initScrollAnim }  from './modules/scroll-animate.js';
import { initNav }         from './modules/nav.js';
import { initModals }      from './modules/modals.js';
import { initTabs }        from './modules/tabs.js';
import { initCv }          from './modules/cv.js';
import { initContent }     from './modules/content-loader.js';
import { initCosmetics }   from './modules/cosmetics.js';

(async function () {
    try {
        initTheme();
        initBootScreen();
        initNav();
        initTabs();
        initModals();
        initScrollAnim();
        initCv();
        initThreeBg();
        await initCosmetics();
        await initContent();
    } catch (err) {
        console.warn('[init]', err);
    }
})();
