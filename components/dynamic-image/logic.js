let zoom_speed=0.09
let max_speed=10
let default_min_scale=0.05
let default_max_scale=100

function center_image(element){
    if(element.classList.contains("dynamic-image")){
        element=element.parentNode;
    }

    let img_height=element.children[0].clientHeight
    let img_width=element.children[0].clientWidth

    let container_height=element.clientHeight
    let container_width=element.clientWidth

    // calculate scale so that image fits into container
    let img_scale_to_fit=Math.min(container_height/img_height,container_width/img_width)*0.95
    element.image_scale=img_scale_to_fit

    element.image_offset_left=container_width/2 - img_width/2
    element.image_offset_top=container_height/2 - img_height/2

    element.children[0].style.setProperty("--left",element.image_offset_left+"px")
    element.children[0].style.setProperty("--top",element.image_offset_top+"px")
    element.children[0].style.setProperty("--scale",element.image_scale)
}
function center_image_on_load(element){
    element.addEventListener("load",(event)=>{
        let element=event.currentTarget
        // center on event trigger (may not actually display image if it is outside current viewport, but _could_)
        center_image(element)
        // then center on first draw (when image is actually displayed)
        let intersection_observer=new IntersectionObserver((entries)=>{
            for(let entry of entries){
                if(entry.isIntersecting){
                    center_image(element)
                    intersection_observer.disconnect()
                }
            }
        })
        // register this on parent, because image may initially be hidden (outside current viewport)
        intersection_observer.observe(element.parentNode)
    })
}

document.addEventListener("DOMContentLoaded",function(){
    for(element of document.getElementsByClassName("dynamic-image-display")){
        let image_container_element=document.createElement("div")
        image_container_element.classList.add("dynamic-image-container")
        element.appendChild(image_container_element)

        // initialize these values
        image_container_element.image_offset_top=0;
        image_container_element.image_offset_left=0;
        image_container_element.image_scale=1;

        image_container_element.addEventListener("dblclick",(event)=>{center_image(event.currentTarget);center_image(event.currentTarget)})
        image_container_element.addEventListener("mousedown",function(event){
            event.preventDefault()

            let event_target=event.currentTarget

            event_target.start_x=event.clientX
            event_target.start_y=event.clientY

            function drag_mouse(event){
                event.preventDefault()

                let event_target=event.currentTarget
                
                let current_offset_x = (event.clientX - event_target.start_x)
                let current_offset_y = (event.clientY - event_target.start_y)

                event_target.children[0].style.setProperty("--left",event_target.image_offset_left+current_offset_x+"px")
                event_target.children[0].style.setProperty("--top",event_target.image_offset_top+current_offset_y+"px")
            }
            image_container_element.addEventListener("mousemove",drag_mouse)
            function end_mouse_move(event){
                event.preventDefault()

                let event_target=event.currentTarget

                let current_offset_x = (event.clientX - event_target.start_x)
                let current_offset_y = (event.clientY - event_target.start_y)
                
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

            let event_target=event.currentTarget

            let img_height=event_target.children[0].clientHeight
            let img_width=event_target.children[0].clientWidth

            // calculate event position relative to top left of viewport
            let event_x = (event.clientX - event_target.getBoundingClientRect().left)
            let event_y = (event.clientY - event_target.getBoundingClientRect().top)

            // calculate event position relative to top left of (unscaled!) image
            event_x -= event_target.image_offset_left
            event_y -= event_target.image_offset_top

            // correct for scaled image
            event_x += -img_width/2*(1-event_target.image_scale)
            event_y += -img_height/2*(1-event_target.image_scale)

            // correct for scaling to get position relative to top left of (unscaled!) image
            event_x /= event_target.image_scale
            event_y /= event_target.image_scale

            // get artificial origin (pointer position within image)
            let offset_x=img_width/2-event_x
            let offset_y=img_height/2-event_y

            // correct offset for image scaling, before applying new scale
            let event_before_x = -offset_x*(1-event_target.image_scale)
            let event_before_y = -offset_y*(1-event_target.image_scale)

            let relative_speed=Math.abs(event.deltaY)
            if(relative_speed>max_speed){
                relative_speed=max_speed
            }

            if(event.deltaY<0){
                event_target.image_scale*=1+(zoom_speed*relative_speed);
            }else{
                event_target.image_scale/=1+(zoom_speed*relative_speed);
            }

            // clamp scale
            let min_scale=event_target.getAttribute("min-scale")
            if(min_scale===null){
                min_scale=default_min_scale
            }

            let max_scale=event_target.getAttribute("max-scale")
            if(max_scale===null){
                max_scale=default_max_scale
            }

            event_target.image_scale=Math.min(Math.max(event_target.image_scale,min_scale),max_scale)

            // correct offset for image scaling, after applying new scale
            let event_after_x = -offset_x*(1-event_target.image_scale)
            let event_after_y = -offset_y*(1-event_target.image_scale)

            // calculate difference between event position before and after scaling
            let event_offset_x = event_after_x - event_before_x
            let event_offset_y = event_after_y - event_before_y

            // calculate new offset for image, so that event position remains the same
            event_target.image_offset_left += event_offset_x
            event_target.image_offset_top += event_offset_y

            event_target.children[0].style.setProperty("--left",event_target.image_offset_left+"px")
            event_target.children[0].style.setProperty("--top",event_target.image_offset_top+"px")
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
        center_image_on_load(image_element)

        image_container_element.appendChild(image_element)
    }
})
