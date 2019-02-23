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

        var whereStrThisMonth = " where t.transactionCategory = 1 ";
        var targetMode = ""; 

        if (typeof(req.query.flagOnlyThisMonth) != "undefined"){
            whereStrThisMonth += " and (month(t.transactionCreatedAt) = month(current_date()) and year(t.transactionCreatedAt) = year(current_date()))";
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

                        // get a user map object with all users of that project
                        // each user can have spent transactions

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

                        // dedicate each project transaction to the user who carries the cost
                        // and indicate who paid for the transaction amount
                        transactions.forEach(function(x) {

                            let tmpObj = {
                                "transactionAmt" : parseFloat(x.factorAmt),
                                "payerUserName" : x.payerUserName
                            }

                            userMap[x.factorUserName].t.push(tmpObj);

                        });

                        const users = Object.keys(userMap);

                        // get the total cost incured per user

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
                        let pairsNetted = []; 

                        // go through all users and their costs which have been incurred by other people
                        for (const uA of users) {

                            // check each user 
                            userMap[uA].tSaldo.forEach(payerUserElement => {

                                // Disregards payments done for myself
                                if (payerUserElement.payerUserName != uA){

                                    let transactionAmountOtherUserHasPaidForUA = parseFloat(payerUserElement.sumTransactionAmt); 

                                    // find if uA has made payments for payerUserName as well
                                    let uA_hasPaidForPayerIndex = userMap[payerUserElement.payerUserName].tSaldo.findIndex(x => (x.payerUserName == uA));

                                    let uATransactionAmtForPayer = 0;

                                    if (uA_hasPaidForPayerIndex != -1){
                                        uATransactionAmtForPayer = parseFloat(userMap[payerUserElement.payerUserName].tSaldo[uA_hasPaidForPayerIndex].sumTransactionAmt);
                                    }

                                    let delta;

                                    // if transactionAmountOtherUserHasPaidForUA is greater 0 -> other user has transfered money
                                    // to the user A
                                    if (transactionAmountOtherUserHasPaidForUA > 0){

                                    }else{
                                        
                                    }

                                    if (uATransactionAmtForPayer > 0){
                                        delta =  transactionAmountOtherUserHasPaidForUA + uATransactionAmtForPayer; 
                                    }else{
                                        delta =  transactionAmountOtherUserHasPaidForUA - uATransactionAmtForPayer; 
                                    }
                                   

                                   let saldoItm  = { "value" : Math.abs(delta) }

                                    if (Math.abs(transactionAmountOtherUserHasPaidForUA) > Math.abs(uATransactionAmtForPayer)){
                                        saldoItm["source"] = uA; 
                                        saldoItm["target"] = payerUserElement.payerUserName
                                    }else{
                                        saldoItm["source"] = payerUserElement.payerUserName; 
                                        saldoItm["target"] = uA; 
                                    }


                                    // create a reference object as 'saldoPair' to indicate 
                                    // that the two users have been compared 
                                    // use an alphabetical order to ensure unqiqueness of saldopairs
                                    let tmpArray = [uA, payerUserElement.payerUserName]; 
                                    let tmpArraySorted = tmpArray.sort((a, b) => a.localeCompare(b));

                                    let saldoPair = {
                                        "a" : tmpArraySorted[0], 
                                        "b" : tmpArraySorted[1]
                                    }

                                    if (pairsNetted.findIndex(x => (x.a == saldoItm.source && x.b == saldoItm.target)) == -1 &&
                                    pairsNetted.findIndex(x => (x.b == saldoItm.source && x.a == saldoItm.target)) == -1){
                                        pairsNetted.push(saldoPair); 

                                        // if saldo = 0 not necessary to indclude 
                                        if (saldoItm.value > 0){
                                            totalSaldos.push(saldoItm);
                                        }
                                        
                                    }

                                }
                                
                            });

                        }


                        let cntChanged = 0;
                        
                        do {
                             
                            cntChanged = 0;

                            totalSaldos.forEach(function (saldoElement, myIndex){

                                let isThereSourceIndex = totalSaldos.findIndex(x => x.source == saldoElement.target);

                                if (isThereSourceIndex != -1 && isThereSourceIndex != myIndex){

                                    if (saldoElement.value > totalSaldos[isThereSourceIndex].value){
                                        
                                        totalSaldos[isThereSourceIndex].source = saldoElement.source
                                        saldoElement.value = saldoElement.value - totalSaldos[isThereSourceIndex].value;
                                        
                                    }else{
                                        saldoElement.target = totalSaldos[isThereSourceIndex].target; 
                                        totalSaldos[isThereSourceIndex].value = totalSaldos[isThereSourceIndex].value - saldoElement.value
                                    }

                                    cntChanged++;

                                }
                                
                            });

                        }while(cntChanged > 1);
                        
                        // group by source and target

                        totalSaldos.forEach(function(element, myIndex) {
                            let groupIndex = totalSaldos.findIndex(x => (x.source == element.source) && (x.target == element.target));

                            if (groupIndex != myIndex){
                                totalSaldos[groupIndex].value += element.value; 
                                totalSaldos.splice(myIndex, 1); 
                            }
                            
                        });

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