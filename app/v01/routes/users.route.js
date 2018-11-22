var express         = require('express'); 
var searchCtrl = require('../controllers/search.controller');
var authCtrl = require("../auth/auth.controller");
var VerifyToken = require('../auth/token-validate.controller');

var router = express.Router(); 


router.route('/search')

    .get(searchCtrl.searchUsers)

module.exports = router;