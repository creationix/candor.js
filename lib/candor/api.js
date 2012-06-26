var candor = require('../candor');

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
  var vm = require('vm');
  return vm.runInNewContext(exports.translate(code), context);
};

//
// Allow require('filename.can')
//
if (require.extensions) {
  require.extensions['.can'] = function loadExtension(module, filename) {
    var fs = require('fs'),
        content = fs.readFileSync(filename).toString(),
        source = exports.translate(content);

    module._compile(source, filename);
  };
}
