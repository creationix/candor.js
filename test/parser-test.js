var assert = require('assert'),
    candor = require('../');

describe('Candor.js parser', function() {
  function unit(name, src, dst) {
    it(name, function() {
      assert.deepEqual(candor.parser.parse(src), dst);
    });
  }

  unit('should parse number', '13589', [['number', 13589]]);

  unit('should parse binary operation', '123 + 456',
       [['binop','+',['number',123],['number',456]]]);

  unit('should parse complex binary operation', '123 + 456 / 2 - 3 + 4',
       [
         [ 'binop','+',
           [ 'number',123],
           [ 'binop','-',
             ['binop','/',['number',456],['number',2]],
             ['binop','-',['number',3],['number',4]]
           ]
         ]
       ]);

  unit('should parse multiple statements', '1\n2\n3',
       [['number',1],['number',2],['number',3]]);

  unit('should parse call', 'a.b(a,b,c)',
       [[ 'call',
          ['member',['name','a'],['name','b']],
          [['name','a'],['name','b'],['name','c']]
       ]]);

  unit('should parse colon call', 'a:b(a,b,c)',
       [[ 'call',
          ['member',['name','a'],['name','b']],
          [['self'], ['name','a'],['name','b'],['name','c']]
       ]]);

  unit('should parse func decl', 'a() {}',
       [['function',['name','a'],[],['block',[['nop']]]]]);

  unit('should parse object decl', 'a = { a: 1, 2: 2 }',
       [[ 'assign',
          ['name','a'],
          ['object', [
            [['name','a'],['number',1]],
            [['number',2],['number',2]]
          ]]
       ]]);
});
