const config = require('../../config/config');
const models  = require('../models');
const currencyCtrl = require("./currency.controller");
const sequelize = require("sequelize");

class TransactionPortion{
    constructor(option=null){
        this.transactionId = option.transactionId; 
        this.userId = option.userId; 
        this.factor = option.factor;
    }
}

class Transaction{
    constructor(option=null){
        if (option){

            let convertObj = currencyCtrl.instantConvert(option.transactionAmtOrig, option.transactionCurOrig); 

            if (convertObj){
                this.transactionCurOrig = convertObj.origCurrency;
                this.transactionAmtOrig = convertObj.origAmount;
    
                this.transactionAmt = convertObj.targetAmount;
                this.transactionCur = convertObj.targetCurrency;
            }else{
                throw new Error("Error in creating a transaction, please check using correct currency codes. Please visit api/{version}/convert/list for details on that.")
            }
            
            this.transactionPayerUserId = option.transactionPayerUserId || null; 

            this.transactionId = option.transactionId || null; 
            
            this.transactionTitle = option.transactionTitle || '';

            if ( typeof(option.transactionCategory) == "undefined"){
                throw new Error("No expense category provided")
            }else{
                this.transactionCategory = option.transactionCategory; 
            }
            
            if(option.portions){
                this.portions = option.portions; 
            }else{
                this.portions = [];
                if (option.userId && option.transactionCategory == 1){
                    // default, if nothing is given, add creator of expense = owner to 100%;
                    this.portions.push({userId : option.userId, factor: 1});  
                }else if(option.transactionCategory == 1 && typeof(option.portions) == "undefined"){
                    throw new Error("No target user for money transfer defined ")
                }
            }

            if (option.projectId){
                this.setProjectId = option.projectId;
            }

                this.transactionAmt = Math.abs(parseFloat(this.transactionAmt));
                this.transactionAmtOrig = Math.abs(parseFloat(this.transactionAmtOrig));

            // expenses -> always have to be negative 
            if (this.transactionCategory == 1){
                this.transactionAmt = parseFloat(this.transactionAmt) * -1;
                this.transactionAmtOrig = parseFloat(this.transactionAmtOrig) * -1;

                this.typeId = option.typeId;

            }else{

            // money transfer is positive towards other member of the project
            // hence: do not modify the absolute value of the amount  
            // money transfers do not carry typeId information 
                
            }
        }
    }

    set setTransactionCreatorId(userId){
        this.transactionCreatorUserId = userId; 

        // if no payerId is provided, creator = payer
        if (!this.transactionPayerUserId){
            this.transactionPayerUserId = this.transactionCreatorUserId;
        }

        // if no portioning is provided, creator bears 100% of cost
        if (this.portions.length == 0){
            this.portions.push({userId : this.transactionCreatorUserId, factor: 1});  
        }
    }

    set setTransactionId (transactionId){
        this.transactionId = transactionId;
    }

    set setPortions(portionsArray){
        this.portions = portionsArray; 
    }

    set setProjectId(projectId){
        this.projectId = projectId;
    }

}

function saveTransaction(req, res){

    let userId, projectId, t; 

    try{
        userId  = req.auth.userId; 

        projectId = req.params.projectId;
    
        t = new Transaction(req.body);
    
        t.setTransactionCreatorId = userId;
        t.setProjectId = projectId; 
    }catch(err){
        config.handleError("save Transaction could not be completed, not all fields being provided", res, err);
        return; 
    }
    
    
    models.tbltransactions.upsert(t).then(transaction => {

        let upsertedTransaction;

        (async () => {
            try{

                upsertedTransactionId = await getTransactionId(t).catch(error => {
                    throw error;
                }); 

                t.setTransactionId = upsertedTransactionId;

                // TODO: checke, dass auch nur project-menschen Kosten aufgebrummt bekommen

                let portions = await setTransactionPortions(t).catch(error => {
                    throw error;
                }); 
                
                t.setPortions = portions; 
    
                res.send(t);
        
            }catch(err){

                // Rollback storing transaction and remove it
                await removeTransaction(t.transactionId, t.transactionCreatorUserId);
                config.handleError("addTransaction", res, err);
            }
           
        })();

        return true;
        
    }).catch(error => {
        config.handleError("addTransaction", res, error);
    })
}

async function setTransactionPortions (transaction) {
    
    return new Promise(
        (resolve, reject) => {

            let totalFactor = 0, insertArr = []; 

            transaction.portions.forEach(element => {
                totalFactor += element.factor;
                element["transactionId"] = transaction.transactionId;
                let tProp = new TransactionPortion(element); 
                insertArr.push(tProp); 
            });

            transaction.portions = insertArr; 

            if (totalFactor != 1){
                reject("Factors do not add up to 1!");
                return;
            }

            cleanTransactionPortions(transaction)
                .then(function(t) {
                models.tbltransactionportions.bulkCreate(insertArr)
                    .then(function(response) {
                        resolve(transaction.portions);
                    }).catch(error => {
                        reject(error);
                    })
            }, function(err) {
                   reject(err);
            });
        }
    );
}

async function cleanTransactionPortions (transaction) {
    
    return new Promise(
        (resolve, reject) => {
            models.tbltransactionportions.destroy({
                where: {
                    transactionId : transaction.transactionId
                }
            }).then(function(response) {
                resolve(transaction);
                }, function(err) {
                reject(err);
            });
        }
    );
}

async function _getTransactionPortionsDb (transactionId) {
    
    return new Promise(
        (resolve, reject) => {

            var qryOption = { raw: true, replacements: [transactionId], type: models.sequelize.QueryTypes.SELECT}; 
        
            let qryStr = 
            'SELECT * FROM fin71.tbltransactionportions as p \
            left join tblusers as u on p.userId = u.userId \
            where transactionId = ?'
        
            models.sequelize.query(
                qryStr,
                qryOption
            ).then(transactionPortions => {
                resolve(transactionPortions);
    
            }).catch(err => {
                reject(err);
            });
        }
    );
}

async function getTransactionId (transaction) {

    let whereObj; 

    if (transaction.transactionCategory == 1){
        whereObj = {
            transactionAmt: parseFloat(parseFloat(transaction.transactionAmt).toFixed(2)),
            typeId: transaction.typeId,
            projectId: transaction.projectId,
            transactionTitle : transaction.transactionTitle
        }
    }else if (transaction.transactionCategory == 2){
        whereObj = {
            transactionAmt: parseFloat(parseFloat(transaction.transactionAmt).toFixed(2)),
            transactionCategory : transaction.transactionCategory,
            projectId: transaction.projectId,
            transactionTitle : transaction.transactionTitle
        }
    }
    
    return new Promise(
        (resolve, reject) => {
            models.tbltransactions.findOne({
                attributes: [
                    [sequelize.fn('max', sequelize.col('transactionId')), 'transactionId'],
                 ],
                where: whereObj
            }).then(function(response) {

                if (response.transactionId){
                    resolve(response.transactionId);
                }else{
                    reject("TransactionId could not be identified");
                }
                
                }, function(err) {
                reject(err);
            });
        }
    );
}

async function removeTransaction (transactionId, transactionCreatorUserId) {
    
    return new Promise(
        (resolve, reject) => {
            models.tbltransactions.destroy({
                where: {
                    transactionId: transactionId,
                    transactionCreatorUserId : transactionCreatorUserId
                }
            }).then(function(response) {
                resolve(true);
                }, function(err) {
                reject(err);
            });
        }
    );
}

function deleteTransaction(req, res){

    (async () => {
        let userId = req.auth.userId; 
        let transactionId = req.params.transactionId; 
            
        await removeTransaction(transactionId, userId).then(response => {
            res.json({"message" : "ok"});
        }).catch(error => {
            config.handleError("deleteTransaction", res, error);
        }); 

        return true; 
       
    })();

}

function getTransactionPortions(req, res){

    (async () => {
        let transactionId = req.params.transactionId; 
            
        await _getTransactionPortionsDb(transactionId).then(transactionPortions => {
            res.json(transactionPortions);
        }).catch(error => {
            config.handleError("getTransactionPortions", res, error);
        }); 

        return true; 
       
    })();

}

function getProjectTransactions(req, res){

    try{

        let projectId = req.params.projectId;

        let userId = req.auth.userId; 

        var qryOption = { raw: true, replacements: [userId], type: models.sequelize.QueryTypes.SELECT}; 
        
        let qryStr = 
        "SELECT *, creatorUser.userName as transactionCreatorUserName, \
        CASE WHEN IsNull(accT.linkTransactionId) THEN 0 ELSE 1 END as hasAccTLink \
        FROM fin71.tbltransactions as e\
        left join fin71.tblcontributors as c on e.projectId = c.projectId\
        left join fin71.tblprojects as p on e.projectId = p.projectId\
        left join fin71.tbltypes as t on e.typeId = t.typeId \
        left join (Select linkTransactionId from fin71.tblacctransactions where transactionOwnerId = '" + userId + "') as accT on e.transactionId = accT.linkTransactionId \
        left join fin71.tblusers as creatorUser on e.transactionCreatorUserId = creatorUser.userId \
        where c.userId = ? ";

        if (projectId){
            qryOption.replacements.push(projectId);
            qryStr += "and e.projectId = ?"
        }

        qryStr += " order by e.transactionCreatedAt DESC"

        models.sequelize.query(
            qryStr,
            qryOption
        ).then(transactions => {
            if (transactions) {			
                res.json(transactions);
            } else {
                res.send(401, "transactions not found");
            }

        }).catch(err => {
            config.handleError("getProjectTransactions", res, err)
        });

    }catch(err){
        config.handleError("getProjectTransactions", res, err)
    }

}

module.exports = { deleteTransaction, saveTransaction, getProjectTransactions, getTransactionPortions};