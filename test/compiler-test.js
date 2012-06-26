var assert = require('assert'),
    candor = require('../');

describe('Candor.js compiler', function() {
  function unit(name, src, context, dst) {
    it(name, function() {
      var result = candor.run(src, context);
      if (typeof dst === 'function') {
        assert.ok(dst(result));
      } else {
        assert.deepEqual(result, dst);
      }
    });
  }

  describe('basics', function() {
    unit('should compile number', 'return 13589', null, 13589);
    unit('should compile binop', 'return 13589 + 456', null, 14045);
    unit('should compile object', 'return ({ a: 1 }).a', null, 1);
    unit('should compile array', 'return ([1,2,3])[1]', null, 2);
    unit('should compile unop', 'a = 1\nreturn a++ + a', null, 3);
    unit('should compile unop', 'a = 1\nreturn ++a + a', null, 4);
  });

  describe('property accessor', function() {
    unit('should work with non-existing variables', 'return a', {}, undefined);
    unit('should work with existing properties', 'a = {b:1}\nreturn a.b',
         {}, 1);
    unit('should work with non-existing properties',
         'return a.b', {}, undefined);
  });

  describe('typeof', function() {
    unit('should work given nil', 'return typeof nil', null, 'nil');
    unit('should work given {}', 'return typeof {}', null, 'object');
    unit('should work given []', 'return typeof []', null, 'array');
    unit('should work given boolean', 'return typeof true', null, 'boolean');
    unit('should work given number', 'return typeof 1e3', null, 'number');
  });

  describe('sizeof', function() {
    unit('should work given nil', 'return sizeof nil', null, 0);
    unit('should work given {}', 'return sizeof {}', null, 0);
    unit('should work given boolean', 'return sizeof true', null, 0);
    unit('should work given [1,2,3]', 'return sizeof [1,2,3]', null, 3);
  });

  describe('keysof', function() {
    unit('should work given nil', 'return keysof nil', null, []);
    unit('should work given {a:1,b:2}', 'return keysof { a: 1, b: 2 }',
         null,
         function(result) {
      return Array.isArray(result) &&
             (result[0] === 'a' && result[1] === 'b' ||
              result[0] === 'b' && result[1] === 'a');
    });
    unit('should work given [1,2,3]', 'return keysof [1,2,3]', null, [0,1,2]);
  });

  describe('clone', function() {
    unit('should work given nil', 'return clone nil', null, undefined);
    unit('should work given {a:1,b:2}', 'return keysof clone {a:1,b:2}',
         null,
         function(result) {
      return Array.isArray(result) &&
             (result[0] === 'a' && result[1] === 'b' ||
              result[0] === 'b' && result[1] === 'a');
    });
    unit('should work given [1,2,3]', 'return clone [1,2,3]', null, undefined);
  });

  describe('control flow', function() {
    unit('should work with loop',
         'i = 0\nwhile(i < 10) { i++ }\nreturn i',
         null,
         10);
    unit('should work with if',
         'i = 0\nif (i < 10) { i = 10 } else { i = -1 }\nreturn i',
         null,
         10);
  });

  describe('functions', function() {
    unit('should work with anonymous', 'return ((a) { return a})(1)',
         null, 1);
    unit('should work with named', 'x(a) { return a}\nreturn x(1)',
         null, 1);
    unit('should work with colon call',
         'x(self, a) { return self.y + a }\n' +
         'b = { x: x, y: 1}\n' +
         'return b:x(1)',
         null, 2);
    unit('should work with vararg',
         'x(self, a...) { return a[0] + a[1] }\n' +
         'list = [1,2]\n' +
         'b = { x: x }\n' +
         'return b:x(list...) + x(nil, list...)',
         null, 6);
  });
});
