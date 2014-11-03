var express = require('express');
var bodyParser = require('body-parser');

var routes = require('./routes/');

var app = express();

var cors = require('cors');
var store = require('haru-nodejs-store');

var config = require('./config');

store.connect(config.store);


app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cors());


app.use('/1', routes);



module.exports = app;
