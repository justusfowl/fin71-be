const config = require('../../config/config');
const models = require("../models");
const Op = require("sequelize").Op;
const util = require("../util");


function searchUsers(req, res){
    try{

        // allow for email search only

        let searchStr = req.query.userSearch; 

        if (!util.validateEmail(searchStr)){
            res.send(500, "Please provide a valid email address");
            return;
        }

        
        let requestUserId = req.auth.userId; 

        if (searchStr.length < 3){
            return res.status(500).send({ message: 'Not enough characters provided, at least 3.' });
        }

        models.tblusers.findOne({
            where : {
                userEmail: {
                    [Op.eq]: searchStr
                  }
              },
            attributes: ['userId', 'userName', 'userAvatarPath', 'userEmail']
        }).then(function(users) {
            if (users) {				
                res.json(users);
            } else {
                res.send(404, "User not found");
            }
            }, function(error) {
                config.logger.error(error);
                res.send("User not found");
        });


    }catch(err){
        config.handleError("searchUsers", res, err)
    }
}

module.exports = { searchUsers };