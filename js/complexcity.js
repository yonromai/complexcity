// Plot contains the plot request of the user
// NOTE: time unit is second and distance unit is meter

define([
	"/js/lib/modestmaps.js",
    "js/confighelpers.js",
    "/js/nodes.js",
    "/js/spotlight.js",
    "/js/modestmaps.markers.js"
	], function() {
    

function runPlot(plot, conf){
	//Run graph calculus
	$.getJSON(plot.graph, function(data) {
	  	computeGraph(data, plot, conf);
	});
}

function computeGraph(graph, plot, conf) {
	// TODO: set downloaded graph + graph precalculus
	var hospitals = getHospitals(graph);
	var graph = processEdges(graph, plot, conf);
	var graph = calcReachness(graph, hospitals);
	plotMap(graph, conf);
}

// return hospitals' index
function getHospitals(graph){
	var hospitals = {};
	for (i in graph.nodes) {
		var node = graph.nodes[i];
		if (node.type === "hospital"){
			//console.log(node.latitude + ';' + node.longitude)
			hospitals[i] = node;
		}
	}
	return hospitals;
}

function processEdges(graph, plot, conf){
	for (i in graph.adjacency){
		for(j in graph.adjacency[i]){
			for(k in graph.adjacency[i][j]){
				if (k != 'id') {
					edge = graph.adjacency[i][j][k]; // Edge between the nodes i and j, using the k-th transport mean
					if(plot.allowedMeans[edge.type]){
						if(edge.type === 'road')
							if(plot.allowedMeans['taxi']){
								edge.type = 'car';
							} else {
								edge.type = 'walk';
							}
						edge.timeCost = edge.weight * conf.speed[edge.type];
					} else {
						delete graph.adjacency[i][j][k];
					}
				}
			}
		}
	}
	return graph;
}

function eliminateDuplicates(arr) { // To suppr!
  var i,
      len=arr.length,
      out=[],
      obj={};
  for (i=0;i<len;i++) {
    obj[arr[i]]=0;
  }
  for (i in obj) {
    out.push(i);
  }
  return out;
}

function calcReachness(graph, hospitals){
	//effective dijkstra implementation... todo xD
	for (i in graph.nodes) {
		var node = graph.nodes[i];
		var servedBy = [];
        hospKey = [];
        for (var k in hospitals)hospKey.push(k);
		var nbHosp = Math.floor((Math.random()*hospKey.length));
		for (i = 0; i < nbHosp; i++){
			var k = Math.floor((Math.random()*hospKey.length));
			servedBy.push(hospKey[k]);
		}
		node.servedBy = eliminateDuplicates(servedBy);
		node.radius = Math.floor((Math.random()*20000));
	}
	return graph;
}


//FIXME: remove from global scope!
var map,
    markers,
    nodes,
    allNodes,
    selectedNodes,
    nodesServedBy = {};

function plotMap(graph, conf) {

	var locations = [];
    //Specify template provider
    map = new MM.Map("map", conf.mapProvider);
    map.setCenterZoom(conf.defaultStartLocation, conf.defaultStartZoom);


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

                markers = new MM.MarkerLayer();
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

runPlot(new Plot, new Conf); //Load new map with default settings

});