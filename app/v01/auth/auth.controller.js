
var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
var bcrypt = require('bcryptjs');
const config = require('../../config/config');

const uuidv1 = require('uuid/v1');
const models = require('../models');                                                                                                                                                                 
const https = require('https');

var crypto = require('crypto');

function registerUser ( req, res ){

    let user = req.body.user;
    let context = req.body.context;
    let secret = req.body.auth0_secret;

    if (secret == config.auth.auth0_secret){

        let newId = crypto.createHash('md5').update(user.email).digest("hex");

        models.tblusers.build({
            userId: newId,
            userName : user.nickname || user.email.substring(0,user.email.indexOf("@")),
            userEmail: user.email,
            userAvatarPath : user.picture_large || "https://cdn1.iconfinder.com/data/icons/avatars-55/100/avatar_profile_user_music_headphones_shirt_cool-512.png"
        }).save()
          .then(resultUser => {
            // you can now access the currently saved task with the variable anotherTask... nice!
            console.log("registering new user successful: ", resultUser.userId); 

            let resp = {
                "fin71_id" : resultUser.userId
            };

            res.json(resp);

          })
          .catch(error => {
    
            if (error.original.errno == 1062){

                res.json({
                    userId : newId, 
                    userEmail: user.email, 
                    fin71_id : newId
                })

            }else{
                res.send(500, error.name);
            }
          })
    }else{
        res.send(401, "Unauthorized");
    }

}

module.exports = { registerUser };