var express         = require('express'); 
var config  = require('../../config/config');

var projectsCtrl = require('../controllers/projects.controller');
var typesCtrl = require('../controllers/types.controller');
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

    .get(projectsCtrl.getProjects)

router.route('/:projectId/transaction')

    .post(transactionCtrl.saveTransaction)

    .get(transactionCtrl.getProjectTransactions)

router.route('/:projectId/transaction/:transactionId')

    .delete(transactionCtrl.deleteTransaction)


router.route("/projectTypes/:projectId")

    .get(typesCtrl.getProjectTypes)

router.route("/projectTypes/:projectId/:typeId")

    .post(typesCtrl.addProjectType)

    .delete(typesCtrl.removeProjectType)



router.route('/:projectId/analysis/saldo')

    .get(analyzeCtrl.getSaldo)




module.exports = router;