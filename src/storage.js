import uploadcare from 'uploadcare-widget';
import _ from "lodash";

let Store = class {

    constructor(target, instanceId, theodonApp, config) {
        this.theodonApp = theodonApp;
        this.instanceId = instanceId;
        this.config = {
            apiKey: target.dataset["apikey"],
            authDomain: target.dataset["authdomain"],
            databaseURL: target.dataset["databaseurl"],
            projectId: target.dataset["projectid"],
            storageBucket: target.dataset["storagebucket"],
            messagingSenderId: target.dataset["messagingsenderid"],
            worldId: target.dataset["world"],
            sceneId: target.dataset["scene"]
        };

        if(config) {
            this.config = config;
        }

        this.worldId = this.config.worldId;
        this.sceneId = this.config.sceneId;
        this._user = config.user;
        this._admin = config.admin?config.admin:false;
        this.fetchFileDialog = this.fetchFileDialog.bind(this);
        this.getImageData = this.getImageData.bind(this);

    }

    // LOAD WORLD SCRIPTS

    watchWorldScripts(onChange, onRemove) {

        if (this.config.watchWorldScripts) {
            this.config.watchWorldScripts(onChange, onRemove);
        } else {
            console.warn("No world script watcher function set at config.watchWorldScripts");
        }

    }

    // ADD/SAVE WORLD SCRIPT

    saveWorldScript(path, code, sid) {

        if (this.config.saveWorldScript) {
            return this.config.saveWorldScript(path, code, sid);
        } else {
            console.warn("No save world script function set at config.saveWorldScript");
        }

    }

    // REMOVE SCRIPT

    removeWorldScript(script) {

        if (this.config.removeWorldScript) {
            this.config.removeWorldScript(script);
        } else {
            console.warn("No remove world script function set at config.removeWorldScript");
        }
    }

    // GETTER FOR USER PROFILE

    get user() {
        return this._user;
    }

    get admin() {
        return this._admin;
    }

    saveActor(aid, instance) {

        if (this.config.saveActor) {
            this.config.saveActor(aid, instance);
        } else {
            console.warn("No save actor function set at config.saveActor");
        }

    }

    removeActor(actor) {

        if (this.config.removeActor) {
            this.config.removeActor(actor);
        } else {
            console.warn("No remove actor function set at config.removeActor");
        }
    }

    // SAVE A FIXED PLACEMENT

    savePlacement(actor, placement) {

        if (this.config.savePlacement) {
            this.config.savePlacement(actor, placement);
        } else {
            console.warn("No save placement function set at config.savePlacement");
        }
    }

    // SAVE A WAYPOINT

    saveWaypoint(actor, waypoint) {

        if (this.config.saveWaypoint) {
            this.config.saveWaypoint(actor, waypoint);
        } else {
            console.warn("No save waypoint function set at config.saveWaypoint");
        }
    }

    // WATCH ACTORS

    watchActors(onChange, onRemove) {

        if (this.config.watchActors) {
            this.config.watchActors(onChange, onRemove);
        } else {
            console.warn("No watch actors function set at config.watchActors");
        }

    }

    // WATCH PLACEMENTS

    watchPlacements(onChange) {

        if (this.config.watchPlacements) {
            this.config.watchPlacements(onChange);
        } else {
            console.warn("No watch placements function set at config.watchPlacements");
        }
    }

    // WATCH WAYPOINT

    watchWaypoints(onChange) {

        if (this.config.watchWaypoints) {
            this.config.watchWaypoints(onChange);
        } else {
            console.warn("No watch waypoints function set at config.watchWaypoints");
        }
    }

    clearWaypoints(actor, time) {

        if (this.config.clearWaypoints) {
            this.config.clearWaypoints(actor, time);
        } else {
            console.warn("No clear waypoints function set at config.clearWaypoints");
        }
    }

    getImageData(url) {

        return new Promise((resolve, reject) => {
            let img = new Image(); /*global Image*/

            img.onload = function() {
                let canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;

                // Copy the image contents to the canvas
                let ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);

                let dataURL = canvas.toDataURL("image/jpeg");

                resolve(dataURL);
            };
            img.onerror = function() {
                reject(new Error("There was an error fetching " + url));
            };
            img.setAttribute('crossOrigin', 'anonymous');
            img.src = url;
        });
    }

    fetchFileDialog(folder="images") {

        return new Promise((resolve, reject) => {

            // CREATE ELEMENT

            let element = document.createElement("input");
            element.setAttribute("id", "uploadcare");
            element.setAttribute("style", "display:none");
            document.body.appendChild(element);

            // CREATE WIDGET

            let widget = uploadcare.Widget('#uploadcare');

            // SHOW DIALOG

            widget.openDialog();
            widget.onUploadComplete((file) => {
                element.remove();

                // TURN URL INTO IMAGE DATA

                this.getImageData(file.cdnUrl).then(data => {
                    // STORE IMAGE

                    let imagePath = folder + '/' + file.name;

                    let ref = this.app.storage().ref();
                    let imageRef = ref.child(imagePath);
                    imageRef.putString(data, 'data_url').then(result => {
                        let fullPath = result.metadata.downloadURLs[0];
                        resolve(fullPath);
                    });

                });


            });

        });
    }
};

export default Store;
