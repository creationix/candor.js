var fs = require('fs'),
    vm = require('vm'),
    candor = require('../candor');

//
// ### function translate (source, options)
// #### @source {String} Source code
// #### @options {Object} **optional** Compiler options
// Compile Candor code to Javascript
//
exports.translate = function translate(source, options) {
  return candor.compiler.compile(candor.parser.parse(source), options);
};

//
// ### function run (code, context)
// #### @code {String} Source code
// #### @context {Object} **optional** context
// Compile and run Candor code in separate javascript context
//
exports.run = function run(code, context) {
  return vm.runInNewContext(exports.translate(code), context);
};

//
// Allow require('filename.can')
//
require.extensions['.can'] = function loadExtension(module, filename) {
  var content = fs.readFileSync(filename).toString(),
      source = exports.translate(content);

  module._compile(source, filename);
};
