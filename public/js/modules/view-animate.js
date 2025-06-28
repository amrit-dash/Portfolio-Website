/* Animate elements if in viewport
* ------------------------------------------------------ */
export const ssViewAnimate = function() {

    const blocks = document.querySelectorAll("[data-animate-block]");

    window.addEventListener("scroll", viewportAnimation);

    function viewportAnimation() {

        let scrollY = window.pageYOffset;

        blocks.forEach(function(current) {

            const viewportHeight = window.innerHeight;
            const triggerTop = (current.offsetTop + (viewportHeight * .2)) - viewportHeight;
            const blockHeight = current.offsetHeight;
            const blockSpace = triggerTop + blockHeight;
            const inView = scrollY > triggerTop && scrollY <= blockSpace;
            const isAnimated = current.classList.contains("ss-animated");

            if (inView && (!isAnimated)) {
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