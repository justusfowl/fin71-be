var Joi = require('joi');
const request = require("request")


// require and configure dotenv, will load vars in .env in PROCESS.ENV
require('dotenv').config();

var logger = require('../../logger');

var versiony = require('versiony');

let env = (process.env.NODE_ENV).toLowerCase() || 'development'; 

var port;

if (env == 'development'){
  port = process.env.PORT || 9999;

  
  versiony
    .patch()                // will cause the minor version to be bumped by 1
    .from('version.json')   // read the version from version.json
    .to()                   // write the version to the source file (package.json)
                            // with the minor part bumped by 1
    .to('bower.json')       // apply the same version
    .to('package.json')     // apply the same version
    .end()                  // display info on the stdout about modified files
  
}
else if (env == 'production'){
  port = process.env.PORT || 443;
}else{
  port = 9999;
}


const config = {
    currencyData : {},

    logger : logger.logger,
    env: env,
    port: port,
    APIVersion: '01',

    https: {
      key : process.env.HTTPS_KEY,
      crt : process.env.HTTPS_CRT,
      ca : process.env.HTTPS_ROOTCA,
    },

    mysql: {
      username: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASS || "",
      database: process.env.MYSQL_DB,
      port: process.env.MYSQL_PORT,
      host: process.env.MYSQL_HOST,
      dialect: 'mysql'
    },

    auth : {
      jwtSecret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN,
      auth0_secret : process.env.AUTH0_SECRET, 
      auth0_client_id: process.env.AUTH0_CLIENT_ID, 
      auth0_client_secret: process.env.AUTH0_CLIENT_SECRET, 
      auth0_audience : process.env.AUTH0_AUDIENCE, 
      auth0_domain: process.env.AUTH0_DOMAIN, 
      jwksUri : process.env.JWKS_URI,
      iss : process.env.ISS, 
      api_secret : process.env.API_SECRET
    }, 

    fixer : {
      accessKey : process.env.FIXER_KEY
    },

    setCurrencyRates : async function(){

      let thisConfig = this; 

      await getCurrencyRates(thisConfig).then((result) => {
        this.currencyData = result.rates;
      }).catch(err => {
        this.logger.error(err);
      });
      
    },

    handleError : function (source, res, err){

      if (err.original){

        // a foreign key constraint error 
        if (err.original.errno == 1452){
          res.send(500, "Foreign key constraint failed in " + source);
          this.logger.error(err);

          return; 
        }
      }
      console.log(err)
      let errorObj = {
        "source" : source, 
        "err" : err
      }
      res.send(500, errorObj);
      this.logger.error(err);
    }
  };

  function getCurrencyRates(configItem)  {

    return new Promise(
        (resolve, reject) => {

         request("http://data.fixer.io/api/latest?access_key=" + configItem.fixer.accessKey, { json: true }, (err, res, body) => {
          if (err) { reject(err); console.log(err); }
          resolve(body)
          });
        }
      );
    };
  

 config.setCurrencyRates(); 
 
  module.exports = config;
