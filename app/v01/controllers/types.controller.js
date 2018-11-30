const config = require('../../config/config');
const models = require("../models");

class Type{
    constructor(option=null){
        if (option){
            this.typeTitle = option.typeTitle || null;
            this.typeIcon = option.typeIcon || null;
            this.typeId = option.typeId || null;
        }
    }

    set setUserId (userId){
        this.userId = userId;
    }
}

function saveType(req, res){

    try{

        let userId = req.auth.userId; 

        let type = new Type(req.body);
        type.setUserId = userId;
    
        models.tbltypes.upsert(type).then(resType => {

            res.json(200);
            
        }).catch(error => {
            config.handleError("SaveProject", res, error);
        });

    }catch(err){
        config.handleError("SaveProject", res, err)
    }

}

function getTypes(req, res){

    try{

        let userId = req.auth.userId; 

        models.tbltypes.findAll({
            where: {
                userId: userId
              }
        }).then(function(types) {
            if (types) {			
                res.json(types);
            } else {
                res.send(401, "Types not found");
            }
        }, function(error) {
                throw error;
            
        }).catch(err => {
            config.handleError("getTypes", res, err)
        });


    }catch(err){
        config.handleError("getTypes", res, err)
    }

}

function deleteType(req, res){

    let userId  = req.auth.userId; 

    models.tbltypes.destroy({
        where: {
            typeId: req.params.typeId,
            userId: userId
          }
    }).then(function(type) {
        if (type) {				
            res.json(type);
        } else {
            res.send(404, "comment not found");
        }
        }, function(err) {
            config.handleError("deleteType", res, err);
    });
}


module.exports = { saveType, getTypes, deleteType};