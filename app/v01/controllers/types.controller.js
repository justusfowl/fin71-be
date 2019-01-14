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

        var whereStrThisMonth = "";

        if (typeof(req.query.flagOnlyThisMonth) != "undefined"){
            whereStrThisMonth = "and (month(t.transactionCreatedAt) = month(current_date()) and year(t.transactionCreatedAt) = year(current_date()))";
        }

        qryStr = 'SELECT \
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
            where p.userId = ? ' + whereStrThisMonth + ' \
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