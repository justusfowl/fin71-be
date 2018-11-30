const config = require('../../config/config');
const models = require("../models");
const Op = require("sequelize").Op;

function searchUsers(req, res){
    try{

        let searchStr = req.query.userSearch; 
        let requestUserId = req.auth.userId; 

        if (searchStr.length < 3){
            return res.status(500).send({ message: 'Not enough characters provided, at least 3.' });
        }

        models.tblusers.findAll({
            where : {
                userName: {
                    [Op.like]: '%' + searchStr + '%'
                  }
              },
            attributes: ['userId', 'userName', 'userAvatarPath']
        }).then(function(users) {
            if (users) {				
                res.json(users);
            } else {
                res.send(401, "User not found");
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