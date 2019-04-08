const config = require('../../config/config');
const models = require("../models");
const uuidv1 = require('uuid/v1');
const base64ToImage = require('base64-to-image');
const crypto = require('crypto');

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

    var onlinePath;

    if (config.env == "production"){
        onlinePath = "https://" + config.baseDomain + "/data/a/" + imageInfo.fileName
    }
    else{
        onlinePath = "https://" + config.baseDomain + ":" + config.port + "/data/a/" + imageInfo.fileName
    }    

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

async function createInviteUser(inputUser){

    return new Promise(
        (resolve, reject) => {

            let newId = crypto.createHash('md5').update(inputUser.userEmail).digest("hex");

            models.tblusers.build({
                userId: newId,
                userName : inputUser.userEmail.substring(0,inputUser.userEmail.indexOf("@")),
                userEmail: inputUser.userEmail,
                userCreatedAt : new Date(),
                localUserCreatedByUserId : inputUser.localUserCreatedByUserId
            }).save()
              .then(resultUser => {
                   
                resolve(resultUser)
    
              })
              .catch(error => {
                reject(error);
              })

        }
    );

}

function inviteUser(req, res){

    try{

        let userId = req.auth.userId;
        let userBody = req.body;

        userBody["localUserCreatedByUserId"] = userId; 

        if (typeof(userBody.userEmail) == "undefined"){
            res.send(500, "No userEmail has been provided");
            return; 
        }

        createInviteUser(userBody).then(inviteUser => {

            res.json(inviteUser);

        }).catch(err => {
            if (err.original){
                if (err.original.errno){
                    res.send(500, {"msg" : "User Id cannot be invited"})
                }else{
                    config.handleError("inviteUser", res, err); 
                }
            }else{
                config.handleError("inviteUser", res, err); 
            }
            
        })

    }catch(err){
        config.handleError("inviteUser", res, err); 
    }

}


module.exports = { getUserProfileBase, upsertProfileAvatar, inviteUser };

