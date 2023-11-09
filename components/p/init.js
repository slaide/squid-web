var p={
    config:{},
    templates:{},
    observer_first_draw:new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // If the element is intersecting with the viewport (i.e., it's visible)
            if (entry.isIntersecting) {
                let element=entry.target

                let init_vis_func_name=element.getAttribute("p:init-vis")
                let init_vis_func=p[init_vis_func_name]
                init_vis_func(entry.target)

                p.observer_first_draw.unobserve(element); // Stop observing this element
            }
        });
    }),
    init(subtree=document,include_root=false){
        if(subtree.querySelectorAll){
            // get list of elements to process
            let subtree_with_data_class=[]
            for(let element of subtree.querySelectorAll(".data")){
                subtree_with_data_class.push(element)
            }
            if(include_root){
                subtree_with_data_class.push(subtree)
            }

            // process elements
            for(let element of subtree_with_data_class){
                let init_func_name=element.getAttribute("p:init")
                if(init_func_name){
                    p[init_func_name]=p[init_func_name].bind(p)

                    let init_func=p[init_func_name]
                    init_func(element)
                }

                let init_vis_func_name=element.getAttribute("p:init-vis")
                if(init_vis_func_name){
                    p[init_vis_func_name]=p[init_vis_func_name].bind(p)

                    p.observer_first_draw.observe(element);
                }

                for(attribute of element.attributes){
                    if(attribute.name.startsWith("p:on-")){
                        let event_name=attribute.name.replace("p:on-","")
                        let event_func_name=attribute.value

                        element.addEventListener(event_name,function(event){
                            p[event_func_name]=p[event_func_name].bind(p)
                            p[event_func_name](event)
                        })
                    }
                }
            }

            //make all number input fields adhere to their min/max values during input and allow using scroll to adjust their values
            let subtree_with_input_tag=[]
            for(let element of subtree.querySelectorAll("input")){
                subtree_with_input_tag.push(element)
            }
            if(include_root){
                subtree_with_input_tag.push(subtree)
            }
            for(element of subtree_with_input_tag){
                function get_num_decmial_digits(v){
                    return v.toString().split(".").find((val,index,l)=>index==l.length-1).length
                }

                let input_type=element.getAttribute("type")
                if(input_type=="number"){
                    element.addEventListener("input",function(event){
                        let event_target=event.target

                        let min_value=parseFloat(event_target.getAttribute("min"))
                        let max_value=parseFloat(event_target.getAttribute("max"))
                        let step_value=parseFloat(event_target.getAttribute("step"))

                        let current_value=parseFloat(event_target.value)

                        let value_was_changed=false
                        if(current_value<min_value){
                            current_value=min_value
                            value_was_changed=true
                        }else if(current_value>max_value){
                            current_value=max_value
                            value_was_changed=true
                        }

                        // only overwrite value if it was changed
                        // (otherwise the cursor position would be reset to the end of the input field after every single character input in the field)
                        if(value_was_changed){
                            if(step_value){
                                let num_decmial_digits=get_num_decmial_digits(step_value)
                                current_value=current_value.toFixed(num_decmial_digits)
                            }
                            event_target.value=current_value
                        }
                    })
                    let wheel_adjust=element.getAttribute("wheel-adjust")
                    if(wheel_adjust==null || wheel_adjust==true || wheel_adjust=="true"){
                        element.addEventListener("wheel",function(event){
                            event.preventDefault()

                            let event_target=event.target

                            let min_value=parseFloat(event_target.getAttribute("min"))
                            let max_value=parseFloat(event_target.getAttribute("max"))
                            let step_value=parseFloat(event_target.getAttribute("step")) || 1

                            let current_value=parseFloat(event_target.value)

                            if(event.deltaY>0){
                                current_value-=step_value
                            }
                            if(event.deltaY<0){
                                current_value+=step_value
                            }

                            if(current_value<min_value){
                                current_value=min_value
                            }
                            if(current_value>max_value){
                                current_value=max_value
                            }

                            let num_decmial_digits=get_num_decmial_digits(step_value)
                            event_target.value=current_value.toFixed(num_decmial_digits)
                        })
                    }
                }
            }

            // save templates for later insertion
            for(let template of subtree.querySelectorAll("template")){
                // remove template from DOM
                template.parentElement.removeChild(template)
                
                // save for later use
                let template_name=template.getAttribute("name")
                this.templates[template_name]=template

                console.log(template)
            }
        }

        p.init_done=true
    },
    create_dropdown(element,value_list){
        for(value of value_list){
            let option=document.createElement("option")
            option.value=value.handle
            option.innerText=value.name
            element.appendChild(option)
        }
    }
}
document.addEventListener("DOMContentLoaded",function(){
    p.init()
})