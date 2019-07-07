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

    (async () => {

        let projectId = req.params.projectId;

        

        let qryStr = 
        'SELECT \
            sum(factorAmt) as sumTransactionAmt,  \
            payerUserName,  \
            payerUserId, \
            factorUserName,  \
            factorUserId, \
            transactionCategory \
        from ( \
        SELECT  \
            t.projectId,  \
            pu.userName AS payerUserName, \
            pu.userId AS payerUserId, \
            t.transactionId, \
            t.transactionCategory, \
            transactionAmt * factor AS factorAmt, \
            u.userName AS factorUserName, \
            u.userId AS factorUserId \
        FROM \
            fin71.tbltransactions AS t \
                INNER JOIN \
            fin71.tbltransactionportions AS f ON f.transactionId = t.transactionId \
                INNER JOIN \
            fin71.tblusers AS u ON f.userId = u.userId \
                INNER JOIN \
            fin71.tblusers AS pu ON t.transactionPayerUserId = pu.userId \
        WHERE \
            t.projectId = ? \
        ORDER BY t.transactionId DESC  \
        ) as a  \
        GROUP BY  \
        payerUserName,  \
        factorUserName, \
        transactionCategory';
                

        var qryOption = { raw: true, replacements: [projectId], type: models.sequelize.QueryTypes.SELECT}; 

        models.sequelize.query(
            qryStr,
            qryOption
        ).then(transactions => {

            let allUsers = [];
            
            transactions.forEach(element => {

                element.sumTransactionAmt = parseFloat(element.sumTransactionAmt);

                if (allUsers.findIndex(x => x.userId == element.payerUserId) == -1){
                    allUsers.push({
                        userId : element.payerUserId, 
                        userName : element.payerUserName
                    })
                }

                if (allUsers.findIndex(x => x.userId == element.factorUserId) == -1){
                    allUsers.push({
                        userId : element.factorUserId, 
                        userName : element.factorUserName
                    })
                }

            });
            
            let costItems = _.filter(transactions, (v) => v.transactionCategory == 1);
            

            var costItemsSumPaidBy =
                _(costItems)
                    .groupBy('payerUserId')
                    .map((objs, key) => ({
                        'payerUserId': key,
                        'sumTransactionAmt': _.sumBy(objs, 'sumTransactionAmt') }))
                    .value();

            var costItemsSumPaidFor =
                _(costItems)
                    .groupBy('factorUserId')
                    .map((objs, key) => ({
                        'factorUserId': key,
                        'sumTransactionAmt': _.sumBy(objs, 'sumTransactionAmt') }))
                    .value();
            
            let moneyTransferItems = _.filter(transactions, (v) => v.transactionCategory == 2);

            var moneyTransferItemsPaidBy =
            _(moneyTransferItems)
                .groupBy('payerUserId')
                .map((objs, key) => ({
                    'payerUserId': key,
                    'sumTransactionAmt': _.sumBy(objs, 'sumTransactionAmt') }))
                .value();

            var moneyTransferItemsPaidTo =
                _(moneyTransferItems)
                    .groupBy('factorUserId')
                    .map((objs, key) => ({
                        'factorUserId': key,
                        'sumTransactionAmt': _.sumBy(objs, 'sumTransactionAmt') }))
                    .value();

            function getItemInArray(arr, key,  userId){
                if (arr.findIndex(x => x[key] == userId) != -1){
                    return parseFloat(arr[arr.findIndex(x => x[key] == userId)]['sumTransactionAmt']);
                }else{
                    return 0; 
                }
            }
            
            allUsers.forEach(element => {

                // total amount other users have paid for this user

                let userCostPaidFor = getItemInArray(costItemsSumPaidFor, 'factorUserId', element.userId); 
                let userCostPaidBy = getItemInArray(costItemsSumPaidBy, 'payerUserId', element.userId);

                let userAmtTransferedFrom = getItemInArray(moneyTransferItemsPaidTo, 'factorUserId', element.userId);
                let userAmtTransferedTo = getItemInArray(moneyTransferItemsPaidBy, 'payerUserId', element.userId); 


                element.costNet =  userCostPaidFor - userCostPaidBy
                element.transferNet = userAmtTransferedTo - userAmtTransferedFrom
                
                element.totalNet = element.costNet + element.transferNet

            });


            // create 'from->to value pairs' for the sankey chart 
            // TODO: create the value-> source pairs DOES NOT WORK YET
            
            let values = [];

            class SankeyObject {
                constructor(options) {
                  this.value = options.value || 0;
                  this.source = options.source || "";
                  this.target = options.target || "";
                }

                isComplete(){

                    if (this.value != 0 && this.source != "" && this.target != ""){
                        return true
                    }else{

                    }

                }
              }

            allObjTargets = _.filter(allUsers, item => item.totalNet >= 0 );
            allObjSources = _.filter(allUsers, item => item.totalNet < 0 );

            allObjTargets.forEach(element => {

                let obj = new SankeyObject({
                    value : Math.abs(element.totalNet), 
                    target: element.userName
                })

                values.push(obj);

            });

            allObjSources.forEach(element => {

                let sumPayable = Math.abs(element.totalNet); 
                
                values.forEach(obj => {
                    
                    if (!obj.isComplete()){

                        if (obj.value > sumPayable){


                            let newObj = new SankeyObject({
                                target: obj.target, 
                                value : obj.value-sumPayable
                            })

                            obj.value = sumPayable; 
                            obj.source = element.userName; 

                            if (newObj.value > 0.01){
                                values.push(newObj)
                            }

                        }else{
                            obj.source = element.userName;
                            sumPayable = sumPayable-obj.value;
                        }
                    }
                });

            });

            

            res.json({t: transactions, o: allUsers, pSaldo: values});

        }).catch(err => {
            config.handleError("getSaldo", res, err)
        });

    })();

}


function getSaldoOld(req, res){
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
                    t.transactionCategory, \
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
                        var fundTransferAnalysis = {}; 
                        var totalAmountEur = 0;

                        // get a user map object with all users of that project
                        // each user can have spent transactions

                        transactions.forEach(function(x) {

                            totalAmountEur += parseFloat(x.factorAmt);

                            if (!userMap[x.factorUserName]){
                                userMap[x.factorUserName] = {
                                    t : [], 
                                    fundTransfer : []
                                }; 
                            }

                            if (!userMap[x.payerUserName]){
                                userMap[x.payerUserName] = {
                                    t : [], 
                                    fundTransfer : []
                                }; 
                            }
                            
                        });

                        // dedicate each project transaction to the user who carries the cost
                        // and indicate who paid for the transaction amount
                        transactions.forEach(function(x) {

                            let tmpObj = {
                                "transactionAmt" : parseFloat(x.factorAmt),
                                "payerUserName" : x.payerUserName, 
                                "transactionCategory" : x.transactionCategory
                            }

                            if (x.transactionCategory == 1){
                                userMap[x.factorUserName].t.push(tmpObj);
                            }else if(x.transactionCategory == 2){
                                userMap[x.factorUserName].fundTransfer.push(tmpObj);
                            }
                            

                        });

                        const users = Object.keys(userMap);

                        

                        // get the total cost incured per user

                        for (const u of users) {
                            let userTransactions = userMap[u].t;

                            // aggregate transaction payments be user paying them for the 'u' element
                                
                            userMap[u]["tSaldo"] = _(userTransactions)
                            .groupBy('payerUserName')
                            .map((objs, key) => ({
                                'payerUserName': key,
                                'transactionCategory' : 1,
                                'sumTransactionAmt': _.sumBy(objs, 'transactionAmt') }))
                            .value();

                            // aggregate fund transfers that have been paid by 'u' element
                            userMap[u]["transferFundSaldo"] = _( userMap[u].fundTransfer)
                                .groupBy('payerUserName')
                                .map((objs, key) => ({
                                    'payerUserName': key,
                                    'transactionCategory' : 2,
                                    'sumTransactionAmt': _.sumBy(objs, 'transactionAmt') }))
                                .value();

                            tAnalysis[u] = userMap[u]["tSaldo"];
                            fundTransferAnalysis[u] = userMap[u]["transferFundSaldo"];

                            userMap[u]["transferFundSaldo"].forEach(element => {
                                userMap[u]["tSaldo"].push(element)
                            });
                        }

                        let totalSaldos = [];
                        let pairsNetted = []; 

                        let handleSaldoElementCheck = function (uA, uB){

                            // Disregards payments done for myself
                            if (uB != uA){
                                
                                // TRANSACTIONS AREA

                                // find amount that user B (uB) has paid for user A (uA)
                                let index_uB_hasPaidFor_uA = userMap[uA].tSaldo.findIndex(x => ((x.payerUserName == uB) && x.transactionCategory == 1)); // parseFloat(payerUserElement.sumTransactionAmt); 

                                let transactionAmt_uB_hasPaidFor_uA = 0; 

                                if (index_uB_hasPaidFor_uA != -1){
                                    transactionAmt_uB_hasPaidFor_uA = parseFloat(userMap[uA].tSaldo[index_uB_hasPaidFor_uA].sumTransactionAmt); 
                                }


                                // find if uA has made payments for payerUserName as well
                                let index_uA_hasPaidFor_uB = userMap[uB].tSaldo.findIndex(x => ((x.payerUserName == uA) && x.transactionCategory == 1));

                                let transactionAmt_uA_hasPaidFor_uB = 0;

                                if (index_uA_hasPaidFor_uB != -1){
                                    transactionAmt_uA_hasPaidFor_uB = parseFloat(userMap[uB].tSaldo[index_uA_hasPaidFor_uB].sumTransactionAmt);
                                }

                                // END TRANSACTIONS AREA 

                                // MONEY TRANSFER AREA 

                                // find if uA has transfered money to uB 

                                let index_uA_hasTransferedTo_uB = userMap[uB].tSaldo.findIndex(x => ((x.payerUserName == uA) && x.transactionCategory == 2));
                                
                                let transactionAmt_uA_hasTransferedTo_uB = 0;

                                if (index_uA_hasTransferedTo_uB != -1){
                                    transactionAmt_uA_hasTransferedTo_uB = parseFloat(userMap[uB].tSaldo[index_uA_hasTransferedTo_uB].sumTransactionAmt);
                                }


                                // find if payerUserName has transfered money to uA

                                let index_uB_hasTransferedTo_uA = userMap[uA].transferFundSaldo.findIndex(x => ((x.payerUserName == uB) && x.transactionCategory == 2));
                                
                                let transactionAmt_uB_hasTransferedTo_uA = 0;

                                if (index_uB_hasTransferedTo_uA != -1){
                                    transactionAmt_uB_hasTransferedTo_uA = parseFloat(userMap[uA].tSaldo[index_uB_hasTransferedTo_uA].sumTransactionAmt);
                                }

                                // END MONEY TRANSFER AREA 

                                let partNet_uB = transactionAmt_uB_hasPaidFor_uA + transactionAmt_uA_hasTransferedTo_uB; 
                                let partNet_uA = transactionAmt_uA_hasPaidFor_uB + transactionAmt_uB_hasTransferedTo_uA; 

                                let delta =  partNet_uB - partNet_uA;  

                                let saldoItm  = { "value" : Math.abs(delta) }

                                if (delta < 0){
                                    saldoItm["source"] = uA; 
                                    saldoItm["target"] = uB
                                }else{
                                    saldoItm["source"] = uB; 
                                    saldoItm["target"] = uA; 
                                }

                                if (saldoItm.value > 0){
                                    totalSaldos.push(saldoItm);
                                }

                                /*

                                // create a reference object as 'saldoPair' to indicate 
                                // that the two users have been compared 
                                // use an alphabetical order to ensure unqiqueness of saldopairs
                                let tmpArray = [uA, payerUserElement.payerUserName]; 
                                let tmpArraySorted = tmpArray.sort((a, b) => a.localeCompare(b));

                                let saldoPair = {
                                    "a" : tmpArraySorted[0], 
                                    "b" : tmpArraySorted[1]
                                }
                                /*
                                if (pairsNetted.findIndex(x => (x.a == saldoItm.source && x.b == saldoItm.target)) == -1 &&
                                pairsNetted.findIndex(x => (x.b == saldoItm.source && x.a == saldoItm.target)) == -1){
                                    pairsNetted.push(saldoPair); 

                                    // if saldo = 0 not necessary to indclude 
                                    if (saldoItm.value > 0){
                                        totalSaldos.push(saldoItm);
                                    }
                                    
                                }
                                */

                            }
                            
                        };

                        // go through all users and their costs which have been incurred by other people
                        for (const uA of users) {

                            for (const uB of users){

                                if (uA != uB){
                                    let tmpArray = [uA, uB]; 
                                    let tmpArraySorted = tmpArray.sort((a, b) => a.localeCompare(b));
    
                                    let saldoPair = {
                                        "a" : tmpArraySorted[0], 
                                        "b" : tmpArraySorted[1]
                                    }
    
                                    if (pairsNetted.findIndex(x => (x.a == saldoPair.a && x.b == saldoPair.b)) == -1 ){
                                        pairsNetted.push(saldoPair)
                                    }
                                }
                               

                            }                            

                        }


                        pairsNetted.forEach(compareElement => {

                            handleSaldoElementCheck(compareElement.a, compareElement.b)
                            
                        });
                       


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
                            "fundTransferAnalysis" : fundTransferAnalysis,
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