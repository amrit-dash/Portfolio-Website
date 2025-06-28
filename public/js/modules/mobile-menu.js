/* Mobile Menu
* ---------------------------------------------------- */ 
export const ssMobileMenu = function() {

    const toggleButton = document.querySelector('.mobile-menu-toggle');
    const mainNavWrap = document.querySelector('.main-nav-wrap');
    const siteBody = document.querySelector("body");

    if (!(toggleButton && mainNavWrap)) return;

    toggleButton.addEventListener('click', function(event) {
        event.preventDefault();
        toggleButton.classList.toggle('is-clicked');
        siteBody.classList.toggle('menu-is-open');
    });

    mainNavWrap.querySelectorAll('.main-nav a').forEach(function(link) {
        link.addEventListener("click", function(event) {

            // at 800px and below
            if (window.matchMedia('(max-width: 800px)').matches) {
                toggleButton.classList.toggle('is-clicked');
                siteBody.classList.toggle('menu-is-open');
            }
        });
    });

    window.addEventListener('resize', function() {

        // above 800px
        if (window.matchMedia('(min-width: 801px)').matches) {
            if (siteBody.classList.contains('menu-is-open')) siteBody.classList.remove('menu-is-open');
            if (toggleButton.classList.contains("is-clicked")) toggleButton.classList.remove("is-clicked");
        }
    });

}; // end ssMobileMenu 