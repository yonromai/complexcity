/**
 * A Node object instance draws "punched out" circles on a canvas. The
 * first argument should be an HTML Canvas instance. The second is an optional
 * canvas fillStyle (presumably, any CSS color string, e.g. "rgba(0,0,0,.5)"
 * for 50% transparent black).
 */
var Node = function(fog, canvas, fillStyle) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.clear();
    if (fillStyle) {
        this.fillStyle = fillStyle;
    }
    this.fog = fog || false;
};

Node.prototype = {
    fillStyle: "rgba(255,0,0,.5)",
    radius: function(){ return 40},

    // clearing resets the canvas and fills it with the fillStyle
    clear: function() {
        this.canvas.width = this.canvas.width;
        this.ctx.globalCompositeOperation = "source-over";
        this.fill();
    },

    // fill the canvas with the color defined by fillStyle
    fill: function() {
        if(this.fog){
            this.ctx.fillStyle = this.fillStyle;
            this.ctx.beginPath();
            this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fill();
        }
    },

    /**
     * Draw an array of points ({x, y}) as white circles. Each circle may
     * define its own radius, or we fall back on the value radius argument.
     */
    drawPoints: function(points) {
        this.ctx.fillStyle = this.fillStyle; // red
        var TWO_PI = Math.PI * 2,
            radius = this.radius();
        /*
         * NOTE: we have to draw each circle as a distinct path because
         * otherwise their endpoints are connected as though each arc is a
         * subpath.
         */
         this.ctx.beginPath();
        for (var i = 0; i < points.length; i++) {
            var p = points[i],
                r = ("radius" in p)
                    ? p.radius
                    : radius;
            //this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, r, 0, TWO_PI, true);
            //this.ctx.closePath();
            //this.ctx.fill();
        }
        this.ctx.closePath();
            this.ctx.fill();
    },

    /**
     * Draw an array of points ({x, y}) as circles "punched out" from the fill
     * color. This produces the "Node" effect.
     */
    punchout: function(points) {
        var time = +new Date();
        this.clear();

        //this.ctx.globalCompositeOperation = "destination-out";
        this.drawPoints(points);
        //console.log(points.length, "pts took", (new Date() - time), "ms");
    }
};

var NodeLayer = function(fog, canvas, fillStyle) {
    this.parent = canvas || document.createElement("canvas");
    this.parent.style.position = "absolute";

    this.Node = new Node(fog, this.parent, fillStyle);
    this.locations = [];
};

NodeLayer.prototype = {
    positioned: false,
    locations:  null,

    isEmpty: function(){
        return this.locations.length == 0;
    },

    addNode: function(node){
        loc = new MM.Location(node.latitude,node.longitude);
        loc.nodeId = node.id;
        loc.radius = node.radius;
        if (this.map) {
            loc.coord = this.map.locationCoordinate(loc);
        }
        this.locations.push(loc);
        this.draw();
    },

    removeNode: function(node){
        var len = this.locations.length,
            removed = false;
        for (var i = 0; i < len; i++) {
            if (this.locations[i].nodeId === node.id) {
                this.locations.splice(i, 1);
                removed = true;
                break;
            }
        }
        if (removed) {
            this.draw();
        }
    },

    addNodes: function(nodes){
        var len = nodes.length;
        for (var i = 0; i < len; i++) {
            loc = new MM.Location(node[i].latitude,node[i].longitude);
            loc.nodeId = nodes[i].id;
            loc.radius = nodes[i].radius;
            if (this.map)
                loc.coord = this.map.locationCoordinate(loc);
            this.locations.push(loc);
        }
        this.draw();
    },

    removeAllNodes: function(){
        this.locations = [];
        this.draw();
    },

    draw: function() {
        var map = this.map,
            canvas = this.parent;

        if (canvas.parentNode != map.parent) {
            map.parent.appendChild(canvas);
        }

        canvas.width = map.dimensions.x;
        canvas.height = map.dimensions.y;

        if (this.locations && this.locations.length) {
            var points = this.locations.map(function(loc) {
                var coord = loc.coord || (loc.coord = map.locationCoordinate(loc)),
                    point = map.coordinatePoint(coord);
                //if ("radius" in loc) 
                    point.radius = map.meter2pixel(loc.radius);
                return point;
            });
            this.Node.punchout(points);
        } else {
            this.Node.clear();
        }
    },

    // TODO: clear lagacy methods

    addLocation: function(node) {
        loc = new MM.Location(node.latitude,node.longitude);
        loc.radius = node.radius;
        if (this.map) {
            loc.coord = this.map.locationCoordinate(loc);
        }
        this.locations.push(loc);
        this.draw();
    },

    removeLocation: function(loc) {
        var len = this.locations.length,
            removed = false;
        for (var i = 0; i < len; i++) {
            if (this.locations[i] === loc) {
                this.locations.splice(i, 1);
                removed = true;
                break;
            }
        }
        if (removed) {
            this.draw();
        }
    },

    addLocations: function(locs) {
        var len = locs.length;
        if (this.map) {
            for (var i = 0; i < len; i++) {
                locs[i].coord = this.map.locationCoordinate(locs[i]);
            }
        }
        for (var i = 0; i < len; i++) {
            this.locations.push(locs[i]);
        }
        this.draw();
    },

    removeAllLocations: function() {
        this.locations = [];
        this.draw();
    }


};


