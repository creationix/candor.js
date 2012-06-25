var util = require('util'),
    uglify = require('uglify-js');

function Compiler(ast) {
  this.ast = ast;
};
exports.Compiler = Compiler;

//
// ### function compile (ast, options)
// #### @ast {Array} Candor AST
// #### @options {Object} **optional** options for uglify
// Compile AST into javascript code.
//
Compiler.compile = function compile(ast, options) {
  return new Compiler(ast).execute(options);
};

//
// ### function translate ()
// Translates candor's AST to uglify's AST
//
Compiler.prototype.translate = function translate() {
  function traverse(node) {
    if (!Array.isArray(node)) {
      throw new TypeError('Incorrect AST node: ' + util.inspect(node));
    }

    switch (node[0]) {
      case 'number':
        return ['num', node[1]];
      case 'string':
        return node;
      case 'name':
        // Handle non-object (non-existent) access
        return node;
      case 'true':
      case 'false':
        return ['name', node[0]];
      case 'nil':
        return ['name', 'undefined'];
      case 'break':
      case 'continue':
        return [node[0], undefined];
      case 'if':
      case 'while':
        return [node[0]].concat(node.slice(1).map(function(node) {
          if (!node) return;
          return traverse(node);
        }));
      case 'block':
        return ['block'].concat(node.slice(1).map(traverse));
      case 'pre-unop':
        return ['unary-prefix', node[1], travese(node[2])];
      case 'post-unop':
        return ['unary-postfix', node[1], travese(node[2])];
      case 'binop':
        return ['binary', node[1], traverse(node[2]), traverse(node[3])];
      case 'assign':
        return ['assign', true, traverse(node[1]), traverse(node[2])];
      case 'member':
        return [
          'dot',
          traverse(node[1]),
          node[2][0] === 'name' ? node[2][1] : traverse(node[2])
        ];
      case 'call':
        // TODO: Handle self and vararg
        return ['call', traverse(node[1]), node[2].map(traverse)];
      case 'function':
        // TODO: Handle vararg
        return [
          'defun',
          node[1] === null ? node[1] : node[1][1],
          node[2].map(function(node) {
            return node[1];
          }),
          node[3].map(traverse)
        ];
      case 'object':
        // TODO: Implement me!
        throw new Error('Not implemented');
      case 'array':
        // TODO: Implement me!
        throw new Error('Not implemented');
      case 'typeof':
      case 'keysof':
      case 'sizeof':
      case 'clone':
        // TODO: Implement me!
        throw new Error('Not implemented');
      case 'delete':
        return ['unary-prefix', 'delete', traverse(node[1])];
    }
  }

  return ['toplevel', this.ast.map(traverse)];
};

//
// ### function execute ()
// Translates AST to the javascript code
//
Compiler.prototype.execute = function execute(options) {
  return uglify.uglify.gen_code(this.translate(), options);
};
