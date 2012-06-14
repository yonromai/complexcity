
//Mapping function for each tile provider
var providerMapper = (function(){
  dict = {};

  dict['Openstreetmap'] = new MM.TemplatedLayer('http://tile.openstreetmap.org/{Z}/{X}/{Y}.png');
  //dict['Placehold.it'] = new MM.TemplatedMapProvider("http://placehold.it/256/f0f/fff.png&text={Z}/{X}/{Y}");

  //dict['Bayarea'] = new MM.TemplatedLayer('http://osm-bayarea.s3.amazonaws.com/{Z}-r{Y}-c{X}.jpg');

  //TODO: Change Api Key
  dict['CloudMade'] = new MM.TemplatedLayer('http://{S}tile.cloudmade.com/1a914755a77758e49e19a26e799268b7/997/256/{Z}/{X}/{Y}.png', [ 'a.', 'b.', 'c.', '' ]);

  dict['Acetate-terrain'] = new MM.TemplatedLayer('http://acetate.geoiq.com/tiles/terrain/{Z}/{X}/{Y}.png');

  dict['Otile1.mqcdn.com'] = new MM.TemplatedLayer("http://otile1.mqcdn.com/tiles/1.0.0/osm/{Z}/{X}/{Y}.png");

  //dict['acetate-base'] = new MM.TemplatedLayer("http://acetate.geoiq.com/tiles/acetate-base/{Z}/{X}/{Y}.png");

  //dict['modestmaps.bluemarble'] = new MM.TemplatedLayer("http://s3.amazonaws.com/com.modestmaps.bluemarble/{Z}-r{Y}-c{X}.jpg");

  dict['Oatile1-naip'] = new MM.TemplatedLayer('http://oatile1.mqcdn.com/naip/{Z}/{X}/{Y}.jpg');

  //dict['acetate-fg'] = new MM.TemplatedLayer('http://acetate.geoiq.com/tiles/acetate-fg/{Z}/{X}/{Y}.png');

  dict['Spaceclaw'] = new MM.TemplatedLayer("http://spaceclaw.stamen.com/toner/{Z}/{X}/{Y}.png");

  //dict['bucket.root.cnet'] =  new MM.TileCacheMapProvider('http://bucket.root.cnet.stamen.com.s3.amazonaws.com/12_sig_avg_4/{Z}/{X}/{Y}.png');

   dict['Virtualearth'] = new MM.TemplatedLayer("http://ecn.t{S}.tiles.virtualearth.net/tiles/r{Q}?g=689&mkt=en-us&lbl=l0&stl=m", [0,1,2,3,4,5,6,7]);
  
  return dict;
})();

var Conf = function(){

  this.speed = {
    walk: 4 * 10/36.,
    car: 25 * 10/36.,
    bus: 20 * 10/36.,
    subway: 50 * 10/36.
  };
  this.mapProvider = 'Acetate-terrain';//providerMapper['Acetate-terrain'];
  this.startLatitude = 31.217499;
  this.startLongitude = 121.478577;
  this.startZoom = 9;
};
//TODO: implement unit conv prototypes

$('#settings').on('show', function () {
  $('#walkSpeed').attr("placeholder",conf.speed.walk.toFixed(2) );
  $('#carSpeed').attr("placeholder",conf.speed.car.toFixed(2) );
  $('#busSpeed').attr("placeholder",conf.speed.bus.toFixed(2) );
  $('#subwaySpeed').attr("placeholder",conf.speed.subway.toFixed(2) );
  $('#lat').attr("placeholder",conf.startLatitude);
  $('#long').attr("placeholder",conf.startLongitude);
  $('#zoom').attr("placeholder",conf.startZoom);
});

function onSaveSettings(){
  var walkSpeed =  parseFloat($('#walkSpeed')[0].value);
  var carSpeed = parseFloat($('#carSpeed')[0].value);
  var busSpeed = parseFloat($('#busSpeed')[0].value);
  var subwaySpeed = parseFloat($('#subwaySpeed')[0].value);
  var lat = parseFloat($('#lat')[0].value);
  var long = parseFloat($('#long')[0].value);
  var zoom = parseInt($('#zoom')[0].value, 10);
  var provider = $('#provider')[0].value;
  var conf = getConf();
  if(walkSpeed){
    conf.speed.walk = walkSpeed;
  }
  if(carSpeed){
    conf.speed.car = carSpeed;
  }
  if(busSpeed){
    conf.speed.bus = busSpeed;
  }
  if(subwaySpeed){
    conf.speed.subway = subwaySpeed;
  }
  if(lat){
    conf.startLatitude = lat;
  }
  if(long){
    conf.startLongitude = long;
  }
  //TODO: check zoom problem
  if(zoom){
    conf.startZoom = zoom;
  }
  if(provider){
    conf.mapProvider = provider;
  }
  setConf(conf);
  $('#settings').modal('hide');
}

var jsonGraphMapper = (function(){
  var dict = {};
  dict['150'] = '/data/shanghaiNetwork-150.json';
  dict['500'] = '/data/shanghaiNetwork-500.json';
  dict['1000'] = '/data/shanghaiNetwork-1000.json';
  dict['1500'] = '/data/shanghaiNetwork-1500.json';
  dict['2000'] = '/data/shanghaiNetwork-2000.json';
  dict['2500'] = '/data/shanghaiNetwork-2500.json';
  return dict;
})();

// Plot contains the plot request of the user
// NOTE: time unit is second and distance unit is meter
var Plot = function(){
  this.nodecount = '500';
  this.graph = jsonGraphMapper[this.nodecount];
  this.allowedMeans = {
    walk: true,
    bus: true,
    subway: true,
    taxi: false
  };
  this.timelimit = 30 * 60;
};
//TODO: implement unit conv prototypes

$('#newplot').on('show', function () {
  var checked = 'yes';
  if(plot.allowedMeans.walk)
    $('#walk').attr("checked",checked);

  if(plot.allowedMeans.bus)
    $('#bus').attr("checked",checked);

  if(plot.allowedMeans.subway)
    $('#subway').attr("checked",checked);

  if(plot.allowedMeans.taxi)
    $('#taxi').attr("checked",checked);
  
  $('#timelimit').attr("placeholder",plot.timelimit.toFixed(2));

  $('.nodecountOpt').removeAttr('selected');
  $('#'+plot.nodecount+'Opt').attr("selected","selected");

});

function onNewPlotRun(){
  var walk = $('#walk')[0].checked;
  var bus = $('#bus')[0].checked;
  var subway = $('#subway')[0].checked;
  var taxi = $('#taxi')[0].checked;

  var timelimit =  parseFloat($('#timelimit')[0].value);

  var nodecount = $('#nodecount')[0].value;

  plot.allowedMeans.walk = walk;
  plot.allowedMeans.bus = bus;
  plot.allowedMeans.subway = subway;
  plot.allowedMeans.taxi = taxi;

  if(timelimit){
    plot.timelimit = timelimit;
  }
  if(nodecount){
    plot.nodecount = nodecount;
    plot.graph = jsonGraphMapper[nodecount];
  }

  $('#newplot').modal('hide');
  runPlot();
}

var getConf = function(){
  conf = JSON.parse(sessionStorage.getItem('Conf'));
  if(!conf){
    conf = new Conf();
    setConf(conf);
  } else {
    console.log('Retreived Conf');
  }
  //conf.mapProvider = providerMapper[conf.mapProvider];
  return conf;
}

var setConf = function(conf){
  sessionStorage.setItem('Conf', JSON.stringify(conf));
}