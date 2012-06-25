var util = require('util'),
    candor = require('../candor');

function Parser(source) {
  candor.lexer.call(this, source);

  this.error = null;
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
      // TODO: Implement me
      return;
    case '(':
      // TODO: Implement me
      return;
    default:
      return this.parseExpression();
  }

  return result;
});

//
// ### function parseExpression (priority)
// #### @priority {Number} **optional** (default: 0) minimal operation priority
// Parse expression at current position
//
Parser.prototype.parseExpression = rollback(function parseExpression(priority) {
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

//
// ### function parseObjectLiteral ()
// Parse primary expression at current position
//
Parser.prototype.parseObjectLiteral = rollback(function parseObjectLiteral() {
});
