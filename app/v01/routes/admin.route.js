var express         = require('express'); 
var config  = require('../../config/config');

var accTransactionCtrl = require('../controllers/acc-transactions.controller');

var router = express.Router(); 

router.route('/accT')

    //.post(transactionCtrl.addTransaction)

    .post(accTransactionCtrl.postAccTransactionArray)

module.exports = router;