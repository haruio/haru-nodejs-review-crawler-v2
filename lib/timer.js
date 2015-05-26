/**
 * Created by syntaxfish on 14. 12. 26..
 */

var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitters;


function Timer(options) {
    this.options = options || {};
};

