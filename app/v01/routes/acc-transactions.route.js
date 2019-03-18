var express         = require('express'); 
var config  = require('../../config/config');

var accTransactionCtrl = require('../controllers/acc-transactions.controller');

var router = express.Router(); 

router.route('/')

    //.post(transactionCtrl.addTransaction)

    .get(accTransactionCtrl.getAccountTransactions) 

    .put(accTransactionCtrl.updateAccTransaction)

module.exports = router;