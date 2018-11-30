const config = require('../../config/config');
const models = require("../models");

function getUserProfileBase (req,res) {

    let userId = req.params.userId;    
    
    models.tblusers.findOne({
        where : {
            "userId" : userId
          }
    }).then(function(user) {

        if (user) {				
            res.json(user);
        } else {
            res.send(400, "User not found");
        }
    }).catch(error => {
        res.send(500, "Something went wrong");
        config.logger.error(error);
    });

}


module.exports = { getUserProfileBase };

