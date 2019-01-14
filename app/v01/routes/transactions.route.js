var express         = require('express'); 
var config  = require('../../config/config');

var transactionCtrl = require('../controllers/transactions.controller');
var authCtrl = require("../auth/auth.controller");
var VerifyToken = require('../auth/token-validate.controller');

var router = express.Router(); 


router.route('/')

    //.post(transactionCtrl.addTransaction)

    .get(transactionCtrl.getProjectTransactions)

router.route('/:projectId')

    .get(transactionCtrl.getProjectTransactions)

router.route('/:transactionId')

    .delete(transactionCtrl.deleteTransaction)

module.exports = router;