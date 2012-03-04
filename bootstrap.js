// This is a node.js file to bootstrap the compiler

var fs = require('fs');
var lexer = require('./lib/lexer');
var parser = require('./lib/parser');

var filename = __dirname + "/test.can";
var script = fs.readFileSync(filename, 'utf8');

lexer.lex(script, filename, function onToken(token) {
  console.log(token);
}, function onError(err) {
  console.error("There was an error lexing the source")
  throw err;
});