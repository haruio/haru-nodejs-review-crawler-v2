/**
 * Created by syntaxfish on 15. 5. 28..
 */
var express = require('express');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var cors = require('cors');
var store = require('haru-nodejs-store');

var app = express();

store.connect(config.store);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cors());
app.use('/1/reviews', index);

module.exports = app;
