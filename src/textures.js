import BABYLON from "babylonjs";
import uuidv1 from "uuid/v1";
import _ from "lodash";

let Textures = class {
    constructor(app) {
        this.app = app;
        this.getTexture = this.getTexture.bind(this);
       
    }
    
    getTexture(path) {
        
        return new Promise((resolve, reject) => {
            
            // CREATE TEXTURE
            
            let texture;
            texture = new BABYLON.Texture(path,this.app.scene,false,true,BABYLON.Texture.NEAREST_SAMPLINGMODE,()=>{
                resolve(texture);
            });
        });
    }
    
    dispose() {
        
    }
};
export default Textures;