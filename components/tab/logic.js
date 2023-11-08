function initialize_tab_container(container_element){
    let tab_bar_element=document.createElement('div')
    tab_bar_element.classList.add("tab-header-container")
    
    element.valid_tab_children=[]
    for(tab_body of element.children){
        if(['STYLE','SCRIPT','NOSCRIPT','TEMPLATE'].indexOf(tab_body.nodeName.toUpperCase())!==-1){
            continue
        }
        element.valid_tab_children.push(tab_body)

        let tab_header=document.createElement('div')
        tab_header.innerText=tab_body.getAttribute('tab-name')
        tab_header.classList.add('tab-header')
        tab_header.target_tab_body=tab_body
        tab_header.addEventListener("click",function(event){
            let tab_header=event.target
            let tab_container=tab_header.parentNode.parentNode

            // make previous tab invisible
            tab_container.active_tab_body.classList.add('inactive')
            // make new active tab visible
            tab_header.target_tab_body.classList.remove('inactive')

            // remove selected class from previous tab
            tab_container.active_tab_header.classList.remove('selected')
            // add selected class to new tab
            tab_header.classList.add('selected')

            tab_container.active_tab_header=tab_header
            tab_container.active_tab_body=tab_header.target_tab_body
        })

        tab_bar_element.appendChild(tab_header)

        tab_body.classList.add('inactive')
    }

    element.prepend(tab_bar_element)

    element.active_tab_header=tab_bar_element.children[0]
    element.active_tab_header.classList.add('selected')

    element.active_tab_body=element.valid_tab_children[0]
    element.active_tab_body.classList.remove('inactive')
}
for(element of document.getElementsByClassName('tab-container')){
    initialize_tab_container(element)
}