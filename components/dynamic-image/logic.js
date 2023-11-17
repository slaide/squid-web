function center_image(element){
    if(element.classList.contains("dynamic-image")){
        element=element.parentNode;
    }

    let img_height=element.children[0].clientHeight
    let img_width=element.children[0].clientWidth

    let half_img_height=img_height/2
    let half_img_width=img_width/2

    // calculate scale so that image fits into container
    let img_scale_to_fit=Math.min(element.clientHeight/img_height,element.clientWidth/img_width)*0.95
    element.image_scale=img_scale_to_fit

    let scaled_img_height=img_scale_to_fit*img_height
    let scaled_img_width=img_scale_to_fit*img_width

    // then calculate offset to center image within container
    let base_offset_x=(element.clientWidth-scaled_img_width)/2
    let base_offset_y=(element.clientHeight-scaled_img_height)/2

    element.image_offset_left=base_offset_x-half_img_width+scaled_img_width/2
    element.image_offset_top=base_offset_y-half_img_height+scaled_img_height/2

    element.children[0].style.setProperty("--left",element.image_offset_left+"px")
    element.children[0].style.setProperty("--top",element.image_offset_top+"px")
    element.children[0].style.setProperty("--scale",element.image_scale)
}

document.addEventListener("DOMContentLoaded",function(){
    for(element of document.getElementsByClassName("dynamic-image-display")){
        let image_container_element=document.createElement("div")
        image_container_element.classList.add("dynamic-image-container")
        element.appendChild(image_container_element)

        // initialize these values to _something_
        image_container_element.image_offset_top=0;
        image_container_element.image_offset_left=0;
        image_container_element.image_scale=1;

        image_container_element.addEventListener("dblclick",(event)=>center_image(event.currentTarget))
        image_container_element.addEventListener("mousedown",function(event){
            event.preventDefault()

            let event_target=event.target
            if(event_target.classList.contains("dynamic-image")){
                event_target=event_target.parentNode;
            }

            event_target.start_x=event.clientX
            event_target.start_y=event.clientY

            function drag_mouse(event){
                event.preventDefault()

                let event_target=event.target
                if(event_target.classList.contains("dynamic-image")){
                    event_target=event_target.parentNode;
                }
                
                let current_offset_x = event.clientX - event_target.start_x
                let current_offset_y = event.clientY - event_target.start_y

                event_target.children[0].style.setProperty("--left",event_target.image_offset_left+current_offset_x+"px")
                event_target.children[0].style.setProperty("--top",event_target.image_offset_top+current_offset_y+"px")
            }
            image_container_element.addEventListener("mousemove",drag_mouse)
            function end_mouse_move(event){
                event.preventDefault()

                let event_target=event.target
                if(event_target.classList.contains("dynamic-image")){
                    event_target=event_target.parentNode;
                }
                let current_offset_x = event.clientX - event_target.start_x
                let current_offset_y = event.clientY - event_target.start_y
                
                event_target.image_offset_left+=current_offset_x
                event_target.image_offset_top+=current_offset_y

                image_container_element.removeEventListener("mousemove",drag_mouse)
                
                image_container_element.removeEventListener("mouseup",end_mouse_move)
                image_container_element.removeEventListener("mouseleave",end_mouse_move)
            }
            image_container_element.addEventListener("mouseup",end_mouse_move)
            image_container_element.addEventListener("mouseleave",end_mouse_move)

            event_target.children[0].style.setProperty("--left",event_target.image_offset_left+"px")
            event_target.children[0].style.setProperty("--top",event_target.image_offset_top+"px")
        })
        image_container_element.addEventListener("wheel",function(event){
            event.preventDefault()

            let event_target=event.target
            if(event_target.classList.contains("dynamic-image")){
                event_target=event_target.parentNode;
            }

            if(event.deltaY<0){
                event_target.image_scale*=1.05;
            }else{
                event_target.image_scale/=1.05;
            }

            event_target.children[0].style.setProperty("--scale",event_target.image_scale)
        },{passive:false})

        let image_element=document.createElement("img")
        image_element.classList.add("dynamic-image")

        let img_src=element.getAttribute("src")
        if(img_src){
            image_element.setAttribute("src",img_src)
        }

        // once element is loaded, wait for first draw, then center it
        // (workaround for multiple browsers where image size is not determined on load, but on display)
        image_element.addEventListener("load",(event)=>{
            let element=event.currentTarget
            let intersection_observer=new IntersectionObserver((entries)=>{
                for(let entry of entries){
                    if(entry.isIntersecting){
                        center_image(element)
                        intersection_observer.disconnect()
                    }
                }
            })
            intersection_observer.observe(element)
        })

        image_container_element.appendChild(image_element)
    }
})
