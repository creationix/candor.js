var util = require('util'),
    candor = require('../candor');

function Parser(source) {
  candor.lexer.call(this, source);

  this.error = null;
  this.negate = false;
};
util.inherits(Parser, candor.lexer);

exports.Parser = Parser;

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
    throw new Error(
      'Parser failed at: ' + this.error.offset + '\n' +
      this.error.message
    );
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
        tokens = this.tokens.slice();

    // Parse was successful - go forward
    if (cb.apply(this, arguments)) return true;

    // Rollback position
    this.source = source;
    this.offset = offset;
    this.tokens = tokens;

    return false;
  };
};

//
// ### function parseStatement ()
// #### @leaveTrail {Boolean} **optional** (default: false) leaves trailing cr
// Parse statement at current position
//
Parser.prototype.parseStatement = rollback(function parseStatement(leaveTrail) {
  if (leaveTrail === undefined) leaveTrail = false;

  this.trimCr();

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
          elseBody = this.parseBlock() || this.parseStatement(true);
        }

        if (!elseBody) return this.setError('Expected else\'s body');
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

  if (!leaveTrail) this.trimCr();

  return result;
});

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
      member = this.parsePrefixUnop(this.peek().type);
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

  var initial;
  do {
    initial = result;
    result = this.parseBinOp(result, priority);
  } while (initial != result);

  return result;
});

//
// ### function parseBlock ()
// Parse block at current position
//
Parser.prototype.parseBlock = rollback(function parseBlock() {
});

//
// ### function parseMember ()
// Parse member (a.b) at current position
//
Parser.prototype.parseMember = rollback(function parseMember() {
});

//
// ### function parsePrimary ()
// Parse primary expression at current position
//
Parser.prototype.parsePrimary = rollback(function parsePrimary() {
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
// #### @cb {Function} Continuation to wrap
// Change sign if needed and restore it after applying cb
//
Parser.prototype.negateWrap = function negateWrap(cb) {
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

  var expr = this.negateWrap(function() {
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
      matchedPriority = this.priorities[type];

  if (matchedPriority < priority) return;

  var rhs = this.negateWrap(function() {
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
});

//
// ### function parseArrayLiteral ()
// Parse array literal at current position
//
Parser.prototype.parseArrayLiteral = rollback(function parseArrayLiteral() {
});
