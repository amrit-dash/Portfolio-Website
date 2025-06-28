import { tl } from './animations.js';

/* Preloader
 * -------------------------------------------------- */
export const ssPreloader = function() {

    const preloader = document.querySelector('#preloader');
    if (!preloader) return;
    
    window.addEventListener('load', function() {
        document.querySelector('html').classList.remove('ss-preload');
        document.querySelector('html').classList.add('ss-loaded');

        document.querySelectorAll('.ss-animated').forEach(function(item){
            item.classList.remove('ss-animated');
        });

        tl.play();
    });

}; // end ssPreloader 