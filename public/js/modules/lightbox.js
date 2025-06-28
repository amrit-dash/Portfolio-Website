/* Lightbox
* ------------------------------------------------------ */
export const ssLightbox = function() {

    const folioLinks = document.querySelectorAll('.folio-list__item-link');
    const modals = [];

    folioLinks.forEach(function(link) {
        let modalbox = link.getAttribute('href');
        let instance = basicLightbox.create(
            document.querySelector(modalbox),
            {
                onShow: function(instance) {
                    //detect Escape key press
                    document.addEventListener("keydown", function(event) {
                        event = event || window.event;
                        if (event.keyCode === 27) {
                            instance.close();
                        }
                    });
                }
            }
        )
        modals.push(instance);
    });

    folioLinks.forEach(function(link, index) {
        link.addEventListener("click", function(event) {
            event.preventDefault();
            modals[index].show();
        });
    });

};  // end ssLightbox 