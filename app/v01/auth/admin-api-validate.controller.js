
const config = require('../../config/config');


var validateApiSecret = function(req, res, next) {

    let secret = req.headers.api_secret;

    if (secret == config.auth.api_secret){
        next();
    }else{
        res.send(401, "Unauthorized");
    }

}


module.exports = { validateApiSecret } ;