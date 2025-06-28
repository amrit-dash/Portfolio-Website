import { ssPreloader } from './modules/preloader.js';
import { ssMobileMenu } from './modules/mobile-menu.js';
import { ssScrollSpy } from './modules/scroll-spy.js';
import { ssViewAnimate } from './modules/view-animate.js';
import { ssSwiper } from './modules/swiper.js';
import { ssLightbox } from './modules/lightbox.js';
import { ssAlertBoxes } from './modules/alert-boxes.js';
import { ssMoveTo } from './modules/smooth-scroll.js';

(function(html) {

    "use strict";

    html.className = html.className.replace(/\bno-js\b/g, '') + ' js ';

    /* Initialize
    * ------------------------------------------------------ */
    (function ssInit() {

        ssPreloader();
        ssMobileMenu();
        ssScrollSpy();
        ssViewAnimate();
        ssSwiper();
        ssLightbox();
        ssAlertBoxes();
        ssMoveTo();

    })();

})(document.documentElement); 