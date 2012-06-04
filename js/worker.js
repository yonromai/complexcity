  

onmessage = function(e){
  if(e.data.message === 'preprocess'){
    var graph = e.data.data[0];
    var plot = e.data.data[1];
    var speed = e.data.data[2];

    var graph = processEdges(graph, plot, speed);
    post('preprocessed', graph);
  }

  if(e.data.message === 'process'){
    var graph = e.data.data[0];
    var timelimit = e.data.data[1];
    loadClosure();
    var hospitals = getHospitals(graph);
    var adjGraph = adjacencyList(graph);
    var servedBy = calcReachness(adjGraph,hospitals, timelimit);
    hospitals = reverseIndex(servedBy);
    post('processed', [graph, servedBy, hospitals]);
  }
}

function loadClosure(){
  // Ugly ugly => closure is not intent to be used this way... :|
  // Hack to bypass the goog.require(..) to make closure work with workers
  // that have fairly limited access to common APIs...
  try{
  importScripts(
    '/js/lib/closure/base.js',
    '/js/lib/closure/error.js',
    '/js/lib/closure/string.js',
    '/js/lib/closure/asserts.js',
    '/js/lib/closure/array.js',
    '/js/lib/closure/object.js',
    '/js/lib/closure/structs.js',
    '/js/lib/closure/node.js',
    '/js/lib/closure/heap.js',
    '/js/lib/closure/priorityqueue.js');
    } catch(e){}
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

function processEdges(graph, plot, speed){
  for (i in graph.adjacency){
    for(j in graph.adjacency[i]){
      for(k in graph.adjacency[i][j]){
        if (k != 'id') {
          // Edge between the nodes i and j, using the k-th transport mean
          edge = graph.adjacency[i][j][k]; 
          if(plot.allowedMeans[edge.type]){
            if(edge.type === 'road')
              if(plot.allowedMeans['taxi']){
                edge.type = 'car';
              } else {
                edge.type = 'walk';
              }
            edge.timeCost = edge.weight / speed[edge.type];
          } else {
            delete graph.adjacency[i][j][k];
          }
        }
      }
    }
  }
  return graph;
}

// Transform the graph from its json format (cf: http://1.usa.gov/K2NbM4)
// to an adjacency list (=> array of dict: each dict represents the 
// adjacency of a particular vertex: Each dict contains each adjacent node as
// keys and the (min) edge weight as values.
function adjacencyList(graph){
  //Let's get a renaming map
  var namemap = {}
  var nodeCount = 0;
  for(i in graph.nodes){
    var node = graph.nodes[i];
    namemap[node.id] = i;
    nodeCount++;
  }   
  // Process the adjacency list
  var adjacencyList = new Array(nodeCount);
  for (i in graph.adjacency){
    adjacencyList[i] = {};
    for(j in graph.adjacency[i]){
      minEdge = null;
      v = null;
      //Let's pick up the best edge
      for(k in graph.adjacency[i][j]){
        if (k === 'id'){
          var v = namemap[
          parseInt(graph.adjacency[i][j][k])
          ];
        } else {
          var edge = graph.adjacency[i][j][k];
          if (!minEdge || minEdge > edge.timeCost){
            var minEdge = edge.timeCost;
          }
        }
      }
      if (minEdge && v && v != i){
        //add edge
        adjacencyList[i][v] = minEdge;
      }
    }
  }
  return adjacencyList;
}

//Source: http://en.wikipedia.org/wiki/Dijkstra%27s_algorithm#Pseudocode
//Takes an adjacency list as input
function dijkstra(graph, source){
  var queue = new goog.structs.PriorityQueue();
  var dist = new Array(graph.length);
  var previous = new Array(graph.length);
  for (var v = 0 ; v < graph.length; v++){
    if(v != source)
      dist[v] = Number.MAX_VALUE;
    else
      dist[v] = 0;
    queue.enqueue(dist[v],v);
    previous[v] = null;
  }
  while(!queue.isEmpty()){
    var u = queue.dequeue();
    if (dist[u] === Number.MAX_VALUE)
      break;
    for(v in graph[u]){ //Neighbor traversal
      alt = dist[u] + graph[u][v];
      if(alt < dist[v]){
        dist[v] = alt;
        previous[v] = u;
        queue.enqueue(dist[v],v);
      }
    }
  }
  return dist;
}

function getHospitals(graph){ // To suppr!
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

function calcReachness(graph, hospitals, timelimit){
  var servedBy = new Array(graph.length);
  for (var v = 0 ; v < graph.length; v++){
    servedBy[v] = {};
  }
  for (h in hospitals){
    var dist = dijkstra(graph,h);
    for(var i = 0; i < dist.length; i++){
      if(dist[i] <= timelimit){
        var remaining = timelimit - dist[i];
        servedBy[i][h] = remaining;
      }
    }
  }
  return servedBy;
}


// list is list a key-valud pair. This function outputs a key-(key-value) pair.
function reverseIndex(list){
  var reversed = {};
  for(v in list){
    for(h in list[v]){
      if(!reversed[h])
        reversed[h] = {}
      reversed[h][v] = list[v][h];
    }
  }
  return reversed;
}




