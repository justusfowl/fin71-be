var express         = require('express'); 
var config  = require('../../config/config');

var projectsCtrl = require('../controllers/projects.controller');
var transactionCtrl = require('../controllers/transactions.controller');
var analyzeCtrl = require('../controllers/analyze.controller');
var authCtrl = require("../auth/auth.controller");
var VerifyToken = require('../auth/token-validate.controller');

var router = express.Router(); 


router.route('/')

    .get(projectsCtrl.getProjects)

    .post(projectsCtrl.saveProject)

router.route('/:projectId')

    .delete(projectsCtrl.deleteProject)

router.route('/:projectId/transaction')

    .post(transactionCtrl.saveTransaction)

    .get(transactionCtrl.getProjectTransactions)

router.route('/:projectId/transaction/:transactionId')

    .delete(transactionCtrl.deleteTransaction)


router.route('/:projectId/analysis/saldo')

    .get(analyzeCtrl.getSaldo)


router.route('/:projectId/analysis/typeTotals')

    .get(analyzeCtrl.getTypeTotals)

module.exports = router;