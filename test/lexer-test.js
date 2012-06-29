var assert = require('assert'),
    candor = require('../');

describe('Candor.js lexer', function() {
  it('should emit number', function() {
    var lexer = candor.lexer.create('13589');

    assert.equal(lexer.peek().type, 'number');
    assert.equal(lexer.peek().value, 13589);
    assert.doesNotThrow(function() {
      lexer.expect('number');
    });
    assert.throws(function() {
      lexer.expect('anything');
    });
    assert.doesNotThrow(function() {
      lexer.expect('end');
    });
  });

  it('should emit floating number', function() {
    var lexer = candor.lexer.create('123.456');

    lexer.expect('number', 123.456);
    lexer.expect('end');
  });

  it('should emit string', function() {
    var lexer = candor.lexer.create('"123" \'456\' "123\\"456"');

    lexer.expect('string', '123');
    lexer.expect('string', '456');
    lexer.expect('string', '123"456');
    lexer.expect('end');
  });

  it('should emit name', function() {
    var lexer = candor.lexer.create('abc');

    lexer.expect('name', 'abc');
    lexer.expect('end');
  });

  it('should emit keyword', function() {
    var lexer = candor.lexer.create('clone');

    lexer.expect('clone', 'clone');
    lexer.expect('end');
  });

  it('should emit punctuation', function() {
    var lexer = candor.lexer.create('... : /');

    lexer.expect('...');
    lexer.expect(':');
    lexer.expect('/');
    lexer.expect('end');
  });

  it('should skip comments', function() {
    var lexer = candor.lexer.create('// 123\n /* abc */abc/* bcd \\*/ *///123');

    lexer.expect('cr');
    lexer.expect('name', 'abc');
    lexer.expect('end');
  });
});
