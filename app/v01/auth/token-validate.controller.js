var jwt = require('express-jwt');
var jwks = require('jwks-rsa');
const config = require('../../config/config');


var verifyToken = jwt({
  secret: jwks.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: config.auth.jwksUri
  }),
  aud: config.auth.auth0_audience, //'https://comfash.local:9999/api/v01',
  iss: config.auth.iss,
  algorithms: ['RS256']
});


var successAuth = function(req, res, next) {


  req["auth"] = {
    userId: req.user["https://app.comfash.com/cf_id"]
  }

  next();

}


module.exports = { verifyToken, successAuth } ;