var express         = require('express'); 
var config  = require('../../config/config');

var typesCtrl = require('../controllers/types.controller');
var authCtrl = require("../auth/auth.controller");
var VerifyToken = require('../auth/token-validate.controller');

var router = express.Router(); 

router.route('/')

    .post(typesCtrl.saveType)

    .get(typesCtrl.getTypes)

router.route('/:typeId')

    .delete(typesCtrl.deleteType)

module.exports = router;