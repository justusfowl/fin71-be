var express         = require('express'); 
var config  = require('../../config/config');

var currencyCtrl = require('../controllers/currency.controller');
var authCtrl = require("../auth/auth.controller");
var VerifyToken = require('../auth/token-validate.controller');

var router = express.Router(); 


router.route('/')

    //.post(transactionCtrl.addTransaction)

    .get(currencyCtrl.convertAmountToEur)

router.route('/list')

    .get(currencyCtrl.listAvailableCurrencies)


module.exports = router;