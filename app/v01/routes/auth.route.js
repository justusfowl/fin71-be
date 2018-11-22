var express         = require('express'); 
var authCtrl = require("../auth/auth.controller");

var router = express.Router(); 

router.route('/register')

    .post(authCtrl.registerUser)

module.exports = router;