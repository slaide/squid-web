let p={
    config:{},
    templates:{},
    observer_first_draw:new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // If the element is intersecting with the viewport (i.e., it's visible)
            if(entry.isIntersecting) {
                let element=entry.target

                let init_vis_func_name=element.getAttribute("p:init-vis")
                let init_vis_func=p[init_vis_func_name]
                init_vis_func(entry.target)

                p.observer_first_draw.unobserve(element); // Stop observing this element
            }
        });
    }),
    oberserver_resize:new ResizeObserver((entries) => {
        for(let entry of entries){
            let resize_callback_name=entry.target.getAttribute("p:on-resize")
            let resize_callback=p[resize_callback_name].bind(p)

            resize_callback(entry.target)
        }
    }),
    get_img_data(img_element,also_return_canvas=false){
        const canvas = document.createElement('canvas');
        canvas.width = img_element.width;
        canvas.height = img_element.height;
    
        // Draw the image on canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img_element, 0, 0);
    
        // Extract image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        if(also_return_canvas){
            return [imageData,canvas,ctx]
        }

        return imageData
    },
    tooltip_begin(event){
        let tooltip_el=event.currentTarget.tooltip_element
        if(!tooltip_el){
            tooltip_el=this.templates.tooltip.cloneNode(true).children[0]

            let tooltip_text=event.currentTarget.getAttribute("p:tooltip")
            // if tooltip references a whole element, use its innerHTML as tooltip text, and remove that element from its parent
            if(tooltip_text.startsWith("#")){
                let tooltip_text_element=document.querySelector(tooltip_text)
                tooltip_el.innerHTML=tooltip_text_element.innerHTML

                tooltip_text_element.parentElement.removeChild(tooltip_text_element)
                tooltip_text_element.classList.add("processed")
            }else{
                tooltip_el.innerHTML=tooltip_text
            }

            tooltip_el.element_anker=event.currentTarget
            event.currentTarget.tooltip_element=tooltip_el
        }

        if(this.active_tooltip){
            this.tooltip_cancel(this.active_tooltip)
        }

        document.body.appendChild(tooltip_el)

        this.active_tooltip=tooltip_el
    },
    tooltip_end(event){
        let tooltip_el=event.currentTarget.tooltip_element
        tooltip_el.visibility_timer=setTimeout((() => {
            this.tooltip_cancel(tooltip_el)
        }).bind(this), 1000);
    },
    tooltip_cancel(tooltip_el){
        clearTimeout(tooltip_el.visibility_timer)
        tooltip_el.visibility_timer=null

        tooltip_el.parentElement.removeChild(tooltip_el)

        this.active_tooltip=null
    },
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
                let init_func_name_list=element.getAttribute("p:init")
                if(init_func_name_list){
                    for(let init_func_name of init_func_name_list.split(",")){
                        if(init_func_name){
                            p[init_func_name]=p[init_func_name].bind(p)

                            let init_func=p[init_func_name]
                            init_func(element)
                        }
                    }
                }

                let tooltip_text=element.getAttribute("p:tooltip")
                if(tooltip_text){
                    element.addEventListener("mouseenter",this.tooltip_begin)
                    element.addEventListener("mouseleave",this.tooltip_end)
                }

                let init_vis_func_name_list=element.getAttribute("p:init-vis")
                if(init_vis_func_name_list){
                    for(let init_func_name of init_vis_func_name_list.split(",")){
                        if(init_func_name.length==0){
                            continue
                        }
                        
                        p[init_func_name]=p[init_func_name].bind(p)

                        p.observer_first_draw.observe(element);
                    }
                }

                for(let attribute of element.attributes){
                    if(attribute.name.startsWith("p:on-")){
                        let event_name_list=attribute.name.replace("p:on-","")
                        
                        let event_func_name_list=attribute.value.split(",")
                        
                        for(let event_name of event_name_list.split(",")){
                            for(let event_func_name of event_func_name_list){
                                if(event_func_name.length==0){
                                    continue
                                }

                                if(!p[event_func_name]){
                                    window.alert("event function not found: "+event_func_name)
                                    continue
                                }
                                p[event_func_name]=p[event_func_name].bind(p)

                                if(event_name=="resize"){
                                    if(false){
                                        p.oberserver_resize.observe(element)
                                    }else{
                                        window.addEventListener("resize",function(event){
                                            p[event_func_name](element)
                                        })
                                    }
                                    continue
                                }else if(event_name.startsWith("attrchange")){
                                    let attribute_list=event_name.replace("attrchange(","").replace(")","").split(",")
                                    let attribute_change_observer=new MutationObserver(function(mutationsList, observer){
                                        mutationsList.forEach(mutation=>{
                                            if(mutation.type==="attributes"){
                                                if(attribute_list.includes(mutation.attributeName)){
                                                    p[event_func_name](mutation.target)
                                                }
                                            }
                                        })
                                    })
                                    attribute_change_observer.observe(element,{attributes:true})
                                }

                                element.addEventListener(event_name,function(event){
                                    p[event_func_name](event)
                                })
                            }
                        }
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
            for(let element of subtree_with_input_tag){
                function get_num_decmial_digits(v){
                    let split_at_decimal_sep=v.toString().split(".")
                    if(split_at_decimal_sep.length==1){
                        return 0
                    }

                    return split_at_decimal_sep[split_at_decimal_sep.length-1]
                }

                let input_type=element.getAttribute("type")
                if(input_type=="number"){
                    function number_on_input(event){
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
                    }
                    element.addEventListener("input",number_on_input)

                    let wheel_adjust=element.getAttribute("wheel-adjust")
                    if(wheel_adjust==null || wheel_adjust==true || wheel_adjust=="true"){
                        function number_on_wheel(event){
                            event.preventDefault()

                            let event_target=event.currentTarget

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

                            // emit onchange event on same object
                            let on_change_event=new Event("change",{
                                bubbles:event.bubbles,
                                cancelable:event.cancelable,
                            })
                            event_target.dispatchEvent(on_change_event)
                        }
                        element.addEventListener("wheel", number_on_wheel, {passive: false})
                    }
                }
            }

            // save templates for later insertion
            for(let template of subtree.querySelectorAll("template")){
                // remove template from DOM
                template.parentElement.removeChild(template)

                // save for later use
                let template_name=template.getAttribute("name")
                this.templates[template_name]=template.content
            }
        }

        p.init_done=true
    },
    create_dropdown(element,value_list){
        while(element.firstChild){
            element.removeChild(element.firstChild)
        }

        let categories={}
        let uncategorized_values=[]

        // create list of values, grouped by category
        // create separate list for values without category
        for(let value of value_list){
            if(!value.category){
                uncategorized_values.push(value)
                continue
            }

            if(!categories[value.category]){
                categories[value.category]=[]
            }

            categories[value.category].push(value)
        }

        // put elements with category inside optgroups
        for(let category_name in categories){
            let category=categories[category_name]

            let optgroup=document.createElement("optgroup")
            optgroup.label=category_name
            element.appendChild(optgroup)

            for(let value of category){
                let option=document.createElement("option")
                option.value=value.handle
                option.innerText=value.name
                optgroup.appendChild(option)
            }
        }
        // put elements without category directly inside select
        for(let value of uncategorized_values){
            let option=document.createElement("option")
            option.value=value.handle
            option.innerText=value.name
            element.appendChild(option)
        }
    }
}
document.addEventListener("DOMContentLoaded",function(){
    for(let key in p){
        if(typeof p[key] === 'function'){
            p[key]=p[key].bind(p)
        }
    }
    p.init()
})