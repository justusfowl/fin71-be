const config = require('../../config/config');
const models = require("../models");
const uuidv1 = require('uuid/v1');
const base64ToImage = require('base64-to-image');

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

function upsertProfileAvatar (req, res){

    let base64Str = req.body.imagePath;
    let userId = req.auth.userId; 

    let filename = uuidv1();

    // place pictures in folder a for avatars
    let path = config.publicDir  + '/a/';

    var optionalObj = {'fileName': filename, 'type':'jpeg'}; 
    
    var imageInfo = base64ToImage(base64Str,path,optionalObj); 

    var onlinePath = "https://" + config.baseDomain + ":" + config.port + "/data/a/" + imageInfo.fileName

    const u = models.tblusers.upsert({
        userId: req.auth.userId,
        userAvatarPath : onlinePath
    }).then(user => {
        console.log("user avatar saved"); 
        res.json({
            "userAvatarPath" : onlinePath
        });
        })
    .catch(error => {
        // Ooops, do some error-handling
        console.log(error);
        config.logger.error(error);
        res.send(500, error);
    });

}


module.exports = { getUserProfileBase, upsertProfileAvatar };

