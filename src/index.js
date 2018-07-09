import initRenderTarget from "./theodon.js";

let initTheodon = function(config = null, rt = null, nocache = true) {
    if (!config) {
        console.error("Theodon config required.")
        return;
    }

    if (!rt) {
        console.error("Theodon render target required.")
        return;
    }

    // BOOSTRAP RENDER TARGETS IF WE WERE NOT GIVEN ANY

    return initRenderTarget(rt, config, nocache);

};

// EXPORT INIT, BUT ALSO CALL IT TO PICKUP data-theodon ELEMENTS

export default  initTheodon;
