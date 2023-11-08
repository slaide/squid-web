for(element of document.getElementsByClassName("dynamic-image-display")){
    let image_container_element=document.createElement("div")
    image_container_element.classList.add("dynamic-image-container")
    element.appendChild(image_container_element)

    image_container_element.image_offset_top=0;
    image_container_element.image_offset_left=0;
    image_container_element.image_scale=1;

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
    })

    let image_element=document.createElement("img")
    image_element.classList.add("dynamic-image")
    image_element.setAttribute("src","https://i2.wp.com/nonicoclolasos.wordpress.com/files/2008/10/ekorre.jpg")

    let observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
            // get img size
            let img_height=entry.target.clientHeight
            let img_width=entry.target.clientWidth

            // get container size
            let container_height=entry.target.parentNode.clientHeight
            let container_width=entry.target.parentNode.clientWidth

            // calculate image scale to display in full
            let height_ratio=container_height/img_height
            let width_ratio=container_width/img_width

            // reduce scale slightly for some nicer visual presentation (and to make it clear that the whole image is in view)
            let scale=Math.min(height_ratio,width_ratio)*0.95

            // calculate offsets to center image
            let offset_left=(container_width-img_width)/2
            let offset_top=(container_height-img_height)/2

            // save new scale and offsets
            entry.target.parentNode.image_scale=scale
            entry.target.parentNode.image_offset_left=offset_left
            entry.target.parentNode.image_offset_top=offset_top

            // apply new scale and offsets
            entry.target.parentNode.children[0].style.setProperty("--scale",entry.target.parentNode.image_scale)
            entry.target.parentNode.children[0].style.setProperty("--left",entry.target.parentNode.image_offset_left+"px")
            entry.target.parentNode.children[0].style.setProperty("--top",entry.target.parentNode.image_offset_top+"px")
    
            // stop observing
            observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01 }); // Execute callback when at least 1% of the target is visible
  
    observer.observe(image_element);

    image_container_element.appendChild(image_element)
}
