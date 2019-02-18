var express         = require('express'); 
var config  = require('../../config/config');

var analyzeCtrl = require('../controllers/analyze.controller');

var router = express.Router(); 


router.route('/transactions')

    .post(analyzeCtrl.getTransactionSums)

router.route('/transactions/:projectId')

    .post(analyzeCtrl.getTransactionSums)

module.exports = router;