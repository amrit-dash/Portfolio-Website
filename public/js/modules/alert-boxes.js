/* Alert boxes
* ------------------------------------------------------ */
export const ssAlertBoxes = function() {

    const boxes = document.querySelectorAll('.alert-box');

    boxes.forEach(function(box){

        box.addEventListener('click', function(event) {
            if (event.target.matches(".alert-box__close")) {
                event.stopPropagation();
                event.target.parentElement.classList.add("hideit");

                setTimeout(function(){
                    box.style.display = "none";
                }, 500)
            }    
        });

    })

}; // end ssAlertBoxes 