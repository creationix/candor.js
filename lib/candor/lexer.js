function Lexer(source) {
  this.source = source;
  this.offset = 0;
  this.tokens = [];
};
exports.Lexer = Lexer;

//
// ### function create (source)
// #### @source {String}
// Create instance of lexer for given source
//
Lexer.create = function create(source) {
  return new Lexer(source);
};

Lexer.keywords = ('if:nil:NaN:else:true:false:clone:while:break:return:' +
                  'delete:typeof:sizeof:keysof:continue')
                      .split(/:/g)
                      .reduce(function (obj, keyword) {
  obj[keyword] = true;
  return obj;
}, {});

//
// ### function consume ()
// Consume one token from source (and change offset).
//
Lexer.prototype.consume = function consume() {
  this.trim();

  return this.match('cr', 0, /^[\r\n]+/) ||
         this.match('number', 0, /^\d+(\.\d+|e[+-]?\d+)?/, parseFloat) ||
         this.match('string', 0, /^'(?:[^'\\]|\\.)*'/, function(val) {
           function swap(quote) {
             return quote === '"' ? '\'' : '"';
           }
           val = val.replace(/["']/g, swap);
           return JSON.parse(val).replace(/["']/g, swap);
         }) ||
         this.match('string', 0, /^"(?:[^"\\]|\\.)*"/, function(val) {
           return JSON.parse(val);
         }) ||
         this.match('name', 0, /^[$_a-z][$_a-z0-9]*/i) ||
         this.match('punc', 0,
             /^(\.\.\.|===|!==|>>>|\+\+|--|==|>=|<=|!=|\|\||&&|<<|>>)/) ||
         this.match('punc', 0, /[\.,:\(\)\{\}\[\]\+\-\/*<>!&\|\^%=]/) ||
         {
           type: 'end',
           value: null,
           offset: this.offset
         };
};

//
// ### function match (type, index, re, sanitizer)
// #### @type {String} Token type
// #### @index {Number} Number of match in regexp to pick as value
// #### @re {RegExp} regexp itself
// #### @sanitizer {Function} (optional) preprocess value
// Tries to match current code against regexp and returns token on success
//
Lexer.prototype.match = function match(type, index, re, sanitizer) {
  var match = this.source.match(re);
  if (!match) return false;

  var offset = this.offset,
      value = match[index];

  this.source = this.source.slice(match[index].length);
  this.offset += match[index].length;

  if (sanitizer !== undefined) value = sanitizer(value);

  if (type === 'punc' || type === 'name' && Lexer.keywords[value]) {
    type = value;
  }

  return { type: type, value: value, offset: offset };
};

//
// ### function trim ()
// Remove whitespace at the start of source.
//
Lexer.prototype.trim = function trim() {
  var source = this.source;

  do {
    var len = source.length;
    source = source.replace(/^[^\S\r\n]+/, '');
    source = source.replace(/^\/\/[^\r\n]*/, '');
    source = source.replace(/^\/\*([^\\]|\\.)*?\*\//, '');
  } while (len != source.length);

  this.offset += this.source.length - source.length;
  this.source = source;
};

//
// ### function trimCr ()
// Skip all CR at the start of source
//
Lexer.prototype.trimCr = function trimCr() {
  while (this.peek().type === 'cr') this.skip();
};

//
// ### function peek ()
// Get peek token (without moving forward).
//
Lexer.prototype.peek = function peek() {
  var token;

  // If no tokens are in buffer - consume new one and put it in
  if (this.tokens.length === 0) {
    token = this.consume();
    this.tokens.push(token);
  } else {
    token = this.tokens[0];
  }

  return token;
};

//
// ### function skip ()
// Skip one token
//
Lexer.prototype.skip = function skip() {
  return this.expect();
};

//
// ### function expect (type, value)
// #### @type {String} **optional** expected type
// #### @value {String} **optional** expected value
// Pick peek() token and throw if it's type or value doesn't match given.
//
Lexer.prototype.expect = function expect(type, value) {
  var token = this.peek();

  if (type !== undefined && type !== token.type) {
    throw new TypeError(
      'Expected token (' + type + '), but found: ' +
      '(' + token.type + ')'
    );
  }

  if (value !== undefined && value !== token.value) {
    throw new TypeError(
      'Expected token (' + type + ',' + value + '), but found: ' +
      '(' + type + ',' + token.value + ')'
    );
  }

  // Remove token from buffer
  this.tokens.shift();

  return token;
};
