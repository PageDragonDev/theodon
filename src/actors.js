import BABYLON from "babylonjs";
import TWEEN from "tween.js";
import Actor from "./actors/actor.js";
import Grid from "./actors/grid.js";

let Actors = class {
    constructor(app) {
        this.app = app;
        this.actors = [];
        this.actorsById = {};
        this.waitOn = {};
        this.whenLoaded = {};
        this.done = this.done.bind(this);
        this.doWhenLoaded = this.doWhenLoaded.bind(this);
        
        let _this = this;
        
        // WATCH ACTORS
        
        _this.app.store.watchActors((actorDef)=>{
            let actor = _this.addDef(actorDef);
            
            let waitOn = _this.waitOn[actorDef._id];
            if(waitOn) {
                actor.updatePlacement(waitOn);
                delete _this.waitOn[actorDef._id];
            }
            
            let doWhen = _this.whenLoaded[actorDef._id];
            if(doWhen) {
                doWhen(actor);
                delete _this.whenLoaded[actorDef._id];
            }
            
        },(actorDef)=>{
            let actor = _this.addDef(actorDef);
            actor.destroy();
            this.actors = this.actors.filter(a=>a.id != actorDef._id);
            delete this.actorsById[actorDef._id];
        });    

        // WATCH PLACEMENTS
        
        this.app.store.watchPlacements((placement)=>{
            let actor = this.actorsById[placement._id];
            if(actor) {
                actor.updatePlacement(placement);
            } else {
                // WAIT ON ACTOR
                this.waitOn[placement._id] = placement;
            }
        });
        
        // WATCH WAYPOINTS
        
        this.app.store.watchWaypoints((waypoint)=>{
            
            // IGNORE STALE WAYPOINTS
            
            if(waypoint.time) {
                let now = new Date().getTime();
                let then = waypoint.time.getTime();
                
                if(now - then > 5000) {
                    return;
                }
            }
            
            // UPDATE ACTOR
            
            let actor = this.actorsById[waypoint.aid];
            if(actor) {
                actor.updateWaypoint(waypoint);
            } 
        });
        
    }
    
    // SEND EVENT
        
    send(eventName,eventData) {
        console.log("SEND",eventData)
        let honored = 0;
        if(eventData.targetActor) { // THIS SHOULD BE TARGET, NOT TARGET ACTOR
            let res = eventData.target.trigger(eventName,eventData);
            if(res) {honored++;}
        } else {
            this.actors.forEach(actor=>{
                let res = actor.trigger(eventName,eventData);
                if(res) {honored++;}
            });
        }
        
        console.info("EVENT",eventName,"HONORED",honored,honored==1?"TIME":"TIMES");
        
    }
    
    // ADD
    
    add(actor) {
        let existing = this.actorsById[actor._id];
        if(!existing) {
            this.actors.push(actor);
            this.actorsById[actor._id] = actor;
            return actor;
        } else {
            existing.clone(actor);
            return existing;
        }
    }
    
    // ADD ACTOR TO ACTOR LIST USING A JSON DEF
    
    addDef(def) {
        let existing = this.actorsById[def._id];
        if(existing) {
            // INIT IN PLACE
            
            existing.init(def);
            return existing;

        } else {
            let actor;
            switch(def.type) {
                case('grid'):
                    actor = new Grid(this.app,def);
                    break;
                default:
                    actor = new Actor(this.app,def);
            }
            this.actors.push(actor);
            this.actorsById[actor._id] = actor;
            return actor;
        }
    }
    
    done() { // TODO: Use Generator
        this.actors.forEach(a=>a.done());
    }
    
    doWhenLoaded(aid,fn) {
        let actor = this.actorsById[aid];
        if(actor) {
            fn(actor);
        } else {
            this.whenLoaded[aid] = fn;
        }
    }
    
};
exports.Actors = Actors;
