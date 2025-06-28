/* Swiper
* ------------------------------------------------------ */ 
export const ssSwiper = function() {

    const mySwiper = new Swiper('.swiper-container', {

        slidesPerView: 1,
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        breakpoints: {
            // when window width is > 400px
            401: {
                slidesPerView: 1,
                spaceBetween: 20
            },
            // when window width is > 800px
            801: {
                slidesPerView: 2,
                spaceBetween: 32
            },
            // when window width is > 1200px
            1201: {
                slidesPerView: 2,
                spaceBetween: 80
            }
        }
     });

}; // end ssSwiper 