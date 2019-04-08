var express             = require('express'); 
var apiAuth = require('../auth/admin-api-validate.controller')
var config      = require('../../config/config');

var authRoutes          = require('./auth.route.js');
var adminRoutes = require('./admin.route.js');
var transactionRoutes = require('./transactions.route.js');
var accTransactionRoutes = require('./acc-transactions.route.js');
var projectRoutes = require('./projects.route.js');
var typeRoutes = require('./types.route.js');
var userRoutes = require('./users.route.js');
var conversionRoutes = require('./conversion.route.js');
var analysisRoutes = require('./analysis.route.js');

var router = express.Router();

//middleware verification of token
var VerifyToken = require('../auth/token-validate.controller');

router.use('/hb', function (req, res){
    res.json({"response": "healthy", "version" : config.APIVersion})
});

router.use('/auth', authRoutes );

router.use('/admin', [apiAuth.validateApiSecret], adminRoutes)

router.use('/projects', [VerifyToken.verifyToken,  VerifyToken.errorAuth, VerifyToken.successAuth], projectRoutes ); 
router.use('/transactions', [VerifyToken.verifyToken,  VerifyToken.errorAuth, VerifyToken.successAuth], transactionRoutes );
router.use('/accTransactions', [VerifyToken.verifyToken,  VerifyToken.errorAuth, VerifyToken.successAuth], accTransactionRoutes);
router.use('/types', [VerifyToken.verifyToken,  VerifyToken.errorAuth, VerifyToken.successAuth], typeRoutes)
router.use('/users', [VerifyToken.verifyToken,  VerifyToken.errorAuth, VerifyToken.successAuth], userRoutes)
router.use('/convert', [VerifyToken.verifyToken,  VerifyToken.errorAuth, VerifyToken.successAuth], conversionRoutes)
router.use('/analysis', [VerifyToken.verifyToken,  VerifyToken.errorAuth, VerifyToken.successAuth], analysisRoutes)

module.exports = router;