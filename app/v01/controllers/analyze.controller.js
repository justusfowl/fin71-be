const config = require('../../config/config');
const models = require("../models");
const util = require("../util");
const projectCtrl = require("./projects.controller")
const _ = require("lodash");

function getTransactionSums(req, res){
    try{

        let userId = req.auth.userId; 

        let projectId = req.params.projectId;

        let flagAggregates = req.query.flagAggregates;

        let configObj = req.body.config; 

        if (typeof(configObj) == "undefined"){
            res.send(500, "Please provide a query config object");
            return; 
        }

        var whereStrThisMonth = "";
        var targetMode = ""; 

        if (typeof(req.query.flagOnlyThisMonth) != "undefined"){
            whereStrThisMonth = "where (month(t.transactionCreatedAt) = month(current_date()) and year(t.transactionCreatedAt) = year(current_date()))";
        }

        if (whereStrThisMonth.length == 0){
            whereStrThisMonth = " where "
        }else{
            whereStrThisMonth += " and  "
        }

        if (configObj.targetMode == "cost"){
            targetMode = "userId"; 
            
           
        }else if (configObj.targetMode == "expense"){
            targetMode = "transactionPayerUserId"; 
        }

        whereStrThisMonth += targetMode + " = ?"

        var qryOption = { raw: true, replacements: [userId], type: models.sequelize.QueryTypes.SELECT}; 
        
        if (typeof(projectId) != "undefined"){
            whereStrThisMonth += " and t.projectId = ?";

            qryOption.replacements.push(projectId);
        }


        let qryStr = 'SELECT \
            sum(factorAmt) as proportionTransactionAmt,  \
            p.projectId, \
            ty.typeTitle,  \
            transactions.typeId, transactions.'
            + targetMode + ', \
            lpad(month(transactions.transactionCreatedAt), 2, 0) as monthTransactionCreatedAt, \
            year(transactions.transactionCreatedAt) as yearTransactionCreatedAt \
                \
            FROM ( \
            SELECT  \
                    t.*, \
                    tp.userId, \
                    transactionAmt*tp.factor as factorAmt \
                FROM fin71.tbltransactions as t \
                inner join fin71.tbltransactionportions as tp on t.transactionId = tp.transactionId '
                + whereStrThisMonth + ' \
            ) as transactions \
            inner join fin71.tblprojects as p on transactions.projectId = p.projectId  \
            inner join fin71.tbltypes as ty on transactions.typeId = ty.typeId  \
            GROUP BY  \
                p.projectId, ty.typeTitle, transactions.typeId, transactions.' + targetMode + ',  \
                lpad(month(transactions.transactionCreatedAt), 2, 0) ,  \
                year(transactions.transactionCreatedAt);'


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
                        var tAnalysis = {}; 
                        var totalAmountEur = 0;

                        transactions.forEach(function(x) {

                            totalAmountEur += parseFloat(x.factorAmt);

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
                            tAnalysis[u] = output;
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

                                    if (Math.abs(saldoUserAforUserB.sumTransactionAmt) < Math.abs(saldoUserBforUserA.sumTransactionAmt)){
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

                        let responseObj = {
                            "tAnalysis": tAnalysis, 
                            "pSaldo" : totalSaldos,
                            "totalAmountEur" : totalAmountEur
                        }

                        res.json(responseObj);
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

module.exports = { getSaldo, getTransactionSums };