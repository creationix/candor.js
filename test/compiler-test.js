var assert = require('assert'),
    candor = require('../');

describe('Candor.js compiler', function() {
  function unit(name, src, context, dst) {
    it(name, function() {
      assert.deepEqual(candor.run(src, context), dst);
    });
  }

  describe('basics', function() {
    unit('should compile number', '13589', null, 13589);
    unit('should compile binop', '13589 + 456', null, 14045);
    unit('should compile object', '({ a: 1 }).a', null, 1);
  });

  describe('property accessor', function() {
    unit('should work with non-existing variables', 'a', null, undefined);
    unit('should work with existing properties', 'a.b', {a:{b:1}}, 1);
    unit('should work with non-existing properties', 'a.b', null, undefined);
  });
});
