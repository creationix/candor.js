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

$$runtime.$call = function $call(fn, args) {
  if ($$runtime.$typeof(fn) !== 'function') return;

  return fn.apply(null, args);
};

$$runtime.$jsCall = function $jsCall(fn, context) {
  if ($$runtime.$typeof(fn) !== 'function') return;
  return fn.apply(context, Array.prototype.slice.call(arguments, 2));
};

$$runtime.$jsApply = function $jsApply(fn, context, args) {
  if ($$runtime.$typeof(fn) !== 'function') return;
  return fn.apply(context, args);
};
