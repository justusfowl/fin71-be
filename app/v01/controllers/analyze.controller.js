const config = require('../../config/config');
const models = require("../models");
const util = require("../util");
const projectCtrl = require("./projects.controller")
const _ = require("lodash");

function getTypeTotals(req, res){
    try{

        let projectId = req.params.projectId;

        let qryStr = 
                'Select \
                    typeTitle,  \
                    abs(sum(factorAmt)) as sumTransactionAmtEur,  \
                    projectId \
                    \
                from ( \
                    \
                SELECT \
                    t.projectId, \
                    ty.typeTitle, \
                    pu.userName as payerUserName, \
                    t.transactionId, \
                    transactionAmt*factor as factorAmt,  \
                    u.userName as factorUser \
                    \
                FROM fin71.tbltransactions as t \
                \
                INNER JOIN fin71.tbltransactionportions as f on f.transactionId = t.transactionId \
                INNER JOIN fin71.tblusers as u on f.userId = u.userId \
                INNER JOIN fin71.tblusers as pu on t.transactionPayerUserId = pu.userId \
                INNER JOIN fin71.tbltypes as ty on t.typeId = ty.typeId \
                ) as t \
                where projectId = ? \
                group by \
                typeTitle, projectId;'
                

        var qryOption = { raw: true, replacements: [projectId], type: models.sequelize.QueryTypes.SELECT}; 

        models.sequelize.query(
            qryStr,
            qryOption
        ).then(totals => {

            if (totals) {

                res.json(totals);
            } else {
                res.send(401, "project not found");
            }

        }).catch(err => {
            config.handleError("getTypeTotals", res, err)
        });

    }catch(err){
        config.handleError("getTypeTotals", res, err)
    }
}

function getSaldo(req, res){
    try{

        let projectId = req.params.projectId;

        (async () => {
            try{

                let projectContributors = await projectCtrl._getProjectContributors(projectId).catch(error => {
                    throw error;
                }); 

                let qryStr = 
                'SELECT \
                    t.projectId, \
                    pu.userName as payerUserName, \
                    t.transactionId, \
                    transactionAmt*factor as factorAmt,  \
                    u.userName as factorUserName \
                    \
                FROM fin71.tbltransactions as t \
                \
                INNER JOIN fin71.tbltransactionportions as f on f.transactionId = t.transactionId \
                INNER JOIN fin71.tblusers as u on f.userId = u.userId \
                INNER JOIN fin71.tblusers as pu on t.transactionPayerUserId = pu.userId \
                where t.projectId = ? \
                \
                ORDER BY t.transactionId Desc;';
                        
        
                var qryOption = { raw: true, replacements: [projectId], type: models.sequelize.QueryTypes.SELECT}; 
                
                models.sequelize.query(
                    qryStr,
                    qryOption
                ).then(transactions => {
                    if (transactions) {
                        var userMap = {};

                        transactions.forEach(function(x) {

                            if (!userMap[x.factorUserName]){
                                userMap[x.factorUserName] = {
                                    t : []
                                }; 
                            }

                            if (!userMap[x.payerUserName]){
                                userMap[x.payerUserName] = {
                                    t : []
                                }; 
                            }
                            
                        });

                        transactions.forEach(function(x) {

                            let tmpObj = {
                                "transactionAmt" : parseFloat(x.factorAmt),
                                "payerUserName" : x.payerUserName
                            }

                            userMap[x.factorUserName].t.push(tmpObj);

                        });

                        const users = Object.keys(userMap);

                        for (const u of users) {
                            let userTransactions = userMap[u].t;

                            var output =
                                _(userTransactions)
                                    .groupBy('payerUserName')
                                    .map((objs, key) => ({
                                        'payerUserName': key,
                                        'sumTransactionAmt': _.sumBy(objs, 'transactionAmt') }))
                                    .value();
                            userMap[u]["tSaldo"] = output;
                        }

                        let totalSaldos = [];
                        
                        // iterate through all combinations of user saldos (uA=user(A))
                        for (const uA of users) {

                            for (const uB of users) {
                                // User A owes Person B amount -XYZ €

                                if (uA != uB){

                                    // has userB paid for userA ?
                                    let saldoIndexUserA = userMap[uA].tSaldo.findIndex(x => (x.payerUserName == uB));

                                    // has userA paid for userB ?
                                    let saldoIndexUserB = userMap[uB].tSaldo.findIndex(x => (x.payerUserName == uA));
                                    
    
                                    let saldoUserAforUserB, saldoUserBforUserA;
    
                                    if (saldoIndexUserA == -1){
                                        saldoUserAforUserB = {
                                            'payerUserName': uB,
                                            'sumTransactionAmt': 0
                                        }
                                    }else{
                                        saldoUserAforUserB = userMap[uA].tSaldo[saldoIndexUserA]
                                    }
    
                                    if (saldoIndexUserB == -1){
                                        saldoUserBforUserA = {
                                            'payerUserName': uA,
                                            'sumTransactionAmt': 0
                                        }
                                    }else{
                                        saldoUserBforUserA = userMap[uB].tSaldo[saldoIndexUserB]
                                    }
    
                                    let deltaAmt, source, target;

                                    deltaAmt = saldoUserAforUserB.sumTransactionAmt-saldoUserBforUserA.sumTransactionAmt;

                                    if (deltaAmt < 0){
                                        source = uA; 
                                        target = uB;
                                    }else{
                                        source = uB;
                                        target = uA;
                                    }

                                    let saldoItm = {
                                        "source" : source, 
                                        "target" : target, 
                                        "value" : Math.abs(deltaAmt)
                                    }

                                    if (totalSaldos.findIndex(x => (x.source == saldoItm.source && x.target == saldoItm.target)) == -1){
                                        totalSaldos.push(saldoItm)
                                    }

                                }

                            }

                        }

                        console.log(totalSaldos)

                        res.json(totalSaldos);
                    } else {
                        res.send(401, "Transactions not found");
                    }
        
                }).catch(err => {
                    config.handleError("getSaldo", res, err)
                });
        
            }catch(err){
                config.handleError("getSaldo", res, err);
            }
           
        })();


    }catch(err){
        config.handleError("getSaldo", res, err)
    }
}

module.exports = { getSaldo, getTypeTotals };