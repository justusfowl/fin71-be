var jwt = require('express-jwt');
var jwks = require('jwks-rsa');
const config = require('../../config/config');

var verifyToken; 


if (config.env == 'production'){

  verifyToken = jwt({
    secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: config.auth.jwksUri
    }),
    aud: config.auth.auth0_audience,
    iss: config.auth.iss,
    algorithms: ['RS256']
  });

}else{
  // ONLY FOR DEV PURPOSES 

  verifyToken = function (req, res, next) {
    req["user"] = {};
    req.user["https://app.fin71.de/fin71_id"] = "a88dff2fc6698f332c8bff88c0e806d4";
    next(); 

  }
  
}


var errorAuth = function (err, req, res, next){

    if(err.name === 'UnauthorizedError') {
      res.status(err.status).send({message:err.message});
      config.logger.error(err);
      return;
    }

}

var successAuth = function(req, res, next) {


  req["auth"] = {
    userId: req.user["https://app.fin71.de/fin71_id"]
  }

  next();

}


module.exports = { verifyToken, successAuth, errorAuth } ;