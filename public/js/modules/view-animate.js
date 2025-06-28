/* Animate elements if in viewport
* ------------------------------------------------------ */
export const ssViewAnimate = function() {

    const blocks = document.querySelectorAll("[data-animate-block]");

    window.addEventListener("scroll", viewportAnimation);

    function viewportAnimation() {
        const viewportHeight = window.innerHeight;

        blocks.forEach(function(current) {
            const rect = current.getBoundingClientRect();
            const inView = (
                rect.top <= (viewportHeight - (viewportHeight * 0.2)) &&
                rect.bottom >= (viewportHeight * 0.2)
            );
            const isAnimated = current.classList.contains("ss-animated");

            if (inView && !isAnimated) {
                anime({
                    targets: current.querySelectorAll("[data-animate-el]"),
                    opacity: [0, 1],
                    translateY: [100, 0],
                    delay: anime.stagger(400, {start: 200}),
                    duration: 800,
                    easing: 'easeInOutCubic',
                    begin: function(anim) {
                        current.classList.add("ss-animated");
                    }
                });
            }
        });
    }

}; // end ssViewAnimate 