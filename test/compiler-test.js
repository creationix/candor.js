var assert = require('assert'),
    candor = require('../');

describe('Candor.js compiler', function() {
  function unit(name, src, context, dst) {
    it(name, function() {
      assert.deepEqual(candor.run(src, context), dst);
    });
  }

  describe('basics', function() {
    unit('should compile number', 'return 13589', null, 13589);
    unit('should compile binop', 'return 13589 + 456', null, 14045);
    unit('should compile object', 'return ({ a: 1 }).a', null, 1);
    unit('should compile array', 'return ([1,2,3])[1]', null, 2);
  });

  describe('property accessor', function() {
    unit('should work with non-existing variables', 'return a', {}, undefined);
    unit('should work with existing properties', 'return a.b', {a:{b:1}}, 1);
    unit('should work with non-existing properties',
         'return a.b', {}, undefined);
  });
});
