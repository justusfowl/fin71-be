var express             = require('express'); 

var authRoutes          = require('./auth.route.js');
var transactionRoutes = require('./transactions.route.js');
var projectRoutes = require('./projects.route.js');
var typeRoutes = require('./types.route.js');
var userRoutes = require('./users.route.js');
var conversionRoutes = require('./conversion.route.js');

var router = express.Router();

//middleware verification of token
var VerifyToken = require('../auth/token-validate.controller');

router.use('/hb', function (req, res){
    res.json({"response": "healthy"})
});

router.use('/auth', authRoutes );
router.use('/projects', [VerifyToken.verifyToken, VerifyToken.successAuth], projectRoutes ); 
router.use('/transactions', [VerifyToken.verifyToken, VerifyToken.successAuth], transactionRoutes );
router.use('/types', [VerifyToken.verifyToken, VerifyToken.successAuth], typeRoutes)
router.use('/users', [VerifyToken.verifyToken, VerifyToken.successAuth], userRoutes)
router.use('/convert', [VerifyToken.verifyToken, VerifyToken.successAuth], conversionRoutes)

module.exports = router;