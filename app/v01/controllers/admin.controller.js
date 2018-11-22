const config = require('../../config/config');


function hb(req, res){

    let secret = req.body.auth0_secret;
    if (secret == config.auth.auth0_secret){
        res.json({"message" : "ok"});
    
    }else{
        res.send(401, "Unauthorized");
    }

}




module.exports = { hb };