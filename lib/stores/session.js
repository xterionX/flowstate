const uid = require('uid-safe').sync;
const clone = require('clone');

const ExpiredStateError = require('../errors/expiredstateerror');

function SessionStore(options) {
  options = options || {};
  
  this._key = options.key || 'state';
}

SessionStore.prototype.all = function(req, cb) {
  let key = this._key;
  if (!req.session || !req.session[key]) {
    return cb();
  }
  
  let obj = req.session[key];
  let arr = []
    , handles = Object.keys(obj)
    , state, h, i, len;
  for (i = 0, len = handles.length; i < len; ++i) {
    h = handles[i];
    state = clone(req.session[key][h]);
    state.handle = h;
    arr.push(state);
  }
  
  return cb(null, arr);
}

SessionStore.prototype.load = function(req, h, options, cb) {
  if (typeof options == 'function') {
    cb = options;
    options = undefined;
  }
  options = options || {};
  
  let key = this._key;
  if (!req.session || !req.session[key] || !req.session[key][h]) {
    return cb();
  }

  let state = clone(req.session[key][h]);
  state.handle = h;

  if (state.expired) {
    this.destroy(req, h, function(){});
    return cb(new ExpiredStateError('login process has timed out, please try again', state));
  } else if (options.destroy === true) {
    this.destroy(req, h, function(){});
    return cb(null, state);
  } else {
    return cb(null, state);
  }
}

SessionStore.prototype.save = function(req, state, options, cb) {
  if (typeof options == 'function') {
    cb = options;
    options = undefined;
  }
  options = options || {};
  
  state.initiatedAt = state.initiatedAt || Date.now();
  
  let key = this._key;
  let h = options.h || uid(8);
  req.session[key] = req.session[key] || {};
  req.session[key][h] = clone(state);
  
  return cb(null, h);
}

SessionStore.prototype.update = function(req, h, state, cb) {
  if (state.handle === h) { delete state.handle; }
  
  let key = this._key;
  req.session[key] = req.session[key] || {};
  req.session[key][h] = clone(state);
  
  return cb(null, h);
}

SessionStore.prototype.destroy = function(req, h, cb) {
  let key = this._key;
  if (!req.session || !req.session[key] || !req.session[key][h]) {
    return cb();
  }
  
  delete req.session[key][h];
  if (Object.keys(req.session[key]).length == 0) {
    delete req.session[key];
  }
  return cb();
}

SessionStore.prototype.expire = function(req, h, cb) {
  let key = this._key;
  if (!req.session || !req.session[key] || !req.session[key][h]) {
    return cb();
  }

  req.session[key][h].expired = true;
  return cb();
}


module.exports = SessionStore;
