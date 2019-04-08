const config = require('../../config/config');
const models = require("../models");

const Op = require("sequelize").Op;
const util = require("../util");

function getAccountTransactions(req, res){

    try{

        let userId = req.auth.userId;
        let limit = req.query.limit || 10; 
        let offset = req.query.offset || 0; 

        let whereStr = "where t.transactionOwnerId = ?"; 
        var qryOption = { raw: true, replacements: [userId], type: models.sequelize.QueryTypes.SELECT};

        if ("flagUnreadOnly" in req.query){
            whereStr += " and t.flagUnread = 1"
        }

        let qryStr = 
                'SELECT \
                    t.*,  \
                    u.*, \
                    b.bankLogoUrl, \
                    b.bankName \
                FROM fin71.tblacctransactions as t \
                \
                INNER JOIN fin71.tblbanks as b on t.localSysBankId = b.bankId \
                INNER JOIN fin71.tblusers as u on t.transactionOwnerId = u.userId ' + whereStr + ' \
                ORDER BY t.transactionEntryDate Desc LIMIT ' + limit + ' OFFSET ' + offset;


        models.sequelize.query(
            qryStr,
            qryOption
        ).then(transactions => {
            if (transactions) {			
                res.json(transactions);
            } else {
                res.send(401, "Acc-Transactions not found");
            }

        }, function(error) {
            throw error;
        
        }).catch(err => {
            config.handleError("getAccountTransactions", res, err)
        });

    }catch(err){
        config.handleError("getAccountTransactions", res, err);
    }

}

function updateAccTransaction(req, res){

    let targetAccTransaction = req.body;

    let userId = req.auth.userId;  

    // ensure that key fields are present for the update 

    if ( "accountNumber" in targetAccTransaction && 
        "accountBlz" in targetAccTransaction &&
        "transactionAmt" in targetAccTransaction &&
        "transactionTitle" in targetAccTransaction &&
        "transactionDate" in targetAccTransaction){

            let flagUnread = 1; 

            if ("flagUnread" in targetAccTransaction){
                flagUnread = targetAccTransaction.flagUnread; 
            }
            
            models.tblacctransactions.update({
                flagUnread : flagUnread, 
                linkTransactionId : targetAccTransaction.linkTransactionId || null
            }, {
                where: {
                    accountNumber: targetAccTransaction.accountNumber, 
                    accountBlz: targetAccTransaction.accountBlz, 
                    transactionAmt: targetAccTransaction.transactionAmt, 
                    transactionTitle: targetAccTransaction.transactionTitle, 
                    transactionDate: targetAccTransaction.transactionDate, 
                    transactionOwnerId : userId
                }
            }).then(transactions => {
                    if (transactions) {			
                        res.json({"msg" : "ok"});
                    } else {
                        res.send(401, "Acc-Transactions not found");
                    }
        
                }, function(error) {
                    throw error;
                
                }).catch(err => {
                    config.handleError("updateAccTransaction", res, err)
                });

    }else{
        res.send(500, "Please provide accurate acc-Transaction object")
    }

   
}

async function _getUserPayerTransactions(accTransaction){

    return new Promise(
        (resolve, reject) => {

            let userId = accTransaction.transactionOwnerId;
            let transactionDate = accTransaction.transactionDate; 
            let transactionAmt = accTransaction.transactionAmt;
            let transactionTitle = accTransaction.transactionTitle; 

            let amtLowerBound = Math.abs(transactionAmt) * 0.98; 
            let amtUpperBound = Math.abs(transactionAmt) * 1.02; 

            var qryOption = { raw: true, replacements: [transactionDate, userId, userId, userId, amtLowerBound, amtUpperBound, transactionTitle, transactionDate], type: models.sequelize.QueryTypes.SELECT}; 
            
            let qryStr = 
            "SELECT t.*, DATEDIFF(t.transactionCreatedAt, ?) as dateDiff, p.projectTitle, ty.typeTitle, ty.typeIcon \
            FROM fin71.tbltransactions as t \
            left join ( \
            SELECT * FROM tbltransactionportions where userId = ?) as tp on t.transactionId = tp.transactionId  \
            inner join tblprojects as p on t.projectId = p.projectId \
            inner join tbltypes as ty on t.typeId = ty.typeId \
            where   \
            (tp.userId = ? or t.transactionPayerUserId = ?) AND   \
            (abs(t.transactionAmt) > ? AND abs(t.transactionAmt) < ?) AND \
            (t.transactionTitle != ?) \
            order by abs(DATEDIFF(t.transactionCreatedAt, ?))";

            models.sequelize.query(
                qryStr,
                qryOption
            ).then(transactions => {
                resolve(transactions); 
                
            }).catch(err => {
                reject(err)
            });

        
        }   
    );

}


function findExistingExpenseForAccTLink (req, res){

    let accTransaction = req.body;

    if (!accTransaction){
        res.send(500, "Please provide an acc-transaction-item");
        return;
    }

    (async () => {
        try{

            let userTransactions = await _getUserPayerTransactions(accTransaction).catch(error => {
                throw new Error(error);
            }); 

            let suggestedTransactions = {
                t : userTransactions
            }; 

            res.send(suggestedTransactions);

        }catch(err){

            config.handleError("postAccTransactionArray", res, err);

        }
    })();

    return true;
}



// #### ADMIN #####



async function _insertAccTransactionItem (item) {
    
    return new Promise(
        (resolve, reject) => {
            models.tblacctransactions.build(item).save()
              .then(result => {
                resolve(true); 
              })
              .catch(error => {
                reject(error);
              })

        }
    );

}

function postAccTransactionArray (req, res){

    let accTransactionArray = req.body.accTransactions;

    if (!accTransactionArray){
        res.send(500, "Please provide an array with acc-transaction-items");
        return; 
    }

    accTransactionArray.forEach(element => {

        element["transactionEntryDate"] = new Date(element["transactionEntryDate"]);
        element["withdrawDate"] = new Date(element["withdrawDate"]);

    });

    let successArray = []; 
    let errorArray = []; 
   

        (async () => {  
            try{


                 for (const element of accTransactionArray){

                    await _insertAccTransactionItem(element)
                    .then(res => {
                        successArray.push(element); 
                    })
                    .catch(error => {
                        errorArray.push({
                            "el" : element, 
                            "error" : error.fields
                        }); 
                        config.logger.error(error); 
                    }); 
                    
                }

                res.send({"errors" : errorArray, "successCnt" : successArray.length});

            }catch(err){

                config.handleError("postAccTransactionArray", res, err);

            }
        })();

    return true;

    //TODO: type-check array 
    /*
    models.tblacctransactions.bulkCreate(accTransactionArray).then(() => {
        res.json({"msg" : "ok"});
      })
      .catch(error => {
        res.send(500, error.name);
    })
    */

}

module.exports = { getAccountTransactions, updateAccTransaction, postAccTransactionArray, findExistingExpenseForAccTLink };