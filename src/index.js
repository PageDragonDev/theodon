import initRenderTarget from "./theodon.js";

let initTheodon = function(config = null,rt = null) {
    
    // BOOSTRAP RENDER TARGETS IF WE WERE NOT GIVEN ANY

    let renderTargets;
    if(!config) {
        
        renderTargets = document.querySelectorAll('[data-theodon]');
        if(renderTargets.length == 0) {
            return;
        }
        
        // INIT EACH RENDER TARGET
    
        renderTargets.forEach((rt)=>{
            initRenderTarget(rt);
        });
    } else {
        initRenderTarget(rt,config);
    }
    
};

// EXPORT INIT, BUT ALSO CALL IT TO PICKUP data-theodon ELEMENTS

export default  initTheodon;
initTheodon();

