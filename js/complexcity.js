

    var 
    worker = new Worker('/js/worker.js');
    
    function showMap(){
        $('#container').addClass('mapmode');
        $("#map").removeClass("hide");
        $("#graph_loading").addClass("hide");
    }

    function hideMap(){
        $("#map").addClass("hide");
        $('#container').removeClass('mapmode');
        $("#graph_loading").removeClass("hide");
    }

    function runPlot(){
	//Run graph calculus
    $('#dowloadImg').removeAttr('src');
    $('#preprocessingImg').removeAttr('src');
    $('#processingImg').removeAttr('src');
   $('#renderingImg').removeAttr('src');
    hideMap();

    $('#dowloadImg').attr('src',"/img/load.gif");

    $.getJSON(plot.graph, function(data) {
        onGraphDownloaded(data);
    });
}

worker.onmessage = function(e){
    if(e.data.message === 'console'){
        console.log(e.data.data);
    }
    if(e.data.message === 'preprocessed'){
        var graph = e.data.data;        
        onPreprocessed(graph);
    }
    if(e.data.message === 'processed'){
        var graph = e.data.data[0];
        servedBy = e.data.data[1];
        hospitals = e.data.data[2];

        nodes = graph.nodes;
        onProcessed(graph);
    }
}

function onGraphDownloaded(graph) {
    $('#dowloadImg').attr('src',"/img/icon-done.png");
    $('#preprocessingImg').attr('src',"/img/load.gif");

    worker.postMessage({
        message: 'preprocess',
        data: [graph, plot, conf.speed]
    })
}

function onPreprocessed(graph){
    $('#preprocessingImg').attr('src',"/img/icon-done.png");
    $('#processingImg').attr('src',"/img/load.gif");

    worker.postMessage({
        message: 'process',
        data: [graph, plot.timelimit]
    })
}

function onProcessed(){
   $('#processingImg').attr('src',"/img/icon-done.png");
   $('#renderingImg').attr('src',"/img/load.gif");

   setTimeout(function(){plotMap()}, 100);
}

function onMapRendered(){
    $('#renderingImg').attr('src',"/img/icon-done.png");
    setTimeout(function(){showMap()}, 500);
}


//FIXME: remove from global scope!
var 
allNodes,
currentSelection,
//nodeSelection1,//there are 2 selections in case we go directly from one hospital to another (to ensure transition stat)
//nodeSelection2,
//hospitalAreas;
map,
markers;

// Holds data
var nodes,
servedBy,
hospitals;

function plotMap() {

	var locations = [];
    //Specify template provider
    showMap();
    map = new MM.Map("map", conf.mapProvider);
    map.setCenterZoom(new MM.Location(conf.startLatitude,conf.startLongitude), conf.startZoom);

    map.meter2pixel = function(meters){
        var sf = new MM.Location(37.774944,-122.419359);
        var mv = new MM.Location(37.386023,-122.08386);
        var pixels = meters * ( MM.Point.distance( this.locationPoint(sf), this.locationPoint(mv)) / MM.Location.distance(sf,mv));
        return pixels;
    };

    allNodes = new NodeLayer(false);
    map.addLayer(allNodes);

    nodeSelection1 = new NodeLayer(false);
    map.addLayer(nodeSelection1);

    nodeSelection2 = new NodeLayer(false);
    map.addLayer(nodeSelection2);

    markers = new MarkerLayer();
    map.addLayer(markers);

    //Addind map areas (red circles)
    notServed = 0;
    for (i in nodes) {
        var node = nodes[i];
        var maxTime = 0;
        for(hosp in servedBy[i]){
            if(maxTime < servedBy[i][hosp])
               maxTime = servedBy[i][hosp] ;
        }
        if(maxTime > 0){
            var speed =(plot.allowedMeans.taxi ? conf.speed.car : conf.speed.walk);
            var radius = conf.speed.walk * maxTime; 
            node.radius = radius;
            allNodes.addNode(node);
        } else {
            notServed ++;
        }
    }

    console.log((100 * (nodes.length -  notServed) / nodes.length).toFixed(2) + " % node served.");

    // Adding hospitals
    for(h in hospitals){
        node = nodes[h];
        var marker = document.createElement("div");
        marker.setAttribute("class", "hospital");
        marker.id = h;

        markers.addMarker(marker, new MM.Location(node.latitude,node.longitude));

        locations.push(marker.location);
        var img = marker.appendChild(document.createElement("img"));
        var path = "/img/Red-Cross.png";
        img.setAttribute("src", path);        

        MM.addEvent(marker, "mouseover", onMarkerOver);
        MM.addEvent(marker, "mouseout", onMarkerOut);
    }

    //preprocessing hostpitals areas
    // hospitalAreas = {}
    // for(h in hospitals){
    //     hospitalAreas[h] = new NodeLayer(false);
    //     hospitalAreas[h].parent.className = "inactive";
    //     map.addLayer(hospitalAreas[h]);
    //     for (v in hospitals[h]){
    //             node = nodes[v];
    //             var radius = conf.speed.walk * hospitals[h][v]; 
    //             node.radius = radius;
    //             hospitalAreas[h].addNode(node);
    //         }
    // }
    // currentSelection = allNodes;

	// tell the map to fit all of the locations in the available space
    map.setExtent(locations);
    onMapRendered();
}

function getMarker(target) {
    var marker = target;
    while (marker && marker.className != "hospital") {
        marker = marker.parentNode;
    }
    return marker;
}

function onMarkerOver(e) {
    var marker = getMarker(e.target);
    if (marker) {
        node = nodes[marker.id];
        if(node.type === 'hospital'){
            console.log("Over hospital " + marker.id);

            var selection;
            if(nodeSelection1.isEmpty()){
                selection = nodeSelection1;
            } else {
                nodeSelection1.parent.className = "inactive";
                selection = nodeSelection2;
                nodeSelection1.removeAllNodes();
            }

            for (v in hospitals[marker.id]){
                node = nodes[v];
                var radius = conf.speed.walk * hospitals[marker.id][v]; 
                node.radius = radius;
                selection.addNode(node);
            }
        }
        allNodes.parent.className = "inactive";
        selection.parent.className = "active";
    }  
}

// function onMarkerOver(e) {
//     var marker = getMarker(e.target);
//     if (marker) {
//         node = nodes[marker.id];
//         if(node.type === 'hospital'){
//             console.log("Over hospital " + marker.id);
//             currentSelection.parent.className = "inactive";
//             currentSelection = hospitalAreas[marker.id];
//             currentSelection.parent.className = "active";
//         }
//     }  
// }

// function onMarkerOut(e) {
//     currentSelection.parent.className = "inactive";
//     currentSelection = allNodes;
//     currentSelection.parent.className = "active";
// }

function onMarkerOut(e) {
    nodeSelection1.parent.className = "inactive";
    nodeSelection1.removeAllNodes();
    nodeSelection2.parent.className = "inactive";
    nodeSelection2.removeAllNodes();
    allNodes.parent.className = "active";

}


//Glob var for the whole page :s
function runDefaultPlot(){
    plot = new Plot();
    conf = new Conf();
    runPlot();
}

runDefaultPlot(); //Load new map with default settings