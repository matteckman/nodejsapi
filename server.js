// NOTE: to start the server on prod or test, use this line:
// ENV=prod|test [PORT=????] forever start server.js
// ENV=test PORT=3001 forever start server.js

// BASE SETUP
// ====================
var express			= require('express'); 
var bodyParser 		= require('body-parser');
var mysql			= require('mysql');
var passport 		= require('passport'),
	TokenStrategy 	= require('passport-token').Strategy;
var crypto 			= require('crypto');
var async 			= require('async');
var nodemailer 		= require('nodemailer'),
	smtpTransport 	= require('nodemailer-smtp-transport');
var Q				= require('q');
var helmet			= require('helmet');
var caminte			= require('caminte'),
	Schema			= caminte.Schema;
//var multer		= require('multer');
//var cors 			= require('cors');

// GET VALUES PASSED VIA COMMAND LINE
// ====================
// dev 			-> ENV=dev [PORT=????] node server.js
// prod|test 	-> ENV=prod|test [PORT=????] forever start server.js
var ENV 	= process.env.ENV 	|| prod;
var PORT 	= process.env.PORT 	|| 3000;


// CREATE MAIN API OBJECT
// ====================
var kurbiapi	= express();


// ERROR HANDLING
// ====================
kurbiapi.on('uncaughtException', function (req, res, route, err) {
    console.log('uncaughtException', err.stack);
});


// CONFIGURATION
// ====================

// THIS IS API IS DEPRECATED!!!
// FOR STORAGE PURPOSES THE CONFIG FILES WERE MOVED INTO THE ROOT OF THE 
// APPLICATION!!! MOVE OUT BEFORE PUTTING BACK INTO PRODUCTION

// var connection 	= require('../kurbi_api_config/mysql.js')(mysql,ENV);
// require('../kurbi_api_config/passport.js')(passport,TokenStrategy,connection);
// var emlTransporter = require('../kurbi_api_config/nodemailer.js')(nodemailer,smtpTransport);

var connection 	= require('./config/mysql.js')(mysql,ENV);
require('./config/passport.js')(passport,TokenStrategy,connection);
var emlTransporter = require('./config/nodemailer.js')(nodemailer,smtpTransport);


// PRE-ROUTES MIDDLEWARE
// ====================
// bodyParser() will let us get the data from a POST
kurbiapi.use(bodyParser.urlencoded({ extended: true }));
kurbiapi.use(bodyParser.json());
// Cors
//kurbiapi.use(cors());
// passport initializing, can pass values if needed
kurbiapi.use(passport.initialize());
// helmet() sets headers according to security best practices
kurbiapi.use(helmet());


// ROUTES SETUP
// Doing basic roles-based content filtering here, as well as doing 
// basic versioning; api_v1 is technically a user's access to data, 
// not an app's access to data
// ====================
kurbiapi.get('/',function(req,res){
	res.status(200).send('Welcome to the Kurbi ' + ENV + ' API');
});

var api_v1 = express.Router();
require('./routes/v1routes.js')(api_v1,connection,crypto,passport,async,emlTransporter,Q,ENV); //multer

var devapi = express.Router();
require('./routes/devroutes.js')(devapi,connection,passport,async);

var api_v2 = express.Router();
require('./routes/v2routes/_index.js')(api_v2,connection,crypto,passport,async,emlTransporter,Q,ENV);

var api_v3 = express.Router();
require('./routes/v3routes/_index.js')(api_v2,connection,crypto,passport,async,emlTransporter,Q,ENV,Schema);

// ROUTES REGISTERED
// ====================
// all of the v1 routes must be prefixed with /v1 in the request
kurbiapi.use('/v1', api_v1);
// for using dev functionality
kurbiapi.use('/dev/',devapi);
// to make the api work with Restangular
kurbiapi.use('/v2/',api_v2);
// to make the api work with Caminte
kurbiapi.use('/v3/',api_v3);


// ERROR HANDLING MIDDLEWARE
// ==============================
kurbiapi.use(function(err,req,res,next){
	res.status(500);
	res.render('error', { error: err });
});


// START THE SERVER
// ====================
kurbiapi.listen(PORT);
console.log('Magic is now happening on port ' + PORT);