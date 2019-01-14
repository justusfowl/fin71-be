var express         = require('express'); 
var searchCtrl = require('../controllers/search.controller');
var userCtrl = require("../controllers/user.controller");
var authCtrl = require("../auth/auth.controller");
var VerifyToken = require('../auth/token-validate.controller');

var router = express.Router(); 


router.route('/search')

    .get(searchCtrl.searchUsers)

router.route('/profile/:userId')

    .get(userCtrl.getUserProfileBase)

router.route('/profile/avatar')

    .post(userCtrl.upsertProfileAvatar)

module.exports = router;