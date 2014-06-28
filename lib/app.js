var express = require('express');
var session = require('express-session');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var stylus = require('stylus');
var nib = require('nib');
var environment = require('./settings');
var models = require('./models');
var routes = require('./routes');
var organizations = require('./routes/organizations');
var oauth = require('./routes/oauth');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// auth setup
passport.use(new LocalStrategy(models.Organization.verify));
passport.serializeUser(models.Organization.serializeUser);
passport.deserializeUser(models.Organization.deserializeUser);

// middleware
app.use(favicon( path.join(__dirname, '/public/images/merlynne.png')));
app.use(logger('dev'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(session({secret: 'Belgian waffles'}));
app.use(passport.initialize());
app.use(passport.session());
app.use(stylus.middleware({
  src: path.join(__dirname, '/public'),
  compile: function(str, path){
  	console.log('Compiling stylus...');
    return stylus(str)
      .set('filename', path)
      .set('compress', false)
      .use(nib());
  }
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/', oauth)
app.use('/organizations', organizations);

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

environment.apply(app);
module.exports = app;