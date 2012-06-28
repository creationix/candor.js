var util = require('util'),
    candor = require('../candor');

function Parser(source) {
  candor.lexer.call(this, source);

  this.original = source;

  this.error = null;
  this.negate = false;
};
util.inherits(Parser, candor.lexer);

exports.Parser = Parser;

//
// ### function parse (source)
// #### @source {String} source code
// Execute parser and return AST of given source
//
Parser.parse = function parse(source) {
  return new Parser(source).execute();
};

//
// ### function execute ()
// Parse given source.
//
Parser.prototype.execute = function execute() {
  var stmt,
      result = [];

  while (stmt = this.parseStatement()) {
    result.push(stmt);
  }

  // We should reach the end of file
  // TODO: print out error with line number and offset
  if (this.peek().type !== 'end') {
    if (!this.error) throw new Error('Unexpected parser error!');

    var offset = 0,
        line = 1;

    this.original.split(/[\r\n]/g).some(function (chunk) {
      if (this.error.offset < offset + chunk.length + 1) {
        return true;
      }

      offset += chunk.length + 1;
      line++;

      return false;
    }, this);

    var err = new Error(
      'Parser failed at ' + line + ':' + (this.error.offset - offset) + '\n' +
      this.error.message
    );
    err.type = 'ParserError';
    err.line = line;
    err.offset = this.error.offset - offset;
    err.text = this.error.message;

    throw err;
  }

  return result;
};

//
// ### function setError (message)
// #### @message {String} error message
// Set last parser's error
//
Parser.prototype.setError = function setError(message) {
  if (this.error && this.error.offset > this.offset) return;

  this.error = {
    offset: this.offset,
    message: message
  };
};

//
// ### function rollback (cb)
// #### @cb {Function} parser command
// Helper function, internal
//
function rollback(cb) {
  return function() {
    var source = this.source,
        offset = this.offset,
        tokens = this.tokens.slice(),
        res;

    // Parse was successful - go forward
    if (res = cb.apply(this, arguments)) return res;

    // Rollback position
    this.source = source;
    this.offset = offset;
    this.tokens = tokens;
  };
};

//
// ### function parseStatement ()
// #### @leaveTrail {Boolean} **optional** (default: false) leaves trailing cr
// Parse statement at current position
//
Parser.prototype.parseStatement = function parseStatment(leaveTrail) {
  if (leaveTrail === undefined) leaveTrail = false;

  this.trimCr();

  var result = rollback(function() {
    switch (this.peek().type) {
      case 'return':
        this.skip();
        var expr = this.parseExpression();

        return expr && ['return', expr];
      case 'continue':
      case 'break':
        var token = this.skip();
        return [token.type];
        break;
      case 'if':
        this.skip();
        if (!this.peek().type === '(') {
          return this.setError('Expected "(" before if\'s condition');
        }
        this.skip();

        var cond = this.parseExpression();
        if (!cond) return this.setError('Expected if\'s condition');

        if (!this.peek().type === ')') {
          return this.setError('Expected ")" after if\'s condition');
        }
        this.skip();

        var body = this.parseBlock(),
            elseBody;

        if (!body) {
          body = this.parseStatement(true);
        } else {
          if (this.peek().type === 'else') {
            this.skip();
            elseBody = this.parseBlock() || this.parseStatement(true);

            if (!elseBody) return this.setError('Expected else\'s body');
          }
        }

        if (!body) return this.setError('Expected if\'s body');

        return elseBody ? ['if', cond, body, elseBody] : ['if', cond, body];
      case 'while':
        this.skip();
        if (this.peek().type !== '(') {
          return this.setError('Expected "(" before while\'s condition');
        }
        this.skip();

        var cond = this.parseExpression();
        if (!cond) return this.setError('Expected while\'s condition');

        if (this.peek().type !== ')') {
          return this.setError('Expected ")" after while\'s condition');
        }
        this.skip();

        var body = this.parseBlock();
        if (!body) return this.setError('Expected body after while\'s condition');

        return ['while', cond, body];
      case '{':
        return this.parseBlock();
      default:
        return this.parseExpression();
    }

    // Consume Cr or BraceClose
    if (this.peek().type !== 'end' && this.peek().type !== 'cr' &&
        this.peek().type !== '}') {
      return this.setError('Expected CR, EOF, or "}" after statement');
    }

    return result;
  }).call(this);

  if (!leaveTrail) this.trimCr();

  return result;
};

//
// ### function parseExpression (priority)
// #### @priority {Number} **optional** (default: 0) minimal operation priority
// Parse expression at current position
//
Parser.prototype.parseExpression = rollback(function parseExpression(priority) {
  var member,
      result;

  if (!priority) priority = 0;

  switch (this.peek().type) {
    case '++':
    case '--':
    case '!':
    case '+':
    case '-':
      member = this.parsePrefixUnOp(this.peek().type);
      break;
    case '{':
      member = this.parseObjectLiteral();
      break;
    case '[':
      member = this.parseArrayLiteral();
      break;
    case 'typeof':
    case 'sizeof':
    case 'keysof':
    case 'clone':
    case 'delete':
      var type = this.peek().type;
      this.skip();

      var expr = this.parseExpression(7);
      if (!expr) return this.setError('Expected body of prefix operation');

      member = [type, expr];
      break;
    default:
      member = this.parseMember();
      break;
  }

  switch (this.peek().type) {
    case '=':
      if (!member) return this.setError('Expected lhs before "="');
      this.skip();

      // lhs can be either `name` or `(mem).ber`
      if (member[0] !== 'name' && member[0] !== 'member') {
        return this.setError('Incorrect lhs!');
      }

      var value = this.parseExpression();
      if (!value) return this.setError('Expected rhs after "="');

      result = ['assign', member, value];
      break;
    default:
      result = member;
      break;
  }

  if (!result) return;

  var type = this.peek().type;
  switch (type) {
    case '++':
    case '--':
      this.skip();
      result = ['post-unop', type, result];
      break;
    case '...':
      this.skip();
      result = ['vararg', result];
      break;
    default:
      break;
  }

  var initial,
      tmp;
  do {
    initial = result;
    if (tmp = this.parseBinOp(result, priority)) {
      result = tmp;
    }
  } while (initial != result);

  return result;
});

//
// ### function parseBlock ()
// Parse block at current position
//
Parser.prototype.parseBlock = rollback(function parseBlock() {
  if (this.peek().type !== '{') return this.setError('Expected "{" (block)');
  this.skip();
  this.trimCr();

  var result = ['block', []];

  while (this.peek().type !== 'end' && this.peek().type !== '}') {
    var stmt = this.parseStatement();
    if (!stmt) return this.setError('Expected statement after "{"');

    result[1].push(stmt);
  }

  if (this.peek().type !== '}') return this.setError('Expected "}"');
  this.skip();

  return result;
});

//
// ### function parseMember ()
// Parse member (a.b) at current position
//
Parser.prototype.parseMember = rollback(function parseMember() {
  var result = this.parsePrimary(true),
      colonCall = false;

  while (this.peek().type !== 'end' && this.peek().type !== 'cr') {
    if (colonCall && this.peek().type !== '(') {
      return this.setError('Expected "(" after colon call');
    }

    // Parse function declaration or call
    if (this.peek().type === '(') {
      this.skip();

      var args = [];

      while (this.peek().type !== ')' && this.peek().type !== 'end') {
        var expr = this.parseExpression();
        if (!expr) return;

        args.push(expr);

        if (this.peek().type !== ',') break;

        this.skip();
        this.trimCr();
      }
      if (this.peek().type !== ')') {
        return this.setError('Failed to parse function\'s arguments, ' +
                             'expected ")"');
      }
      this.skip();

      var body = this.parseBlock();
      if (body) {
        if (colonCall) {
          return this.setError(
            'Function can\'t be declared with colon in name'
          );
        }

        if (result && result[0] !== 'name') {
          return this.setError('Function should have a correct name');
        }

        var seenVarArg = false,
            correctArgs = args.every(function(arg, i, args) {
              if (arg[0] === 'vararg') return i === args.length - 1;
              return arg[0] === 'name';
            });

        if (!correctArgs) {
          return this.setError('Incorrect arguments declaration');
        }

        return ['function', result || null, args, body[1]];
      } else {
        if (!result) {
          return this.setError('Call without name!');
        }

        var correctArgs = args.every(function(arg, i, args) {
          return arg[0] !== 'vararg' || i === args.length - 1;
        });

        if (!correctArgs) {
          return this.setError('Incorrect placement of var-arg');
        }

        return [colonCall ? 'colonCall' : 'call', result, args];
      }
    } else {
      // Parse "." or "["
      if (!result) return this.setError('Expected "." or "["');

      var next = undefined,
          token = this.peek();
      switch (token.type) {
        case ':':
          if (colonCall) {
            return this.setError('Nested colons in method invocation!');
          }
          colonCall = true;
        case '.':
          // a.b || a:b(args)
          this.skip();
          next = this.parsePrimary(false);
          if (next && next[0] !== 'name') {
            return this.setError('Expressions after "." ain\'t allowed');
          }
          next[0] = colonCall ? 'string' : 'property';
          break;
        case '[':
          // a["prop-expr"]
          this.skip();
          next = this.parseExpression();
          if (this.peek().type === ']') {
            this.skip();
          } else {
            next = null;
          }
          break;
        default:
          break;
      }

      if (!next) break;

      result = ['member', result, next];
    }
  }

  if (colonCall) {
    return this.setError('Expected "(" after colon call');
  }

  return result;
});

//
// ### function parsePrimary (noKeywords)
// #### @noKeywords {boolean} disallow keyword prefixes
// Parse primary expression at current position
//
Parser.prototype.parsePrimary = rollback(function parsePrimary(noKeywords) {
  var token = this.peek();

  switch (token.type) {
    case 'name':
    case 'number':
    case 'string':
      this.skip();
      return [token.type, token.value];
    case 'true':
    case 'false':
    case 'nil':
      this.skip();
      return [token.type];
    case '(':
      this.skip();
      var result = this.parseExpression();
      if (this.peek().type !== ')') {
        return this.setError('Expected closing paren for primary expression');
      } else {
        this.skip();
      }

      // Check if we haven't parsed function's declaration by occasion
      if (this.peek().type === '{') {
        return this.setError('Unexpected "{" after expression in parens');
      }
      return result;
    case 'return':
    case 'break':
    case 'continue':
    case 'clone':
    case 'typeof':
    case 'sizeof':
    case 'keysof':
      if (!noKeywords) return [token.type];
    default:
      return;
  }
});

Parser.priorities = {
  '||': 1, '&&': 1,
  '==': 2, '===': 2, '!=': 2, '!==': 2,
  '<': 3, '>': 3, '<=': 3, '>=': 3,
  '|': 4, '&': 4, '^': 4, '%': 4, '<<': 4, '>>': 4, '>>>': 4,
  '+': 5, '-': 5,
  '*': 6, '/': 6
};

//
// ### function negateType (type)
// #### @type {String} Operation type
// Negate sign if needed
//
Parser.prototype.negateType = function negateType(type) {
  if (!this.negate) return type;

  if (type === '+') return '-';
  if (type === '-') return '+';
  return type;
}

//
// ### function negateWrap (cb)
// #### @type {String} Current operation type
// #### @cb {Function} Continuation to wrap
// Change sign if needed and restore it after applying cb
//
Parser.prototype.negateWrap = function negateWrap(type, cb) {
  var previous = this.negate;

  if (!this.negate && type === '-') {
    this.negate = true;
  } else if (this.negate && type === '+') {
    this.negate = false;
  }

  var res = cb.call(this);

  this.negate = previous;

  return res;
}

//
// ### function parsePrefixUnOp ()
// Parse unop expression at current position
//
Parser.prototype.parsePrefixUnOp = rollback(function parsePrefixUnOp(type) {
  this.skip();

  var expr = this.negateWrap(type, function() {
    return this.parseExpression(7);
  });

  if (!expr) return this.setError('Expected expression after unary operation');

  return ['pre-unop', type, expr];
});

//
// ### function parseBinOp ()
// Parse binop expression at current position
//
Parser.prototype.parseBinOp = rollback(function parseBinOp(lhs, priority) {
  var type = this.peek().type,
      matchedPriority = Parser.priorities[type];

  this.skip();

  if (matchedPriority === undefined || matchedPriority < priority) return;

  var rhs = this.negateWrap(type, function() {
    return this.parseExpression(matchedPriority);
  });

  if (!rhs) return this.setError('Expected rhs for binary operation');

  return ['binop', this.negateType(type), lhs, rhs];
});

//
// ### function parseObjectLiteral ()
// Parse object literal at current position
//
Parser.prototype.parseObjectLiteral = rollback(function parseObjectLiteral() {
  // Skip '{'
  if (this.peek().type !== '{') return this.setError('Expected "{" (object)');
  this.skip();

  var result = ['object', []];
  while (this.peek().type !== '}' && this.peek().type !== 'end') {
    var key;
    this.trimCr();
    switch (this.peek().type) {
      case 'string':
      case 'name':
      case 'typeof':
      case 'sizeof':
      case 'keysof':
      case 'clone':
      case 'delete':
        key = ['property', this.peek().value];
        this.skip();
        break;
      case 'number':
        key = ['number', this.peek().value];
        this.skip();
        break;
      default:
        return this.setError(
          'Expected string or number as object literal\'s key'
        );
    }

    // Skip ':'
    if (this.peek().type !== ':') {
      return this.setError('Expected colon after object literal\'s key');
    }
    this.skip();

    // Parse expression
    var value = this.parseExpression();
    if (!value) return this.setError('Expected expression after colon');

    result[1].push([key, value]);

    // Skip ',' or exit loop on '}'
    if (this.peek().type === ',') {
      this.skip();
    } else {
      this.trimCr();
      if (this.peek().type !== '}') return this.setError('Expected "}" or ","');
    }
    this.trimCr();
  }

  // Skip '}'
  if (this.peek().type !== '}') return this.setError('Expected "}"');
  this.skip();

  return result;
});

//
// ### function parseArrayLiteral ()
// Parse array literal at current position
//
Parser.prototype.parseArrayLiteral = rollback(function parseArrayLiteral() {
  // Skip '['
  if (this.peek().type !== '[') return this.setError('Expected "["');
  this.skip();

  var result = ['array', []];
  while (this.peek().type !== ']' && this.peek().type !== 'end') {
    // Parse expression
    var value = this.parseExpression();
    if (!value) {
      return this.setError('Expected expression after array literal\'s start');
    }

    result[1].push(value);

    // Skip ',' or exit loop on ']'
    if (this.peek().type === ',') {
      this.skip();
    } else if (this.peek().type !== ']') {
      return this.setError('Expected "]" or ","');
    }
  }

  // Skip ']'
  if (this.peek().type !== ']') return this.setError('Expected "]"');
  this.skip();

  return result;
});
