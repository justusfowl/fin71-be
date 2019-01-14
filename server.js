var fs          = require('fs');
const cors      = require('cors');
var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');

var config      = require('./app/config/config');
var routes      = require('./app/v01/routes/index.route');

var http        = require('http');
var https       = require('https'); 


config.baseDir = __dirname;
config.publicDir = __dirname + "/public";

global.config = config;

var server; 

if (config.env == "development"){

  var options = {
    key: fs.readFileSync(config.https.key),
    cert: fs.readFileSync(config.https.crt),
    ca: fs.readFileSync(config.https.ca)
    };

  server = https.createServer(options, app);

  // Redirect from http port 80 to https
  
  http.createServer(function (req, res) {
      res.writeHead(301, { "Location": "https://" + req.headers['host'] + ":" + config.port + req.url });
      res.end();
  }).listen(80);

}else{
  server = http.createServer(app);
}

app.use(bodyParser.urlencoded({ extended: true, limit: '200mb' }));
app.use(bodyParser.json( {limit: '50mb', extended: true}));

app.use(cors());

if (config.env != "prod"){
  app.use('/data', express.static('public'));
}


// REGISTER OUR ROUTES
// =============================================================================
// all of our routes will be prefixed with /api

app.use('/api/v' + config.APIVersion, routes);



//app.use(subdomain('api', routes)); //using the same router


// START THE SERVER
// =============================================================================
server.listen(config.port);

console.log('Fin71 application running on port: ' + config.port);


config.logger.info("Fin71 started")
