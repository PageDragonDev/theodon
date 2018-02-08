let theodon = require("./theodon.js");

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
            theodon.initRenderTarget(rt);
        });
    } else {
        theodon.initRenderTarget(rt,config);
    }
    
};

// EXPORT INIT, BUT ALSO CALL IT TO PICKUP data-theodon ELEMENTS

exports.initTheodon = initTheodon;
initTheodon();

