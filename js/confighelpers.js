var Plot = function(){
  this.graph = '/data/shanghaiNetwork-150.json';
  this.allowedMeans = {
    road: true,
    bus: true,
    subway: true,
    taxi: false
  };
  this.timelimit = 15 * 60;
};
//TODO: implement unit conv prototypes

var Conf = function(){

  this.speed = {
    walk: 4 * 10/36.,
    car: 25 * 10/36.,
    bus: 20 * 10/36.,
    subway: 50 * 10/36.
  };
  this.mapProvider = new MM.TemplatedLayer("http://ecn.t{S}.tiles.virtualearth.net/tiles/r{Q}?g=689&mkt=en-us&lbl=l0&stl=m", [0,1,2,3,4,5,6,7]);
  this.defaultStartLocation = new MM.Location(31.217499, 121.478577);
  this.defaultStartZoom = 10;
};
//TODO: implement unit conv prototypes


