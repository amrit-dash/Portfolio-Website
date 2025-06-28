/* Animations
* -------------------------------------------------- */
export const tl = anime.timeline({
    easing: 'easeInOutCubic',
    duration: 800,
    autoplay: false
})
.add({
    targets: '#loader',
    opacity: 0,
    duration: 1000,
    begin: function(anim) {
        window.scrollTo(0, 0);
    }
})
.add({
    targets: '#preloader',
    opacity: 0,
    complete: function(anim) {
        document.querySelector("#preloader").style.visibility = "hidden";
        document.querySelector("#preloader").style.display = "none";
    }
})
.add({
    targets: '.s-header',
    translateY: [-100, 0],
    opacity: [0, 1]
}, '-=200')
.add({
    targets: [ '.s-intro .text-pretitle', '.s-intro .text-huge-title'],
    translateX: [100, 0],
    opacity: [0, 1],
    delay: anime.stagger(400)
})
.add({
    targets: '.circles span',
    keyframes: [
        {opacity: [0, .3]},
        {opacity: [.3, .1], delay: anime.stagger(100, {direction: 'reverse'})}
    ],
    delay: anime.stagger(100, {direction: 'reverse'}),
    complete: function(anim) {
        // Enable hover effect after animation
        var circles = document.querySelector('.circles');
        if (circles) {
            circles.classList.add('circles--hoverable');
            // Add hover listeners to each span
            var spans = circles.querySelectorAll('span');
            spans.forEach(function(span, idx) {
                span.addEventListener('mouseenter', function() {
                    span.classList.add('circle--active');
                });
                span.addEventListener('mouseleave', function() {
                    span.classList.remove('circle--active');
                });
            });
        }
    }
})
.add({
    targets: '.intro-social li',
    translateX: [-50, 0],
    opacity: [0, 1],
    delay: anime.stagger(100, {direction: 'reverse'})
})
.add({
    targets: '.intro-scrolldown',
    translateY: [100, 0],
    opacity: [0, 1]
}, '-=800'); 