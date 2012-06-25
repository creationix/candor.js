var assert = require('assert'),
    candor = require('../');

describe('Candor.js parser', function() {
  it('should parse number', function() {
    var ast = candor.parser.parse('13589');

    assert.deepEqual(ast, [['number', 13589]]);
  });
});
