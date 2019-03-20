var express         = require('express'); 
var config  = require('../../config/config');

var accTransactionCtrl = require('../controllers/acc-transactions.controller');

var router = express.Router(); 

router.route('/')

    .get(accTransactionCtrl.getAccountTransactions) 

    .put(accTransactionCtrl.updateAccTransaction)

router.route('/findExpense')

    .post(accTransactionCtrl.findExistingExpenseForAccTLink) 

module.exports = router;