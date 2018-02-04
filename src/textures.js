import BABYLON from "babylonjs";
import uuidv1 from "uuid/v1";

let Textures = class {
    constructor(app) {
        this.app = app;
        this.texturesById = {};
        this.getTexture = this.getTexture.bind(this);
       
    }
    
    getTexture(path) {
        
        return new Promise((resolve, reject) => {
            // DO WE ALREADY HAVE THIS TEXTURE?
            
            let texture = this.texturesById[path];
            
            if(texture) {
                resolve(texture);
                return; 
            }
            
            // CREATE TEXTURE
            
            texture = new BABYLON.Texture(path,this.app.scene,false,true,BABYLON.Texture.NEAREST_SAMPLINGMODE,()=>{
                resolve(texture);
            });
            this.texturesById[path] = texture;
            
        });
    }
};
export default Textures;