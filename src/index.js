let theodon = require("./theodon.js");

let initTheodon = function(ops = {}) {
    
    // BOOSTRAP RENDER TARGETS IF WE WERE NOT GIVEN ANY

    let renderTargets = ops.renderTargets;
    if(!renderTargets || renderTargets.length == 0) {
        
        renderTargets = document.querySelectorAll('[data-theodon]');
        if(renderTargets.length == 0) {
            return;
        }
    }
    
    // INIT EACH RENDER TARGET
    
    renderTargets.forEach((rt)=>{
        theodon.initRenderTarget(rt);
    });
};

// EXPORT INIT, BUT ALSO CALL IT TO PICKUP data-theodon ELEMENTS

exports.initTheodon = initTheodon;
initTheodon();

