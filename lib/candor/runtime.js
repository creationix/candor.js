var $$runtime = {},
    global = this;

$$runtime.$typeof = function $typeof(obj) {
  if (obj === undefined) return 'nil';
  if (Array.isArray(obj)) return 'array';
  return typeof obj;
};

$$runtime.$keysof = function $keysof(obj) {
  if ($$runtime.$typeof(obj) !== 'array' &&
      $$runtime.$typeof(obj) !== 'object') {
    return [];
  }

  var keys = Object.keys(obj).filter(function(key) {
    return obj.hasOwnProperty(key);
  });

  if ($$runtime.$typeof(obj) === 'array') {
    keys = keys.map(function (key) {
      return parseFloat(key);
    });
  }

  return keys;
};

$$runtime.$sizeof = function $sizeof(obj) {
  if (typeof obj === 'string') return obj.length;
  if (Array.isArray(obj)) return obj.length;

  return 0;
};

$$runtime.$clone = function $clone(obj) {
  if ($$runtime.$typeof(obj) !== 'object') return;
  var result = {};

  Object.keys(obj).forEach(function(key) {
    if (obj.hasOwnProperty(key)) {
      this[key] = key;
    }
  }, result);

  return result;
};

$$runtime.$setProperty = function $setProperty(obj, key, value) {
  if ($$runtime.$typeof(obj) === 'object') {
    return obj[key] = value;
  } else if ($$runtime.$typeof(obj) === 'array' && key == parseFloat(key)) {
    return obj[key] = value;
  }
};

$$runtime.$getProperty = function $getProperty(obj, key) {
  if ($$runtime.$typeof(obj) === 'object') {
    return obj[key];
  } else if ($$runtime.$typeof(obj) === 'array' && key == parseFloat(key)) {
    return obj[key];
  }
};

$$runtime.$toBoolean = function $toBoolean(a) {
  switch ($$runtime.$typeof(a)) {
    case 'string': return $$runtime.$sizeof(a) > 0;
    case 'number': return a !== 0;
    case 'boolean': return a;
    case 'function':
    case 'array':
    case 'object':
      return true;
    case 'nil':
      return false;
    default: return false;
  }
};

$$runtime.$toNumber = function $toNumber(a) {
  var result = parseFloat(a);

  if (isNaN(result) || !isFinite(result)) {
    result = 0;
  }

  return result;
};

$$runtime.$toString = function $toString(a) {
  switch ($$runtime.$typeof(a)) {
    case 'string': return a;
    case 'number': return String(a);
    case 'boolean': return String(a);
    default: return '';
  }
}

$$runtime.$coerce = function $coerce(op, a, b) {
  var types = {
    a: $$runtime.$typeof(a),
    b: $$runtime.$typeof(b)
  };

  // Values have same type
  if (types.a === types.b) return { a: a, b: b };

  switch (types.a) {
    case 'string':
      return { a: a, b: $$runtime.$toString(b) };
    case 'boolean':
      return { a: a, b: Boolean(b) };
    case 'nil':
      var result = $coerce(op, b, a);
      return { a: result.b, b: result.a };
    case 'function':
    case 'object':
    case 'array':
      if ($$runtime.$math.$types[op] !== 'math' &&
          $$runtime.$math.$types[op] !== 'binary') {
        return { a: $$runtime.$toString(a), b: $$runtime.$toString(b) };
      }
      a = $$runtime.$toNumber(a);
    case 'number':
      b = $$runtime.$toNumber(b);
      return { a: a, b: b };
    default:
      return;
  }
};

$$runtime.$math = {
  $types: {
    '+': 'math', '-': 'math', '*': 'math', '/': 'math',
    '||': 'bool-logic', '&&': 'bool-logic', // not-used, handled by compiler
    '>': 'logic', '>=': 'logic', '<': 'logic', '<=': 'logic',
    '==': 'logic', '===': 'logic', '!=': 'logic', '!==': 'logic',
    '|': 'binary', '&': 'binary', '^': 'binary', '%': 'binary',
    '<<': 'binary', '>>': 'binary', '>>>': 'binary',
  },
  $subtypes: {
    '==': 'positive', '===': 'positive', '>=': 'positive', '<=': 'positive',
    '!=': 'negative', '!==': 'negative', '>': 'negative', '<': 'negative'
  },
  $equality: {
    '==': true, '===': true, '!=': true, '!==': true
  },
  $strictEquality: {
    '===': true, '!==': true
  },
  $compare: function $compare(op, a, b) {
    switch (op) {
      case '==': return a == b;
      case '===': return a === b;
      case '!=': return a != b;
      case '!==': return a !== b;
      case '>': return a > b;
      case '>=': return a >= b;
      case '<': return a < b;
      case '<=': return a <= b;
    }
  },
  $binary: function $binary(op, a, b) {
    var types = {
          a: $$runtime.$typeof(a),
          b: $$runtime.$typeof(b)
        },
        optype = this.$types[op],
        subtype = this.$subtypes[op];

    if (types.a === 'nil' && types.b === 'nil') {
      if (optype === 'math' || optype === 'binary') {
        // nil (+) nil = 0
        return 0;
      } else if (optype === 'logic') {
        // nil == nil = true
        // nil === nil = true
        // nil >= nil = true
        // nil <= nil = true
        // nil (+) nil = false
        return subtype === 'positive';
      }
    }

    if (optype === 'logic') {
      // nil == expr, expr == nil
      if (this.$strictEquality[op] ||
          (this.$equality[op] &&
           (types.a === 'nil' || types.b === 'nil'))) {
        return subtype === 'negative';
      }

      // Just any logic operation
      var coerced = $$runtime.$coerce(op, a, b);
      a = coerced.a;
      b = coerced.b;
      types.a = types.b = $$runtime.$typeof(a);

      return this.$compare(op, a, b);
    } else if (op === '+' && (types.a === 'string' || types.b === 'string')) {
      // String concatenation
      a = $$runtime.$toString(a);
      b = $$runtime.$toString(b);
      return a + b;
    } else {
      // Any other binary operation
      a = $$runtime.$toNumber(a);
      b = $$runtime.$toNumber(b);

      switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
        case '&': return a & b;
        case '|': return a | b;
        case '^': return a ^ b;
        case '%': return a % b;
        case '<<': return a << b;
        case '>>': return a >> b;
        case '>>>': return a >>> b;
      }
    }
  },
  $prefixUnop: function(op, host, property) {
    if (op === '++') {
      return host[property] = $$runtime.$toNumber(host[property]) + 1;
    } else {
      return host[property] = $$runtime.$toNumber(host[property]) - 1;
    }
  },
  $postfixUnop: function(op, host, property) {
    var old = host[property];
    if (op === '++') {
      host[property] = $$runtime.$toNumber(host[property]) + 1;
    } else {
      host[property] = $$runtime.$toNumber(host[property]) - 1;
    }
    return old;
  }
};

$$runtime.$markFunction = function $markFunction(fn) {
  fn.$$candor = true;
  return fn;
};

$$runtime.$call = function $call(fn, args, vararg) {
  if ($$runtime.$typeof(fn) !== 'function') return;

  return fn.apply(null, args.concat(vararg || []));
};

$$runtime.$colonCall = function $call(host, property, args, vararg) {
  var fn = host[property];
  if ($$runtime.$typeof(fn) !== 'function') return;

  // Do regular this.method() call
  if (!fn.$$candor) return host[property].apply(host, args);

  return fn.apply(null, [host].concat(args, vararg || []));
};

$$runtime.$jsCall = function $jsCall(fn, context) {
  if ($$runtime.$typeof(fn) !== 'function') return;
  return fn.apply(context, Array.prototype.slice.call(arguments, 2));
};

$$runtime.$jsApply = function $jsApply(fn, context, args) {
  if ($$runtime.$typeof(fn) !== 'function') return;
  return fn.apply(context, args);
};
