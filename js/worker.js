
onmessage = function(e){

  //log(e.data.message);

  if(e.data.message === 'preprocess'){
    var graph = e.data.data[0];
    var plot = e.data.data[1];
    var speed = e.data.data[2];

    var hospitals = getHospitals(graph);
    var graph = processEdges(graph, plot, speed);
    post('preprocessed',[graph, hospitals]);
  }

  if(e.data.message === 'process'){
    var graph = e.data.data[0];
    var hospitals = e.data.data[1];

    var graph = calcReachness(graph, hospitals);
    post('processed', graph);
  }
}

post = function(msg, data){
  postMessage({
    message: msg,
    data: data,
  });
}

log = function(str){
  post('console','Worker - console: ' + str);
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

function processEdges(graph, plot, speed){
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
            edge.timeCost = edge.weight * speed[edge.type];
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


