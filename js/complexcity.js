// Plot contains the plot request of the user
// NOTE: time unit is second and distance unit is meter

define([
	"/js/lib/modestmaps.js",
    "/js/modestmaps.markers.js",
    "js/confighelpers.js",
    "/js/nodes.js",
    "/js/spotlight.js"
	], function() {

var 
  worker = new Worker('/js/worker.js'),
  plot = new Plot(),
  conf = new Conf();


function showMap(){
    $('#container').addClass('mapmode');
    $("#map").removeClass("hide");
    $("#graph_loading").addClass("hide");
    map.setCenterZoom(conf.defaultStartLocation, conf.defaultStartZoom);
}

function hideMap(){
    $("#map").addClass("hide");
    $('#container').removeClass('mapmode');
    $("#graph_loading").removeClass("hide");
}

function runPlot(){
	//Run graph calculus
    hideMap();

    $('#dowloadImg').attr('src',"/img/load.gif");

	$.getJSON(plot.graph, function(data) {
	  	onGraphDownloaded(data);
	});
}

worker.onmessage = function(e){
    //console.log('Main: Received message: ' + e.data.message);
    if(e.data.message === 'console'){
        console.log(e.data.data);
    }
    if(e.data.message === 'preprocessed'){
        graph = e.data.data[0];
        hospitals = e.data.data[1];
        onPreprocessed(graph,hospitals);
    }
    if(e.data.message === 'processed'){
        graph = e.data.data;
        onProcessed(graph);
    }
}

function onGraphDownloaded(graph) {
	// TODO: set downloaded graph + graph precalculus
    $('#dowloadImg').attr('src',"/img/icon-done.png");
    $('#preprocessingImg').attr('src',"/img/load.gif");

    worker.postMessage({
        message: 'preprocess',
        data: [graph, plot, conf.speed]
    })
}

function onPreprocessed(graph, hospitals){
    $('#preprocessingImg').attr('src',"/img/icon-done.png");
    $('#processingImg').attr('src',"/img/load.gif");

    worker.postMessage({
        message: 'process',
        data: [graph, hospitals]
    })
}

function onProcessed(graph){
     $('#processingImg').attr('src',"/img/icon-done.png");
    $('#renderingImg').attr('src',"/img/load.gif");

    setTimeout(function(){plotMap(graph)}, 100);
}

function onMapRendered(){
    $('#renderingImg').attr('src',"/img/icon-done.png");
    setTimeout(function(){showMap()}, 500);
}

//FIXME: remove from global scope!
var map,
    markers,
    nodes,
    allNodes,
    selectedNodes,
    nodesServedBy = {};

function plotMap(graph) {

	var locations = [];
    //Specify template provider
    map = new MM.Map("map", conf.mapProvider);
    //map.setCenterZoom(conf.defaultStartLocation, conf.defaultStartZoom);


    map.meter2pixel = function(meters){
                    var sf = new MM.Location(37.774944,-122.419359);
                    var mv = new MM.Location(37.386023,-122.08386);
                    var pixels = meters * ( MM.Point.distance( this.locationPoint(sf), this.locationPoint(mv)) / MM.Location.distance(sf,mv));
                    return pixels;
                };

                allNodes = new NodeLayer(false);
                map.addLayer(allNodes);

                selectedNodes = new NodeLayer(false);
                map.addLayer(selectedNodes);

                var markers;
                try {  
                   markers = new MM.MarkerLayer();
                } catch (e) {
                    if (e instanceof TypeError){
                       setTimeout(function(){plotMap(graph)}, 500); // FIXME: bad bad bad... set retry policy
                       return;
                   }
                   throw e;
                }
                
                map.addLayer(markers);

                nodes = graph.nodes

    for (i in nodes) {
    	var node = nodes[i];

    	allNodes.addNode(node);

         if (node.type === 'hospital'){

            var marker = document.createElement("div");
            // listen for mouseover & mouseout events
            MM.addEvent(marker, "mouseover", onMarkerOver);
            MM.addEvent(marker, "mouseout", onMarkerOut);

            //marker.type = node.type;
            marker.nodeId = i;
            //marker.servedBy = node.servedBy;
            marker.setAttribute("class", "node");
            //marker.setAttribute("shape","circle"); 
            //marker.setAttribute("coords","0,0,100");


            markers.addMarker(marker, new MM.Location(node.latitude,node.longitude));

            locations.push(marker.location);
       
            var img = marker.appendChild(document.createElement("img"));
            img.setAttribute("src", "/img/cross.png");
            //marker.setAttribute("style","z-index:100;")

        }

        for (hospital in node.servedBy)
            if (hospital in nodesServedBy) {
                nodesServedBy[hospital].push(i);
            } else {
                nodesServedBy[hospital] = [i];
            }
	}

	// tell the map to fit all of the locations in the available space
    map.setExtent(locations);
    onMapRendered();
  }


function getMarker(target) {
    var marker = target;
    while (marker && marker.className != "node") {
        marker = marker.parentNode;
    }
    return marker;
}

function onMarkerOver(e) {
    var marker = getMarker(e.target);
    if (marker) {
        node = nodes[marker.nodeId];
        if(node.type === 'hospital' && marker.nodeId in nodesServedBy){
            console.log("Over hospital " + marker.nodeId);
            for (id in nodesServedBy[marker.nodeId])
                selectedNodes.addNode(nodes[id]);
        } else {
            console.log("Over node " + marker.nodeId);
            selectedNodes.addNode(node);
            for(id in node.servedBy)
                hospital = nodes[id];
                if(hospital)
                    selectedNodes.addNode(hospital);
        }
        selectedNodes.parent.className = "active";
        allNodes.parent.className = "inactive";
    } else {
        allNodes.parent.className = "active";
        selectedNodes.parent.className = "inactive";
    }   
}

function onMarkerOut(e) {
    allNodes.parent.className = "active";
    selectedNodes.removeAllNodes();
    selectedNodes.parent.className = "inactive";
}

runPlot(); //Load new map with default settings

});

