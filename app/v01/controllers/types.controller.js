const config = require('../../config/config');
const models = require("../models");
const projectCtrl = require("./projects.controller");

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
            
            _getTypeItem(type).then(response => {
                res.json(response);
            }).catch(error => {
                config.handleError("saveType", res, error);
            });
            
            
        }).catch(error => {
            config.handleError("SaveProject", res, error);
        });

    }catch(err){
        config.handleError("SaveProject", res, err)
    }

}

async function _getTypeItem (type) {
    
    return new Promise(
        (resolve, reject) => {
            models.tbltypes.findAll({
                where: {
                    typeTitle : type.typeTitle, 
                    userId : type.userId
                }
            }).then(function(response) {

                if(response.length > 1){
                    throw "No unique type object could be identified"
                }else if(response.length == 1){
                    resolve(response[0]);
                }else{
                    throw "No unique type object could be identified"
                }

                return null;

                }, function(err) {
                    reject(err);
            });
        }
    );

}

function getTypes(req, res){

    try{

        var whereStrThisMonth = "";

        if (typeof(req.query.flagOnlyThisMonth) != "undefined"){
            whereStrThisMonth = "and (month(t.transactionCreatedAt) = month(current_date()) and year(t.transactionCreatedAt) = year(current_date()))";
        }

        let qryStr = 'SELECT \
            CASE When isnull(sum(proportionTransactionAmt)) then 0 else sum(proportionTransactionAmt) end as proportionTransactionAmt, \
            typesTbl.typeId,  \
            typesTbl.typeTitle, \
            typesTbl.typeIcon, \
            typesTbl.userId \
        from (  \
            SELECT  \
                t.*, \
                t.transactionAmt*p.factor as proportionTransactionAmt \
            FROM fin71.tbltransactions as t \
            left join fin71.tbltransactionportions as p on t.transactionId = p.transactionId \
            where t.transactionCategory = 1 and p.userId = ? ' + whereStrThisMonth + ' \
        ) as tt  \
        left join fin71.tblprojects as proj on tt.projectId = proj.projectId  \
        right join (  \
        SELECT * FROM fin71.tbltypes  \
        where userId = ?) as typesTbl on typesTbl.typeId= tt.typeId  \
        Group by  \
            typesTbl.typeId, \
            typesTbl.typeTitle, \
            typesTbl.typeIcon, \
            typesTbl.userId; ';

        let userId = req.auth.userId; 

        var qryOption = { raw: true, replacements: [userId, userId], type: models.sequelize.QueryTypes.SELECT}; 

        models.sequelize.query(
            qryStr,
            qryOption
        ).then(types => {

            if (types) {			
                res.json(types);
            } else {
                res.send(401, "Types not found");
            }

        }).catch(err => {
            config.handleError("getTypes", res, err)
        });

    }catch(err){
        config.handleError("getTypes", res, err)
    }

}

function addProjectType(req, res){

    try{

        let userId = req.auth.userId;
        let projectId = req.params.projectId;
        let typeId = req.params.typeId; 

        projectCtrl._isProjectOwner(userId, projectId).then(respObj => {

            if (respObj.isOwner){

                models.tblprojecttypes.upsert({
                    projectId : projectId, 
                    typeId : typeId
                }).then(resType => {

                    res.json(200);
                    
                }).catch(error => {
                    config.handleError("addProjectType", res, error);
                });
            }else{
                res.send(401, "User is not privileged to modify the project settings.")
            }
            
        }).catch(error => {
            config.handleError("addProjectType", res, error);
        });


    }catch(err){
        config.handleError("SavePraddProjectTypeoject", res, err)
    }

}

function removeProjectType(req, res){

    let userId  = req.auth.userId;
    let projectId = req.params.projectId; 
    let typeId = req.params.typeId; 

    let qryStr = 'DELETE FROM fin71.tblprojecttypes where projectId in (select projectId from tblprojects where projectId = ? and userId = ?)  and typeId = ?;';

    var qryOption = { raw: true, replacements: [projectId,  userId, typeId], type: models.sequelize.QueryTypes.DELETE}; 

    models.sequelize.query(
        qryStr,
        qryOption
    ).then(types => {
        res.json({"message" : "ok"});
        
    }).catch(err => {
        config.handleError("removeProjectType", res, err)
    });
}

function getProjectTypes(req, res){

    let userId  = req.auth.userId;
    let projectId = req.params.projectId;

    let flagGetTransactionAmt = req.query.flagGetTransactionAmt;
    let qryStr, qryOption; 

    if (flagGetTransactionAmt){
        qryStr = ' SELECT t.*, \
        CASE When isnull(tt.proportionTransactionAmt) then 0 else tt.proportionTransactionAmt end as proportionTransactionAmt \
        FROM  \
        fin71.tblprojecttypes as pt          \
        inner join tbltypes as t on pt.typeId = t.typeId  \
        left join ( \
            SELECT   \
                   t.typeId,  \
                   sum(t.transactionAmt*p.factor) as proportionTransactionAmt  \
               FROM fin71.tbltransactions as t  \
               left join fin71.tbltransactionportions as p on t.transactionId = p.transactionId  \
               where t.transactionCategory = 1 and t.projectId = ? \
               and (month(t.transactionCreatedAt) = month(current_date()) and year(t.transactionCreatedAt) = year(current_date())) \
               group by t.typeId) as tt on pt.typeId = tt.typeId \
        where projectId = ? ;'
        qryOption = { raw: true, replacements: [projectId, projectId], type: models.sequelize.QueryTypes.SELECT}; 
    }else{
        qryStr = 'SELECT * FROM fin71.tblprojecttypes pt \
        inner join tbltypes as t on pt.typeId = t.typeId \
        where projectId = ? ';
        qryOption = { raw: true, replacements: [projectId], type: models.sequelize.QueryTypes.SELECT}; 
    }  

    models.sequelize.query(
        qryStr,
        qryOption
    ).then(types => {

        res.json(types);
        
    }).catch(err => {
        config.handleError("getProjectTypes", res, err)
    });
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


module.exports = { saveType, getTypes, deleteType, addProjectType, removeProjectType, getProjectTypes};