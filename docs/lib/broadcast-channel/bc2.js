(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _util = require("./util.js");

var _methodChooser = require("./method-chooser.js");

var _options = require("./options.js");

var BroadcastChannel = function BroadcastChannel(name, options) {
  this.name = name;
  this.options = (0, _options.fillOptionsWithDefaults)(options);
  this.method = (0, _methodChooser.chooseMethod)(this.options); // isListening

  this._iL = false;
  /**
   * _onMessageListener
   * setting onmessage twice,
   * will overwrite the first listener
   */

  this._onML = null;
  /**
   * _addEventListeners
   */

  this._addEL = {
    message: [],
    internal: []
  };
  /**
   * _beforeClose
   * array of promises that will be awaited
   * before the channel is closed
   */

  this._befC = [];
  /**
   * _preparePromise
   */

  this._prepP = null;

  _prepareChannel(this);
}; // STATICS

/**
 * used to identify if someone overwrites
 * window.BroadcastChannel with this
 * See methods/native.js
 */


BroadcastChannel._pubkey = true;
/**
 * clears the tmp-folder if is node
 * @return {Promise<boolean>} true if has run, false if not node
 */

BroadcastChannel.clearNodeFolder = function (options) {
  options = (0, _options.fillOptionsWithDefaults)(options);
  var method = (0, _methodChooser.chooseMethod)(options);

  if (method.type === 'node') {
    return method.clearNodeFolder().then(function () {
      return true;
    });
  } else {
    return Promise.resolve(false);
  }
}; // PROTOTYPE


BroadcastChannel.prototype = {
  postMessage: function postMessage(msg) {
    if (this.closed) {
      throw new Error('BroadcastChannel.postMessage(): ' + 'Cannot post message after channel has closed');
    }

    return _post(this, 'message', msg);
  },
  postInternal: function postInternal(msg) {
    return _post(this, 'internal', msg);
  },

  set onmessage(fn) {
    var time = this.method.microSeconds();
    var listenObj = {
      time: time,
      fn: fn
    };

    _removeListenerObject(this, 'message', this._onML);

    if (fn && typeof fn === 'function') {
      this._onML = listenObj;

      _addListenerObject(this, 'message', listenObj);
    } else {
      this._onML = null;
    }
  },

  addEventListener: function addEventListener(type, fn) {
    var time = this.method.microSeconds();
    var listenObj = {
      time: time,
      fn: fn
    };

    _addListenerObject(this, type, listenObj);
  },
  removeEventListener: function removeEventListener(type, fn) {
    var obj = this._addEL[type].find(function (obj) {
      return obj.fn === fn;
    });

    _removeListenerObject(this, type, obj);
  },
  close: function close() {
    var _this = this;

    if (this.closed) return;
    this.closed = true;
    var awaitPrepare = this._prepP ? this._prepP : Promise.resolve();
    this._onML = null;
    this._addEL.message = [];
    return awaitPrepare.then(function () {
      return Promise.all(_this._befC.map(function (fn) {
        return fn();
      }));
    }).then(function () {
      return _this.method.close(_this._state);
    });
  },

  get type() {
    return this.method.type;
  }

};

function _post(broadcastChannel, type, msg) {
  var time = broadcastChannel.method.microSeconds();
  var msgObj = {
    time: time,
    type: type,
    data: msg
  };
  var awaitPrepare = broadcastChannel._prepP ? broadcastChannel._prepP : Promise.resolve();
  return awaitPrepare.then(function () {
    return broadcastChannel.method.postMessage(broadcastChannel._state, msgObj);
  });
}

function _prepareChannel(channel) {
  var maybePromise = channel.method.create(channel.name, channel.options);

  if ((0, _util.isPromise)(maybePromise)) {
    channel._prepP = maybePromise;
    maybePromise.then(function (s) {
      // used in tests to simulate slow runtime

      /*if (channel.options.prepareDelay) {
           await new Promise(res => setTimeout(res, this.options.prepareDelay));
      }*/
      channel._state = s;
    });
  } else {
    channel._state = maybePromise;
  }
}

function _hasMessageListeners(channel) {
  if (channel._addEL.message.length > 0) return true;
  if (channel._addEL.internal.length > 0) return true;
  return false;
}

function _addListenerObject(channel, type, obj) {
  channel._addEL[type].push(obj);

  _startListening(channel);
}

function _removeListenerObject(channel, type, obj) {
  channel._addEL[type] = channel._addEL[type].filter(function (o) {
    return o !== obj;
  });

  _stopListening(channel);
}

function _startListening(channel) {
  if (!channel._iL && _hasMessageListeners(channel)) {
    // someone is listening, start subscribing
    var listenerFn = function listenerFn(msgObj) {
      channel._addEL[msgObj.type].forEach(function (obj) {
        if (msgObj.time >= obj.time) {
          obj.fn(msgObj.data);
        }
      });
    };

    var time = channel.method.microSeconds();

    if (channel._prepP) {
      channel._prepP.then(function () {
        channel._iL = true;
        channel.method.onMessage(channel._state, listenerFn, time);
      });
    } else {
      channel._iL = true;
      channel.method.onMessage(channel._state, listenerFn, time);
    }
  }
}

function _stopListening(channel) {
  if (channel._iL && !_hasMessageListeners(channel)) {
    // noone is listening, stop subscribing
    channel._iL = false;
    var time = channel.method.microSeconds();
    channel.method.onMessage(channel._state, null, time);
  }
}

var _default = BroadcastChannel;
exports["default"] = _default;
},{"./method-chooser.js":2,"./options.js":7,"./util.js":8}],2:[function(require,module,exports){
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.chooseMethod = chooseMethod;

var _detectNode = _interopRequireDefault(require("detect-node"));

var _native = _interopRequireDefault(require("./methods/native.js"));

var _indexedDb = _interopRequireDefault(require("./methods/indexed-db.js"));

var _localstorage = _interopRequireDefault(require("./methods/localstorage.js"));

// order is important
var METHODS = [_native["default"], // fastest
_indexedDb["default"], _localstorage["default"]];
var REQUIRE_FUN = require;
/**
 * The NodeMethod is loaded lazy
 * so it will not get bundled in browser-builds
 */

if (_detectNode["default"]) {
  /**
   * we use the non-transpiled code for nodejs
   * because it runs faster
   */
  var NodeMethod = REQUIRE_FUN('../../src/methods/node.js');
  /**
   * this will be false for webpackbuilds
   * which will shim the node-method with an empty object {}
   */

  if (typeof NodeMethod.canBeUsed === 'function') {
    METHODS.push(NodeMethod);
  }
}

function chooseMethod(options) {
  // directly chosen
  if (options.type) {
    var ret = METHODS.find(function (m) {
      return m.type === options.type;
    });
    if (!ret) throw new Error('method-type ' + options.type + ' not found');else return ret;
  }

  var chooseMethods = METHODS;

  if (!options.webWorkerSupport && !_detectNode["default"]) {
    // prefer localstorage over idb when no webworker-support needed
    chooseMethods = METHODS.filter(function (m) {
      return m.type !== 'idb';
    });
  }

  var useMethod = chooseMethods.find(function (method) {
    return method.canBeUsed();
  });
  if (!useMethod) throw new Error('No useable methode found:' + JSON.stringify(METHODS.map(function (m) {
    return m.type;
  })));else return useMethod;
}
},{"./methods/indexed-db.js":3,"./methods/localstorage.js":4,"./methods/native.js":5,"@babel/runtime/helpers/interopRequireDefault":9,"detect-node":10}],3:[function(require,module,exports){
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getIdb = getIdb;
exports.createDatabase = createDatabase;
exports.writeMessage = writeMessage;
exports.getAllMessages = getAllMessages;
exports.getMessagesHigherThen = getMessagesHigherThen;
exports.removeMessageById = removeMessageById;
exports.getOldMessages = getOldMessages;
exports.cleanOldMessages = cleanOldMessages;
exports.create = create;
exports.close = close;
exports.postMessage = postMessage;
exports.onMessage = onMessage;
exports.canBeUsed = canBeUsed;
exports.averageResponseTime = averageResponseTime;
exports["default"] = exports.type = exports.microSeconds = void 0;

var _detectNode = _interopRequireDefault(require("detect-node"));

var _util = require("../util.js");

var _obliviousSet = _interopRequireDefault(require("../oblivious-set"));

var _options = require("../options");

/**
 * this method uses indexeddb to store the messages
 * There is currently no observerAPI for idb
 * @link https://github.com/w3c/IndexedDB/issues/51
 */
var microSeconds = _util.microSeconds;
exports.microSeconds = microSeconds;
var DB_PREFIX = 'pubkey.broadcast-channel-0-';
var OBJECT_STORE_ID = 'messages';
var type = 'idb';
exports.type = type;

function getIdb() {
  if (typeof indexedDB !== 'undefined') return indexedDB;
  if (typeof window.mozIndexedDB !== 'undefined') return window.mozIndexedDB;
  if (typeof window.webkitIndexedDB !== 'undefined') return window.webkitIndexedDB;
  if (typeof window.msIndexedDB !== 'undefined') return window.msIndexedDB;
  return false;
}

function createDatabase(channelName) {
  var IndexedDB = getIdb(); // create table

  var dbName = DB_PREFIX + channelName;
  var openRequest = IndexedDB.open(dbName, 1);

  openRequest.onupgradeneeded = function (ev) {
    var db = ev.target.result;
    db.createObjectStore(OBJECT_STORE_ID, {
      keyPath: 'id',
      autoIncrement: true
    });
  };

  var dbPromise = new Promise(function (res, rej) {
    openRequest.onerror = function (ev) {
      return rej(ev);
    };

    openRequest.onsuccess = function () {
      res(openRequest.result);
    };
  });
  return dbPromise;
}
/**
 * writes the new message to the database
 * so other readers can find it
 */


function writeMessage(db, readerUuid, messageJson) {
  var time = new Date().getTime();
  var writeObject = {
    uuid: readerUuid,
    time: time,
    data: messageJson
  };
  var transaction = db.transaction([OBJECT_STORE_ID], 'readwrite');
  return new Promise(function (res, rej) {
    transaction.oncomplete = function () {
      return res();
    };

    transaction.onerror = function (ev) {
      return rej(ev);
    };

    var objectStore = transaction.objectStore(OBJECT_STORE_ID);
    objectStore.add(writeObject);
  });
}

function getAllMessages(db) {
  var objectStore = db.transaction(OBJECT_STORE_ID).objectStore(OBJECT_STORE_ID);
  var ret = [];
  return new Promise(function (res) {
    objectStore.openCursor().onsuccess = function (ev) {
      var cursor = ev.target.result;

      if (cursor) {
        ret.push(cursor.value); //alert("Name for SSN " + cursor.key + " is " + cursor.value.name);

        cursor["continue"]();
      } else {
        res(ret);
      }
    };
  });
}

function getMessagesHigherThen(db, lastCursorId) {
  var objectStore = db.transaction(OBJECT_STORE_ID).objectStore(OBJECT_STORE_ID);
  var ret = [];
  var keyRangeValue = IDBKeyRange.bound(lastCursorId + 1, Infinity);
  return new Promise(function (res) {
    objectStore.openCursor(keyRangeValue).onsuccess = function (ev) {
      var cursor = ev.target.result;

      if (cursor) {
        ret.push(cursor.value); //alert("Name for SSN " + cursor.key + " is " + cursor.value.name);

        cursor["continue"]();
      } else {
        res(ret);
      }
    };
  });
}

function removeMessageById(db, id) {
  var request = db.transaction([OBJECT_STORE_ID], 'readwrite').objectStore(OBJECT_STORE_ID)["delete"](id);
  return new Promise(function (res) {
    request.onsuccess = function () {
      return res();
    };
  });
}

function getOldMessages(db, ttl) {
  var olderThen = new Date().getTime() - ttl;
  var objectStore = db.transaction(OBJECT_STORE_ID).objectStore(OBJECT_STORE_ID);
  var ret = [];
  return new Promise(function (res) {
    objectStore.openCursor().onsuccess = function (ev) {
      var cursor = ev.target.result;

      if (cursor) {
        var msgObk = cursor.value;

        if (msgObk.time < olderThen) {
          ret.push(msgObk); //alert("Name for SSN " + cursor.key + " is " + cursor.value.name);

          cursor["continue"]();
        } else {
          // no more old messages,
          res(ret);
          return;
        }
      } else {
        res(ret);
      }
    };
  });
}

function cleanOldMessages(db, ttl) {
  return getOldMessages(db, ttl).then(function (tooOld) {
    return Promise.all(tooOld.map(function (msgObj) {
      return removeMessageById(db, msgObj.id);
    }));
  });
}

function create(channelName, options) {
  options = (0, _options.fillOptionsWithDefaults)(options);
  return createDatabase(channelName).then(function (db) {
    var state = {
      closed: false,
      lastCursorId: 0,
      channelName: channelName,
      options: options,
      uuid: (0, _util.randomToken)(10),

      /**
       * emittedMessagesIds
       * contains all messages that have been emitted before
       * @type {ObliviousSet}
       */
      eMIs: new _obliviousSet["default"](options.idb.ttl * 2),
      // ensures we do not read messages in parrallel
      writeBlockPromise: Promise.resolve(),
      messagesCallback: null,
      readQueuePromises: [],
      db: db
    };
    /**
     * if service-workers are used,
     * we have no 'storage'-event if they post a message,
     * therefore we also have to set an interval
     */

    _readLoop(state);

    return state;
  });
}

function _readLoop(state) {
  if (state.closed) return;
  return readNewMessages(state).then(function () {
    return (0, _util.sleep)(state.options.idb.fallbackInterval);
  }).then(function () {
    return _readLoop(state);
  });
}

function _filterMessage(msgObj, state) {
  if (msgObj.uuid === state.uuid) return false; // send by own

  if (state.eMIs.has(msgObj.id)) return false; // already emitted

  if (msgObj.data.time < state.messagesCallbackTime) return false; // older then onMessageCallback

  return true;
}
/**
 * reads all new messages from the database and emits them
 */


function readNewMessages(state) {
  // channel already closed
  if (state.closed) return Promise.resolve(); // if no one is listening, we do not need to scan for new messages

  if (!state.messagesCallback) return Promise.resolve();
  return getMessagesHigherThen(state.db, state.lastCursorId).then(function (newerMessages) {
    var useMessages = newerMessages.map(function (msgObj) {
      if (msgObj.id > state.lastCursorId) {
        state.lastCursorId = msgObj.id;
      }

      return msgObj;
    }).filter(function (msgObj) {
      return _filterMessage(msgObj, state);
    }).sort(function (msgObjA, msgObjB) {
      return msgObjA.time - msgObjB.time;
    }); // sort by time

    useMessages.forEach(function (msgObj) {
      if (state.messagesCallback) {
        state.eMIs.add(msgObj.id);
        state.messagesCallback(msgObj.data);
      }
    });
    return Promise.resolve();
  });
}

function close(channelState) {
  channelState.closed = true;
  channelState.db.close();
}

function postMessage(channelState, messageJson) {
  channelState.writeBlockPromise = channelState.writeBlockPromise.then(function () {
    return writeMessage(channelState.db, channelState.uuid, messageJson);
  }).then(function () {
    if ((0, _util.randomInt)(0, 10) === 0) {
      /* await (do not await) */
      cleanOldMessages(channelState.db, channelState.options.idb.ttl);
    }
  });
  return channelState.writeBlockPromise;
}

function onMessage(channelState, fn, time) {
  channelState.messagesCallbackTime = time;
  channelState.messagesCallback = fn;
  readNewMessages(channelState);
}

function canBeUsed() {
  if (_detectNode["default"]) return false;
  var idb = getIdb();
  if (!idb) return false;
  return true;
}

function averageResponseTime(options) {
  return options.idb.fallbackInterval * 2;
}

var _default = {
  create: create,
  close: close,
  onMessage: onMessage,
  postMessage: postMessage,
  canBeUsed: canBeUsed,
  type: type,
  averageResponseTime: averageResponseTime,
  microSeconds: microSeconds
};
exports["default"] = _default;
},{"../oblivious-set":6,"../options":7,"../util.js":8,"@babel/runtime/helpers/interopRequireDefault":9,"detect-node":10}],4:[function(require,module,exports){
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getLocalStorage = getLocalStorage;
exports.storageKey = storageKey;
exports.postMessage = postMessage;
exports.addStorageEventListener = addStorageEventListener;
exports.removeStorageEventListener = removeStorageEventListener;
exports.create = create;
exports.close = close;
exports.onMessage = onMessage;
exports.canBeUsed = canBeUsed;
exports.averageResponseTime = averageResponseTime;
exports["default"] = exports.type = exports.microSeconds = void 0;

var _detectNode = _interopRequireDefault(require("detect-node"));

var _obliviousSet = _interopRequireDefault(require("../oblivious-set"));

var _options = require("../options");

var _util = require("../util");

/**
 * A localStorage-only method which uses localstorage and its 'storage'-event
 * This does not work inside of webworkers because they have no access to locastorage
 * This is basically implemented to support IE9 or your grandmothers toaster.
 * @link https://caniuse.com/#feat=namevalue-storage
 * @link https://caniuse.com/#feat=indexeddb
 */
var microSeconds = _util.microSeconds;
exports.microSeconds = microSeconds;
var KEY_PREFIX = 'pubkey.broadcastChannel-';
var type = 'localstorage';
/**
 * copied from crosstab
 * @link https://github.com/tejacques/crosstab/blob/master/src/crosstab.js#L32
 */

exports.type = type;

function getLocalStorage() {
  var localStorage;
  if (typeof window === 'undefined') return null;

  try {
    localStorage = window.localStorage;
    localStorage = window['ie8-eventlistener/storage'] || window.localStorage;
  } catch (e) {// New versions of Firefox throw a Security exception
    // if cookies are disabled. See
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1028153
  }

  return localStorage;
}

function storageKey(channelName) {
  return KEY_PREFIX + channelName;
}
/**
* writes the new message to the storage
* and fires the storage-event so other readers can find it
*/


function postMessage(channelState, messageJson) {
  return new Promise(function (res) {
    (0, _util.sleep)().then(function () {
      var key = storageKey(channelState.channelName);
      var writeObj = {
        token: (0, _util.randomToken)(10),
        time: new Date().getTime(),
        data: messageJson,
        uuid: channelState.uuid
      };
      var value = JSON.stringify(writeObj);
      localStorage.setItem(key, value);
      /**
       * StorageEvent does not fire the 'storage' event
       * in the window that changes the state of the local storage.
       * So we fire it manually
       */

      var ev = document.createEvent('Event');
      ev.initEvent('storage', true, true);
      ev.key = key;
      ev.newValue = value;
      window.dispatchEvent(ev);
      res();
    });
  });
}

function addStorageEventListener(channelName, fn) {
  var key = storageKey(channelName);

  var listener = function listener(ev) {
    if (ev.key === key) {
      fn(JSON.parse(ev.newValue));
    }
  };

  window.addEventListener('storage', listener);
  return listener;
}

function removeStorageEventListener(listener) {
  window.removeEventListener('storage', listener);
}

function create(channelName, options) {
  options = (0, _options.fillOptionsWithDefaults)(options);

  if (!canBeUsed()) {
    throw new Error('BroadcastChannel: localstorage cannot be used');
  }

  var uuid = (0, _util.randomToken)(10);
  /**
   * eMIs
   * contains all messages that have been emitted before
   * @type {ObliviousSet}
   */

  var eMIs = new _obliviousSet["default"](options.localstorage.removeTimeout);
  var state = {
    channelName: channelName,
    uuid: uuid,
    eMIs: eMIs // emittedMessagesIds

  };
  state.listener = addStorageEventListener(channelName, function (msgObj) {
    if (!state.messagesCallback) return; // no listener

    if (msgObj.uuid === uuid) return; // own message

    if (!msgObj.token || eMIs.has(msgObj.token)) return; // already emitted

    if (msgObj.data.time && msgObj.data.time < state.messagesCallbackTime) return; // too old

    eMIs.add(msgObj.token);
    state.messagesCallback(msgObj.data);
  });
  return state;
}

function close(channelState) {
  removeStorageEventListener(channelState.listener);
}

function onMessage(channelState, fn, time) {
  channelState.messagesCallbackTime = time;
  channelState.messagesCallback = fn;
}

function canBeUsed() {
  if (_detectNode["default"]) return false;
  var ls = getLocalStorage();
  if (!ls) return false;
  return true;
}

function averageResponseTime() {
  return 120;
}

var _default = {
  create: create,
  close: close,
  onMessage: onMessage,
  postMessage: postMessage,
  canBeUsed: canBeUsed,
  type: type,
  averageResponseTime: averageResponseTime,
  microSeconds: microSeconds
};
exports["default"] = _default;
},{"../oblivious-set":6,"../options":7,"../util":8,"@babel/runtime/helpers/interopRequireDefault":9,"detect-node":10}],5:[function(require,module,exports){
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports.close = close;
exports.postMessage = postMessage;
exports.onMessage = onMessage;
exports.canBeUsed = canBeUsed;
exports.averageResponseTime = averageResponseTime;
exports["default"] = exports.type = exports.microSeconds = void 0;

var _detectNode = _interopRequireDefault(require("detect-node"));

var _util = require("../util");

var microSeconds = _util.microSeconds;
exports.microSeconds = microSeconds;
var type = 'native';
exports.type = type;

function create(channelName) {
  var state = {
    messagesCallback: null,
    bc: new BroadcastChannel(channelName),
    subFns: [] // subscriberFunctions

  };

  state.bc.onmessage = function (msg) {
    if (state.messagesCallback) {
      state.messagesCallback(msg.data);
    }
  };

  return state;
}

function close(channelState) {
  channelState.bc.close();
  channelState.subFns = [];
}

function postMessage(channelState, messageJson) {
  channelState.bc.postMessage(messageJson, false);
}

function onMessage(channelState, fn, time) {
  channelState.messagesCallbackTime = time;
  channelState.messagesCallback = fn;
}

function canBeUsed() {
  /**
   * in the electron-renderer, isNode will be true even if we are in browser-context
   * so we also check if window is undefined
   */
  if (_detectNode["default"] && typeof window === 'undefined') return false;

  if (typeof BroadcastChannel === 'function') {
    if (BroadcastChannel._pubkey) {
      throw new Error('BroadcastChannel: Do not overwrite window.BroadcastChannel with this module, this is not a polyfill');
    }

    return true;
  } else return false;
}

function averageResponseTime() {
  return 100;
}

var _default = {
  create: create,
  close: close,
  onMessage: onMessage,
  postMessage: postMessage,
  canBeUsed: canBeUsed,
  type: type,
  averageResponseTime: averageResponseTime,
  microSeconds: microSeconds
};
exports["default"] = _default;
},{"../util":8,"@babel/runtime/helpers/interopRequireDefault":9,"detect-node":10}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._removeTooOldValues = _removeTooOldValues;
exports["default"] = void 0;

/**
 *
 *
 */
var ObliviousSet = function ObliviousSet(ttl) {
  this.ttl = ttl;
  this.set = new Set();
  this.timeMap = new Map();
  this.has = this.set.has.bind(this.set);
};

ObliviousSet.prototype = {
  add: function add(value) {
    this.timeMap.set(value, now());
    this.set.add(value);

    _removeTooOldValues(this);
  },
  clear: function clear() {
    this.set.clear();
    this.timeMap.clear();
  }
};

function _removeTooOldValues(obliviousSet) {
  var olderThen = now() - obliviousSet.ttl;
  var iterator = obliviousSet.set[Symbol.iterator]();

  while (true) {
    var value = iterator.next().value;
    if (!value) return; // no more elements

    var time = obliviousSet.timeMap.get(value);

    if (time < olderThen) {
      obliviousSet.timeMap["delete"](value);
      obliviousSet.set["delete"](value);
    } else {
      // we reached a value that is not old enough
      return;
    }
  }
}

function now() {
  return new Date().getTime();
}

var _default = ObliviousSet;
exports["default"] = _default;
},{}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fillOptionsWithDefaults = fillOptionsWithDefaults;

function fillOptionsWithDefaults(options) {
  if (!options) options = {};
  options = JSON.parse(JSON.stringify(options)); // main

  if (typeof options.webWorkerSupport === 'undefined') options.webWorkerSupport = true; // indexed-db

  if (!options.idb) options.idb = {}; //  after this time the messages get deleted

  if (!options.idb.ttl) options.idb.ttl = 1000 * 45;
  if (!options.idb.fallbackInterval) options.idb.fallbackInterval = 150; // localstorage

  if (!options.localstorage) options.localstorage = {};
  if (!options.localstorage.removeTimeout) options.localstorage.removeTimeout = 1000 * 60; // node

  if (!options.node) options.node = {};
  if (!options.node.ttl) options.node.ttl = 1000 * 60 * 2; // 2 minutes;

  if (typeof options.node.useFastPath === 'undefined') options.node.useFastPath = true;
  return options;
}
},{}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isPromise = isPromise;
exports.sleep = sleep;
exports.randomInt = randomInt;
exports.randomToken = randomToken;
exports.microSeconds = microSeconds;

/**
 * returns true if the given object is a promise
 */
function isPromise(obj) {
  if (obj && typeof obj.then === 'function') {
    return true;
  } else {
    return false;
  }
}

function sleep(time) {
  if (!time) time = 0;
  return new Promise(function (res) {
    return setTimeout(res, time);
  });
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
/**
 * https://stackoverflow.com/a/1349426/3443137
 */


function randomToken(length) {
  if (!length) length = 5;
  var text = '';
  var possible = 'abcdefghijklmnopqrstuvwxzy0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

var lastMs = 0;
var additional = 0;
/**
 * returns the current time in micro-seconds,
 * WARNING: This is a pseudo-function
 * Performance.now is not reliable in webworkers, so we just make sure to never return the same time.
 * This is enough in browsers, and this function will not be used in nodejs.
 * The main reason for this hack is to ensure that BroadcastChannel behaves equal to production when it is used in fast-running unit tests.
 */

function microSeconds() {
  var ms = new Date().getTime();

  if (ms === lastMs) {
    additional++;
    return ms * 1000 + additional;
  } else {
    lastMs = ms;
    additional = 0;
    return ms * 1000;
  }
}
},{}],9:[function(require,module,exports){
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {
    default: obj
  };
}

module.exports = _interopRequireDefault;
},{}],10:[function(require,module,exports){
module.exports = false;


},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL1VzZXJzL21pY2hhL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImluZGV4LmpzIiwibWV0aG9kLWNob29zZXIuanMiLCJtZXRob2RzL2luZGV4ZWQtZGIuanMiLCJtZXRob2RzL2xvY2Fsc3RvcmFnZS5qcyIsIm1ldGhvZHMvbmF0aXZlLmpzIiwib2JsaXZpb3VzLXNldC5qcyIsIm9wdGlvbnMuanMiLCJ1dGlsLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL0BiYWJlbC9ydW50aW1lL2hlbHBlcnMvaW50ZXJvcFJlcXVpcmVEZWZhdWx0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2RldGVjdC1ub2RlL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IHZvaWQgMDtcblxudmFyIF91dGlsID0gcmVxdWlyZShcIi4vdXRpbC5qc1wiKTtcblxudmFyIF9tZXRob2RDaG9vc2VyID0gcmVxdWlyZShcIi4vbWV0aG9kLWNob29zZXIuanNcIik7XG5cbnZhciBfb3B0aW9ucyA9IHJlcXVpcmUoXCIuL29wdGlvbnMuanNcIik7XG5cbnZhciBCcm9hZGNhc3RDaGFubmVsID0gZnVuY3Rpb24gQnJvYWRjYXN0Q2hhbm5lbChuYW1lLCBvcHRpb25zKSB7XG4gIHRoaXMubmFtZSA9IG5hbWU7XG4gIHRoaXMub3B0aW9ucyA9ICgwLCBfb3B0aW9ucy5maWxsT3B0aW9uc1dpdGhEZWZhdWx0cykob3B0aW9ucyk7XG4gIHRoaXMubWV0aG9kID0gKDAsIF9tZXRob2RDaG9vc2VyLmNob29zZU1ldGhvZCkodGhpcy5vcHRpb25zKTsgLy8gaXNMaXN0ZW5pbmdcblxuICB0aGlzLl9pTCA9IGZhbHNlO1xuICAvKipcbiAgICogX29uTWVzc2FnZUxpc3RlbmVyXG4gICAqIHNldHRpbmcgb25tZXNzYWdlIHR3aWNlLFxuICAgKiB3aWxsIG92ZXJ3cml0ZSB0aGUgZmlyc3QgbGlzdGVuZXJcbiAgICovXG5cbiAgdGhpcy5fb25NTCA9IG51bGw7XG4gIC8qKlxuICAgKiBfYWRkRXZlbnRMaXN0ZW5lcnNcbiAgICovXG5cbiAgdGhpcy5fYWRkRUwgPSB7XG4gICAgbWVzc2FnZTogW10sXG4gICAgaW50ZXJuYWw6IFtdXG4gIH07XG4gIC8qKlxuICAgKiBfYmVmb3JlQ2xvc2VcbiAgICogYXJyYXkgb2YgcHJvbWlzZXMgdGhhdCB3aWxsIGJlIGF3YWl0ZWRcbiAgICogYmVmb3JlIHRoZSBjaGFubmVsIGlzIGNsb3NlZFxuICAgKi9cblxuICB0aGlzLl9iZWZDID0gW107XG4gIC8qKlxuICAgKiBfcHJlcGFyZVByb21pc2VcbiAgICovXG5cbiAgdGhpcy5fcHJlcFAgPSBudWxsO1xuXG4gIF9wcmVwYXJlQ2hhbm5lbCh0aGlzKTtcbn07IC8vIFNUQVRJQ1NcblxuLyoqXG4gKiB1c2VkIHRvIGlkZW50aWZ5IGlmIHNvbWVvbmUgb3ZlcndyaXRlc1xuICogd2luZG93LkJyb2FkY2FzdENoYW5uZWwgd2l0aCB0aGlzXG4gKiBTZWUgbWV0aG9kcy9uYXRpdmUuanNcbiAqL1xuXG5cbkJyb2FkY2FzdENoYW5uZWwuX3B1YmtleSA9IHRydWU7XG4vKipcbiAqIGNsZWFycyB0aGUgdG1wLWZvbGRlciBpZiBpcyBub2RlXG4gKiBAcmV0dXJuIHtQcm9taXNlPGJvb2xlYW4+fSB0cnVlIGlmIGhhcyBydW4sIGZhbHNlIGlmIG5vdCBub2RlXG4gKi9cblxuQnJvYWRjYXN0Q2hhbm5lbC5jbGVhck5vZGVGb2xkZXIgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBvcHRpb25zID0gKDAsIF9vcHRpb25zLmZpbGxPcHRpb25zV2l0aERlZmF1bHRzKShvcHRpb25zKTtcbiAgdmFyIG1ldGhvZCA9ICgwLCBfbWV0aG9kQ2hvb3Nlci5jaG9vc2VNZXRob2QpKG9wdGlvbnMpO1xuXG4gIGlmIChtZXRob2QudHlwZSA9PT0gJ25vZGUnKSB7XG4gICAgcmV0dXJuIG1ldGhvZC5jbGVhck5vZGVGb2xkZXIoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZmFsc2UpO1xuICB9XG59OyAvLyBQUk9UT1RZUEVcblxuXG5Ccm9hZGNhc3RDaGFubmVsLnByb3RvdHlwZSA9IHtcbiAgcG9zdE1lc3NhZ2U6IGZ1bmN0aW9uIHBvc3RNZXNzYWdlKG1zZykge1xuICAgIGlmICh0aGlzLmNsb3NlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdCcm9hZGNhc3RDaGFubmVsLnBvc3RNZXNzYWdlKCk6ICcgKyAnQ2Fubm90IHBvc3QgbWVzc2FnZSBhZnRlciBjaGFubmVsIGhhcyBjbG9zZWQnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gX3Bvc3QodGhpcywgJ21lc3NhZ2UnLCBtc2cpO1xuICB9LFxuICBwb3N0SW50ZXJuYWw6IGZ1bmN0aW9uIHBvc3RJbnRlcm5hbChtc2cpIHtcbiAgICByZXR1cm4gX3Bvc3QodGhpcywgJ2ludGVybmFsJywgbXNnKTtcbiAgfSxcblxuICBzZXQgb25tZXNzYWdlKGZuKSB7XG4gICAgdmFyIHRpbWUgPSB0aGlzLm1ldGhvZC5taWNyb1NlY29uZHMoKTtcbiAgICB2YXIgbGlzdGVuT2JqID0ge1xuICAgICAgdGltZTogdGltZSxcbiAgICAgIGZuOiBmblxuICAgIH07XG5cbiAgICBfcmVtb3ZlTGlzdGVuZXJPYmplY3QodGhpcywgJ21lc3NhZ2UnLCB0aGlzLl9vbk1MKTtcblxuICAgIGlmIChmbiAmJiB0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX29uTUwgPSBsaXN0ZW5PYmo7XG5cbiAgICAgIF9hZGRMaXN0ZW5lck9iamVjdCh0aGlzLCAnbWVzc2FnZScsIGxpc3Rlbk9iaik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX29uTUwgPSBudWxsO1xuICAgIH1cbiAgfSxcblxuICBhZGRFdmVudExpc3RlbmVyOiBmdW5jdGlvbiBhZGRFdmVudExpc3RlbmVyKHR5cGUsIGZuKSB7XG4gICAgdmFyIHRpbWUgPSB0aGlzLm1ldGhvZC5taWNyb1NlY29uZHMoKTtcbiAgICB2YXIgbGlzdGVuT2JqID0ge1xuICAgICAgdGltZTogdGltZSxcbiAgICAgIGZuOiBmblxuICAgIH07XG5cbiAgICBfYWRkTGlzdGVuZXJPYmplY3QodGhpcywgdHlwZSwgbGlzdGVuT2JqKTtcbiAgfSxcbiAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24gcmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBmbikge1xuICAgIHZhciBvYmogPSB0aGlzLl9hZGRFTFt0eXBlXS5maW5kKGZ1bmN0aW9uIChvYmopIHtcbiAgICAgIHJldHVybiBvYmouZm4gPT09IGZuO1xuICAgIH0pO1xuXG4gICAgX3JlbW92ZUxpc3RlbmVyT2JqZWN0KHRoaXMsIHR5cGUsIG9iaik7XG4gIH0sXG4gIGNsb3NlOiBmdW5jdGlvbiBjbG9zZSgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYgKHRoaXMuY2xvc2VkKSByZXR1cm47XG4gICAgdGhpcy5jbG9zZWQgPSB0cnVlO1xuICAgIHZhciBhd2FpdFByZXBhcmUgPSB0aGlzLl9wcmVwUCA/IHRoaXMuX3ByZXBQIDogUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgdGhpcy5fb25NTCA9IG51bGw7XG4gICAgdGhpcy5fYWRkRUwubWVzc2FnZSA9IFtdO1xuICAgIHJldHVybiBhd2FpdFByZXBhcmUudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5hbGwoX3RoaXMuX2JlZkMubWFwKGZ1bmN0aW9uIChmbikge1xuICAgICAgICByZXR1cm4gZm4oKTtcbiAgICAgIH0pKTtcbiAgICB9KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBfdGhpcy5tZXRob2QuY2xvc2UoX3RoaXMuX3N0YXRlKTtcbiAgICB9KTtcbiAgfSxcblxuICBnZXQgdHlwZSgpIHtcbiAgICByZXR1cm4gdGhpcy5tZXRob2QudHlwZTtcbiAgfVxuXG59O1xuXG5mdW5jdGlvbiBfcG9zdChicm9hZGNhc3RDaGFubmVsLCB0eXBlLCBtc2cpIHtcbiAgdmFyIHRpbWUgPSBicm9hZGNhc3RDaGFubmVsLm1ldGhvZC5taWNyb1NlY29uZHMoKTtcbiAgdmFyIG1zZ09iaiA9IHtcbiAgICB0aW1lOiB0aW1lLFxuICAgIHR5cGU6IHR5cGUsXG4gICAgZGF0YTogbXNnXG4gIH07XG4gIHZhciBhd2FpdFByZXBhcmUgPSBicm9hZGNhc3RDaGFubmVsLl9wcmVwUCA/IGJyb2FkY2FzdENoYW5uZWwuX3ByZXBQIDogUHJvbWlzZS5yZXNvbHZlKCk7XG4gIHJldHVybiBhd2FpdFByZXBhcmUudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGJyb2FkY2FzdENoYW5uZWwubWV0aG9kLnBvc3RNZXNzYWdlKGJyb2FkY2FzdENoYW5uZWwuX3N0YXRlLCBtc2dPYmopO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gX3ByZXBhcmVDaGFubmVsKGNoYW5uZWwpIHtcbiAgdmFyIG1heWJlUHJvbWlzZSA9IGNoYW5uZWwubWV0aG9kLmNyZWF0ZShjaGFubmVsLm5hbWUsIGNoYW5uZWwub3B0aW9ucyk7XG5cbiAgaWYgKCgwLCBfdXRpbC5pc1Byb21pc2UpKG1heWJlUHJvbWlzZSkpIHtcbiAgICBjaGFubmVsLl9wcmVwUCA9IG1heWJlUHJvbWlzZTtcbiAgICBtYXliZVByb21pc2UudGhlbihmdW5jdGlvbiAocykge1xuICAgICAgLy8gdXNlZCBpbiB0ZXN0cyB0byBzaW11bGF0ZSBzbG93IHJ1bnRpbWVcblxuICAgICAgLyppZiAoY2hhbm5lbC5vcHRpb25zLnByZXBhcmVEZWxheSkge1xuICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXMgPT4gc2V0VGltZW91dChyZXMsIHRoaXMub3B0aW9ucy5wcmVwYXJlRGVsYXkpKTtcbiAgICAgIH0qL1xuICAgICAgY2hhbm5lbC5fc3RhdGUgPSBzO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIGNoYW5uZWwuX3N0YXRlID0gbWF5YmVQcm9taXNlO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9oYXNNZXNzYWdlTGlzdGVuZXJzKGNoYW5uZWwpIHtcbiAgaWYgKGNoYW5uZWwuX2FkZEVMLm1lc3NhZ2UubGVuZ3RoID4gMCkgcmV0dXJuIHRydWU7XG4gIGlmIChjaGFubmVsLl9hZGRFTC5pbnRlcm5hbC5sZW5ndGggPiAwKSByZXR1cm4gdHJ1ZTtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBfYWRkTGlzdGVuZXJPYmplY3QoY2hhbm5lbCwgdHlwZSwgb2JqKSB7XG4gIGNoYW5uZWwuX2FkZEVMW3R5cGVdLnB1c2gob2JqKTtcblxuICBfc3RhcnRMaXN0ZW5pbmcoY2hhbm5lbCk7XG59XG5cbmZ1bmN0aW9uIF9yZW1vdmVMaXN0ZW5lck9iamVjdChjaGFubmVsLCB0eXBlLCBvYmopIHtcbiAgY2hhbm5lbC5fYWRkRUxbdHlwZV0gPSBjaGFubmVsLl9hZGRFTFt0eXBlXS5maWx0ZXIoZnVuY3Rpb24gKG8pIHtcbiAgICByZXR1cm4gbyAhPT0gb2JqO1xuICB9KTtcblxuICBfc3RvcExpc3RlbmluZyhjaGFubmVsKTtcbn1cblxuZnVuY3Rpb24gX3N0YXJ0TGlzdGVuaW5nKGNoYW5uZWwpIHtcbiAgaWYgKCFjaGFubmVsLl9pTCAmJiBfaGFzTWVzc2FnZUxpc3RlbmVycyhjaGFubmVsKSkge1xuICAgIC8vIHNvbWVvbmUgaXMgbGlzdGVuaW5nLCBzdGFydCBzdWJzY3JpYmluZ1xuICAgIHZhciBsaXN0ZW5lckZuID0gZnVuY3Rpb24gbGlzdGVuZXJGbihtc2dPYmopIHtcbiAgICAgIGNoYW5uZWwuX2FkZEVMW21zZ09iai50eXBlXS5mb3JFYWNoKGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgaWYgKG1zZ09iai50aW1lID49IG9iai50aW1lKSB7XG4gICAgICAgICAgb2JqLmZuKG1zZ09iai5kYXRhKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciB0aW1lID0gY2hhbm5lbC5tZXRob2QubWljcm9TZWNvbmRzKCk7XG5cbiAgICBpZiAoY2hhbm5lbC5fcHJlcFApIHtcbiAgICAgIGNoYW5uZWwuX3ByZXBQLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICBjaGFubmVsLl9pTCA9IHRydWU7XG4gICAgICAgIGNoYW5uZWwubWV0aG9kLm9uTWVzc2FnZShjaGFubmVsLl9zdGF0ZSwgbGlzdGVuZXJGbiwgdGltZSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hhbm5lbC5faUwgPSB0cnVlO1xuICAgICAgY2hhbm5lbC5tZXRob2Qub25NZXNzYWdlKGNoYW5uZWwuX3N0YXRlLCBsaXN0ZW5lckZuLCB0aW1lKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gX3N0b3BMaXN0ZW5pbmcoY2hhbm5lbCkge1xuICBpZiAoY2hhbm5lbC5faUwgJiYgIV9oYXNNZXNzYWdlTGlzdGVuZXJzKGNoYW5uZWwpKSB7XG4gICAgLy8gbm9vbmUgaXMgbGlzdGVuaW5nLCBzdG9wIHN1YnNjcmliaW5nXG4gICAgY2hhbm5lbC5faUwgPSBmYWxzZTtcbiAgICB2YXIgdGltZSA9IGNoYW5uZWwubWV0aG9kLm1pY3JvU2Vjb25kcygpO1xuICAgIGNoYW5uZWwubWV0aG9kLm9uTWVzc2FnZShjaGFubmVsLl9zdGF0ZSwgbnVsbCwgdGltZSk7XG4gIH1cbn1cblxudmFyIF9kZWZhdWx0ID0gQnJvYWRjYXN0Q2hhbm5lbDtcbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gX2RlZmF1bHQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0ID0gcmVxdWlyZShcIkBiYWJlbC9ydW50aW1lL2hlbHBlcnMvaW50ZXJvcFJlcXVpcmVEZWZhdWx0XCIpO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5jaG9vc2VNZXRob2QgPSBjaG9vc2VNZXRob2Q7XG5cbnZhciBfZGV0ZWN0Tm9kZSA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcImRldGVjdC1ub2RlXCIpKTtcblxudmFyIF9uYXRpdmUgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL21ldGhvZHMvbmF0aXZlLmpzXCIpKTtcblxudmFyIF9pbmRleGVkRGIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL21ldGhvZHMvaW5kZXhlZC1kYi5qc1wiKSk7XG5cbnZhciBfbG9jYWxzdG9yYWdlID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9tZXRob2RzL2xvY2Fsc3RvcmFnZS5qc1wiKSk7XG5cbi8vIG9yZGVyIGlzIGltcG9ydGFudFxudmFyIE1FVEhPRFMgPSBbX25hdGl2ZVtcImRlZmF1bHRcIl0sIC8vIGZhc3Rlc3Rcbl9pbmRleGVkRGJbXCJkZWZhdWx0XCJdLCBfbG9jYWxzdG9yYWdlW1wiZGVmYXVsdFwiXV07XG52YXIgUkVRVUlSRV9GVU4gPSByZXF1aXJlO1xuLyoqXG4gKiBUaGUgTm9kZU1ldGhvZCBpcyBsb2FkZWQgbGF6eVxuICogc28gaXQgd2lsbCBub3QgZ2V0IGJ1bmRsZWQgaW4gYnJvd3Nlci1idWlsZHNcbiAqL1xuXG5pZiAoX2RldGVjdE5vZGVbXCJkZWZhdWx0XCJdKSB7XG4gIC8qKlxuICAgKiB3ZSB1c2UgdGhlIG5vbi10cmFuc3BpbGVkIGNvZGUgZm9yIG5vZGVqc1xuICAgKiBiZWNhdXNlIGl0IHJ1bnMgZmFzdGVyXG4gICAqL1xuICB2YXIgTm9kZU1ldGhvZCA9IFJFUVVJUkVfRlVOKCcuLi8uLi9zcmMvbWV0aG9kcy9ub2RlLmpzJyk7XG4gIC8qKlxuICAgKiB0aGlzIHdpbGwgYmUgZmFsc2UgZm9yIHdlYnBhY2tidWlsZHNcbiAgICogd2hpY2ggd2lsbCBzaGltIHRoZSBub2RlLW1ldGhvZCB3aXRoIGFuIGVtcHR5IG9iamVjdCB7fVxuICAgKi9cblxuICBpZiAodHlwZW9mIE5vZGVNZXRob2QuY2FuQmVVc2VkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgTUVUSE9EUy5wdXNoKE5vZGVNZXRob2QpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNob29zZU1ldGhvZChvcHRpb25zKSB7XG4gIC8vIGRpcmVjdGx5IGNob3NlblxuICBpZiAob3B0aW9ucy50eXBlKSB7XG4gICAgdmFyIHJldCA9IE1FVEhPRFMuZmluZChmdW5jdGlvbiAobSkge1xuICAgICAgcmV0dXJuIG0udHlwZSA9PT0gb3B0aW9ucy50eXBlO1xuICAgIH0pO1xuICAgIGlmICghcmV0KSB0aHJvdyBuZXcgRXJyb3IoJ21ldGhvZC10eXBlICcgKyBvcHRpb25zLnR5cGUgKyAnIG5vdCBmb3VuZCcpO2Vsc2UgcmV0dXJuIHJldDtcbiAgfVxuXG4gIHZhciBjaG9vc2VNZXRob2RzID0gTUVUSE9EUztcblxuICBpZiAoIW9wdGlvbnMud2ViV29ya2VyU3VwcG9ydCAmJiAhX2RldGVjdE5vZGVbXCJkZWZhdWx0XCJdKSB7XG4gICAgLy8gcHJlZmVyIGxvY2Fsc3RvcmFnZSBvdmVyIGlkYiB3aGVuIG5vIHdlYndvcmtlci1zdXBwb3J0IG5lZWRlZFxuICAgIGNob29zZU1ldGhvZHMgPSBNRVRIT0RTLmZpbHRlcihmdW5jdGlvbiAobSkge1xuICAgICAgcmV0dXJuIG0udHlwZSAhPT0gJ2lkYic7XG4gICAgfSk7XG4gIH1cblxuICB2YXIgdXNlTWV0aG9kID0gY2hvb3NlTWV0aG9kcy5maW5kKGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgICByZXR1cm4gbWV0aG9kLmNhbkJlVXNlZCgpO1xuICB9KTtcbiAgaWYgKCF1c2VNZXRob2QpIHRocm93IG5ldyBFcnJvcignTm8gdXNlYWJsZSBtZXRob2RlIGZvdW5kOicgKyBKU09OLnN0cmluZ2lmeShNRVRIT0RTLm1hcChmdW5jdGlvbiAobSkge1xuICAgIHJldHVybiBtLnR5cGU7XG4gIH0pKSk7ZWxzZSByZXR1cm4gdXNlTWV0aG9kO1xufSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlRGVmYXVsdCA9IHJlcXVpcmUoXCJAYmFiZWwvcnVudGltZS9oZWxwZXJzL2ludGVyb3BSZXF1aXJlRGVmYXVsdFwiKTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZ2V0SWRiID0gZ2V0SWRiO1xuZXhwb3J0cy5jcmVhdGVEYXRhYmFzZSA9IGNyZWF0ZURhdGFiYXNlO1xuZXhwb3J0cy53cml0ZU1lc3NhZ2UgPSB3cml0ZU1lc3NhZ2U7XG5leHBvcnRzLmdldEFsbE1lc3NhZ2VzID0gZ2V0QWxsTWVzc2FnZXM7XG5leHBvcnRzLmdldE1lc3NhZ2VzSGlnaGVyVGhlbiA9IGdldE1lc3NhZ2VzSGlnaGVyVGhlbjtcbmV4cG9ydHMucmVtb3ZlTWVzc2FnZUJ5SWQgPSByZW1vdmVNZXNzYWdlQnlJZDtcbmV4cG9ydHMuZ2V0T2xkTWVzc2FnZXMgPSBnZXRPbGRNZXNzYWdlcztcbmV4cG9ydHMuY2xlYW5PbGRNZXNzYWdlcyA9IGNsZWFuT2xkTWVzc2FnZXM7XG5leHBvcnRzLmNyZWF0ZSA9IGNyZWF0ZTtcbmV4cG9ydHMuY2xvc2UgPSBjbG9zZTtcbmV4cG9ydHMucG9zdE1lc3NhZ2UgPSBwb3N0TWVzc2FnZTtcbmV4cG9ydHMub25NZXNzYWdlID0gb25NZXNzYWdlO1xuZXhwb3J0cy5jYW5CZVVzZWQgPSBjYW5CZVVzZWQ7XG5leHBvcnRzLmF2ZXJhZ2VSZXNwb25zZVRpbWUgPSBhdmVyYWdlUmVzcG9uc2VUaW1lO1xuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBleHBvcnRzLnR5cGUgPSBleHBvcnRzLm1pY3JvU2Vjb25kcyA9IHZvaWQgMDtcblxudmFyIF9kZXRlY3ROb2RlID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiZGV0ZWN0LW5vZGVcIikpO1xuXG52YXIgX3V0aWwgPSByZXF1aXJlKFwiLi4vdXRpbC5qc1wiKTtcblxudmFyIF9vYmxpdmlvdXNTZXQgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuLi9vYmxpdmlvdXMtc2V0XCIpKTtcblxudmFyIF9vcHRpb25zID0gcmVxdWlyZShcIi4uL29wdGlvbnNcIik7XG5cbi8qKlxuICogdGhpcyBtZXRob2QgdXNlcyBpbmRleGVkZGIgdG8gc3RvcmUgdGhlIG1lc3NhZ2VzXG4gKiBUaGVyZSBpcyBjdXJyZW50bHkgbm8gb2JzZXJ2ZXJBUEkgZm9yIGlkYlxuICogQGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL3czYy9JbmRleGVkREIvaXNzdWVzLzUxXG4gKi9cbnZhciBtaWNyb1NlY29uZHMgPSBfdXRpbC5taWNyb1NlY29uZHM7XG5leHBvcnRzLm1pY3JvU2Vjb25kcyA9IG1pY3JvU2Vjb25kcztcbnZhciBEQl9QUkVGSVggPSAncHVia2V5LmJyb2FkY2FzdC1jaGFubmVsLTAtJztcbnZhciBPQkpFQ1RfU1RPUkVfSUQgPSAnbWVzc2FnZXMnO1xudmFyIHR5cGUgPSAnaWRiJztcbmV4cG9ydHMudHlwZSA9IHR5cGU7XG5cbmZ1bmN0aW9uIGdldElkYigpIHtcbiAgaWYgKHR5cGVvZiBpbmRleGVkREIgIT09ICd1bmRlZmluZWQnKSByZXR1cm4gaW5kZXhlZERCO1xuICBpZiAodHlwZW9mIHdpbmRvdy5tb3pJbmRleGVkREIgIT09ICd1bmRlZmluZWQnKSByZXR1cm4gd2luZG93Lm1vekluZGV4ZWREQjtcbiAgaWYgKHR5cGVvZiB3aW5kb3cud2Via2l0SW5kZXhlZERCICE9PSAndW5kZWZpbmVkJykgcmV0dXJuIHdpbmRvdy53ZWJraXRJbmRleGVkREI7XG4gIGlmICh0eXBlb2Ygd2luZG93Lm1zSW5kZXhlZERCICE9PSAndW5kZWZpbmVkJykgcmV0dXJuIHdpbmRvdy5tc0luZGV4ZWREQjtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVEYXRhYmFzZShjaGFubmVsTmFtZSkge1xuICB2YXIgSW5kZXhlZERCID0gZ2V0SWRiKCk7IC8vIGNyZWF0ZSB0YWJsZVxuXG4gIHZhciBkYk5hbWUgPSBEQl9QUkVGSVggKyBjaGFubmVsTmFtZTtcbiAgdmFyIG9wZW5SZXF1ZXN0ID0gSW5kZXhlZERCLm9wZW4oZGJOYW1lLCAxKTtcblxuICBvcGVuUmVxdWVzdC5vbnVwZ3JhZGVuZWVkZWQgPSBmdW5jdGlvbiAoZXYpIHtcbiAgICB2YXIgZGIgPSBldi50YXJnZXQucmVzdWx0O1xuICAgIGRiLmNyZWF0ZU9iamVjdFN0b3JlKE9CSkVDVF9TVE9SRV9JRCwge1xuICAgICAga2V5UGF0aDogJ2lkJyxcbiAgICAgIGF1dG9JbmNyZW1lbnQ6IHRydWVcbiAgICB9KTtcbiAgfTtcblxuICB2YXIgZGJQcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlcywgcmVqKSB7XG4gICAgb3BlblJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uIChldikge1xuICAgICAgcmV0dXJuIHJlaihldik7XG4gICAgfTtcblxuICAgIG9wZW5SZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJlcyhvcGVuUmVxdWVzdC5yZXN1bHQpO1xuICAgIH07XG4gIH0pO1xuICByZXR1cm4gZGJQcm9taXNlO1xufVxuLyoqXG4gKiB3cml0ZXMgdGhlIG5ldyBtZXNzYWdlIHRvIHRoZSBkYXRhYmFzZVxuICogc28gb3RoZXIgcmVhZGVycyBjYW4gZmluZCBpdFxuICovXG5cblxuZnVuY3Rpb24gd3JpdGVNZXNzYWdlKGRiLCByZWFkZXJVdWlkLCBtZXNzYWdlSnNvbikge1xuICB2YXIgdGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICB2YXIgd3JpdGVPYmplY3QgPSB7XG4gICAgdXVpZDogcmVhZGVyVXVpZCxcbiAgICB0aW1lOiB0aW1lLFxuICAgIGRhdGE6IG1lc3NhZ2VKc29uXG4gIH07XG4gIHZhciB0cmFuc2FjdGlvbiA9IGRiLnRyYW5zYWN0aW9uKFtPQkpFQ1RfU1RPUkVfSURdLCAncmVhZHdyaXRlJyk7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzLCByZWopIHtcbiAgICB0cmFuc2FjdGlvbi5vbmNvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHJlcygpO1xuICAgIH07XG5cbiAgICB0cmFuc2FjdGlvbi5vbmVycm9yID0gZnVuY3Rpb24gKGV2KSB7XG4gICAgICByZXR1cm4gcmVqKGV2KTtcbiAgICB9O1xuXG4gICAgdmFyIG9iamVjdFN0b3JlID0gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoT0JKRUNUX1NUT1JFX0lEKTtcbiAgICBvYmplY3RTdG9yZS5hZGQod3JpdGVPYmplY3QpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0QWxsTWVzc2FnZXMoZGIpIHtcbiAgdmFyIG9iamVjdFN0b3JlID0gZGIudHJhbnNhY3Rpb24oT0JKRUNUX1NUT1JFX0lEKS5vYmplY3RTdG9yZShPQkpFQ1RfU1RPUkVfSUQpO1xuICB2YXIgcmV0ID0gW107XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzKSB7XG4gICAgb2JqZWN0U3RvcmUub3BlbkN1cnNvcigpLm9uc3VjY2VzcyA9IGZ1bmN0aW9uIChldikge1xuICAgICAgdmFyIGN1cnNvciA9IGV2LnRhcmdldC5yZXN1bHQ7XG5cbiAgICAgIGlmIChjdXJzb3IpIHtcbiAgICAgICAgcmV0LnB1c2goY3Vyc29yLnZhbHVlKTsgLy9hbGVydChcIk5hbWUgZm9yIFNTTiBcIiArIGN1cnNvci5rZXkgKyBcIiBpcyBcIiArIGN1cnNvci52YWx1ZS5uYW1lKTtcblxuICAgICAgICBjdXJzb3JbXCJjb250aW51ZVwiXSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzKHJldCk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldE1lc3NhZ2VzSGlnaGVyVGhlbihkYiwgbGFzdEN1cnNvcklkKSB7XG4gIHZhciBvYmplY3RTdG9yZSA9IGRiLnRyYW5zYWN0aW9uKE9CSkVDVF9TVE9SRV9JRCkub2JqZWN0U3RvcmUoT0JKRUNUX1NUT1JFX0lEKTtcbiAgdmFyIHJldCA9IFtdO1xuICB2YXIga2V5UmFuZ2VWYWx1ZSA9IElEQktleVJhbmdlLmJvdW5kKGxhc3RDdXJzb3JJZCArIDEsIEluZmluaXR5KTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXMpIHtcbiAgICBvYmplY3RTdG9yZS5vcGVuQ3Vyc29yKGtleVJhbmdlVmFsdWUpLm9uc3VjY2VzcyA9IGZ1bmN0aW9uIChldikge1xuICAgICAgdmFyIGN1cnNvciA9IGV2LnRhcmdldC5yZXN1bHQ7XG5cbiAgICAgIGlmIChjdXJzb3IpIHtcbiAgICAgICAgcmV0LnB1c2goY3Vyc29yLnZhbHVlKTsgLy9hbGVydChcIk5hbWUgZm9yIFNTTiBcIiArIGN1cnNvci5rZXkgKyBcIiBpcyBcIiArIGN1cnNvci52YWx1ZS5uYW1lKTtcblxuICAgICAgICBjdXJzb3JbXCJjb250aW51ZVwiXSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzKHJldCk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZU1lc3NhZ2VCeUlkKGRiLCBpZCkge1xuICB2YXIgcmVxdWVzdCA9IGRiLnRyYW5zYWN0aW9uKFtPQkpFQ1RfU1RPUkVfSURdLCAncmVhZHdyaXRlJykub2JqZWN0U3RvcmUoT0JKRUNUX1NUT1JFX0lEKVtcImRlbGV0ZVwiXShpZCk7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzKSB7XG4gICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gcmVzKCk7XG4gICAgfTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldE9sZE1lc3NhZ2VzKGRiLCB0dGwpIHtcbiAgdmFyIG9sZGVyVGhlbiA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gdHRsO1xuICB2YXIgb2JqZWN0U3RvcmUgPSBkYi50cmFuc2FjdGlvbihPQkpFQ1RfU1RPUkVfSUQpLm9iamVjdFN0b3JlKE9CSkVDVF9TVE9SRV9JRCk7XG4gIHZhciByZXQgPSBbXTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXMpIHtcbiAgICBvYmplY3RTdG9yZS5vcGVuQ3Vyc29yKCkub25zdWNjZXNzID0gZnVuY3Rpb24gKGV2KSB7XG4gICAgICB2YXIgY3Vyc29yID0gZXYudGFyZ2V0LnJlc3VsdDtcblxuICAgICAgaWYgKGN1cnNvcikge1xuICAgICAgICB2YXIgbXNnT2JrID0gY3Vyc29yLnZhbHVlO1xuXG4gICAgICAgIGlmIChtc2dPYmsudGltZSA8IG9sZGVyVGhlbikge1xuICAgICAgICAgIHJldC5wdXNoKG1zZ09iayk7IC8vYWxlcnQoXCJOYW1lIGZvciBTU04gXCIgKyBjdXJzb3Iua2V5ICsgXCIgaXMgXCIgKyBjdXJzb3IudmFsdWUubmFtZSk7XG5cbiAgICAgICAgICBjdXJzb3JbXCJjb250aW51ZVwiXSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIG5vIG1vcmUgb2xkIG1lc3NhZ2VzLFxuICAgICAgICAgIHJlcyhyZXQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzKHJldCk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGNsZWFuT2xkTWVzc2FnZXMoZGIsIHR0bCkge1xuICByZXR1cm4gZ2V0T2xkTWVzc2FnZXMoZGIsIHR0bCkudGhlbihmdW5jdGlvbiAodG9vT2xkKSB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHRvb09sZC5tYXAoZnVuY3Rpb24gKG1zZ09iaikge1xuICAgICAgcmV0dXJuIHJlbW92ZU1lc3NhZ2VCeUlkKGRiLCBtc2dPYmouaWQpO1xuICAgIH0pKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZShjaGFubmVsTmFtZSwgb3B0aW9ucykge1xuICBvcHRpb25zID0gKDAsIF9vcHRpb25zLmZpbGxPcHRpb25zV2l0aERlZmF1bHRzKShvcHRpb25zKTtcbiAgcmV0dXJuIGNyZWF0ZURhdGFiYXNlKGNoYW5uZWxOYW1lKS50aGVuKGZ1bmN0aW9uIChkYikge1xuICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgIGNsb3NlZDogZmFsc2UsXG4gICAgICBsYXN0Q3Vyc29ySWQ6IDAsXG4gICAgICBjaGFubmVsTmFtZTogY2hhbm5lbE5hbWUsXG4gICAgICBvcHRpb25zOiBvcHRpb25zLFxuICAgICAgdXVpZDogKDAsIF91dGlsLnJhbmRvbVRva2VuKSgxMCksXG5cbiAgICAgIC8qKlxuICAgICAgICogZW1pdHRlZE1lc3NhZ2VzSWRzXG4gICAgICAgKiBjb250YWlucyBhbGwgbWVzc2FnZXMgdGhhdCBoYXZlIGJlZW4gZW1pdHRlZCBiZWZvcmVcbiAgICAgICAqIEB0eXBlIHtPYmxpdmlvdXNTZXR9XG4gICAgICAgKi9cbiAgICAgIGVNSXM6IG5ldyBfb2JsaXZpb3VzU2V0W1wiZGVmYXVsdFwiXShvcHRpb25zLmlkYi50dGwgKiAyKSxcbiAgICAgIC8vIGVuc3VyZXMgd2UgZG8gbm90IHJlYWQgbWVzc2FnZXMgaW4gcGFycmFsbGVsXG4gICAgICB3cml0ZUJsb2NrUHJvbWlzZTogUHJvbWlzZS5yZXNvbHZlKCksXG4gICAgICBtZXNzYWdlc0NhbGxiYWNrOiBudWxsLFxuICAgICAgcmVhZFF1ZXVlUHJvbWlzZXM6IFtdLFxuICAgICAgZGI6IGRiXG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBpZiBzZXJ2aWNlLXdvcmtlcnMgYXJlIHVzZWQsXG4gICAgICogd2UgaGF2ZSBubyAnc3RvcmFnZSctZXZlbnQgaWYgdGhleSBwb3N0IGEgbWVzc2FnZSxcbiAgICAgKiB0aGVyZWZvcmUgd2UgYWxzbyBoYXZlIHRvIHNldCBhbiBpbnRlcnZhbFxuICAgICAqL1xuXG4gICAgX3JlYWRMb29wKHN0YXRlKTtcblxuICAgIHJldHVybiBzdGF0ZTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIF9yZWFkTG9vcChzdGF0ZSkge1xuICBpZiAoc3RhdGUuY2xvc2VkKSByZXR1cm47XG4gIHJldHVybiByZWFkTmV3TWVzc2FnZXMoc3RhdGUpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAoMCwgX3V0aWwuc2xlZXApKHN0YXRlLm9wdGlvbnMuaWRiLmZhbGxiYWNrSW50ZXJ2YWwpO1xuICB9KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gX3JlYWRMb29wKHN0YXRlKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIF9maWx0ZXJNZXNzYWdlKG1zZ09iaiwgc3RhdGUpIHtcbiAgaWYgKG1zZ09iai51dWlkID09PSBzdGF0ZS51dWlkKSByZXR1cm4gZmFsc2U7IC8vIHNlbmQgYnkgb3duXG5cbiAgaWYgKHN0YXRlLmVNSXMuaGFzKG1zZ09iai5pZCkpIHJldHVybiBmYWxzZTsgLy8gYWxyZWFkeSBlbWl0dGVkXG5cbiAgaWYgKG1zZ09iai5kYXRhLnRpbWUgPCBzdGF0ZS5tZXNzYWdlc0NhbGxiYWNrVGltZSkgcmV0dXJuIGZhbHNlOyAvLyBvbGRlciB0aGVuIG9uTWVzc2FnZUNhbGxiYWNrXG5cbiAgcmV0dXJuIHRydWU7XG59XG4vKipcbiAqIHJlYWRzIGFsbCBuZXcgbWVzc2FnZXMgZnJvbSB0aGUgZGF0YWJhc2UgYW5kIGVtaXRzIHRoZW1cbiAqL1xuXG5cbmZ1bmN0aW9uIHJlYWROZXdNZXNzYWdlcyhzdGF0ZSkge1xuICAvLyBjaGFubmVsIGFscmVhZHkgY2xvc2VkXG4gIGlmIChzdGF0ZS5jbG9zZWQpIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTsgLy8gaWYgbm8gb25lIGlzIGxpc3RlbmluZywgd2UgZG8gbm90IG5lZWQgdG8gc2NhbiBmb3IgbmV3IG1lc3NhZ2VzXG5cbiAgaWYgKCFzdGF0ZS5tZXNzYWdlc0NhbGxiYWNrKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIHJldHVybiBnZXRNZXNzYWdlc0hpZ2hlclRoZW4oc3RhdGUuZGIsIHN0YXRlLmxhc3RDdXJzb3JJZCkudGhlbihmdW5jdGlvbiAobmV3ZXJNZXNzYWdlcykge1xuICAgIHZhciB1c2VNZXNzYWdlcyA9IG5ld2VyTWVzc2FnZXMubWFwKGZ1bmN0aW9uIChtc2dPYmopIHtcbiAgICAgIGlmIChtc2dPYmouaWQgPiBzdGF0ZS5sYXN0Q3Vyc29ySWQpIHtcbiAgICAgICAgc3RhdGUubGFzdEN1cnNvcklkID0gbXNnT2JqLmlkO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbXNnT2JqO1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAobXNnT2JqKSB7XG4gICAgICByZXR1cm4gX2ZpbHRlck1lc3NhZ2UobXNnT2JqLCBzdGF0ZSk7XG4gICAgfSkuc29ydChmdW5jdGlvbiAobXNnT2JqQSwgbXNnT2JqQikge1xuICAgICAgcmV0dXJuIG1zZ09iakEudGltZSAtIG1zZ09iakIudGltZTtcbiAgICB9KTsgLy8gc29ydCBieSB0aW1lXG5cbiAgICB1c2VNZXNzYWdlcy5mb3JFYWNoKGZ1bmN0aW9uIChtc2dPYmopIHtcbiAgICAgIGlmIChzdGF0ZS5tZXNzYWdlc0NhbGxiYWNrKSB7XG4gICAgICAgIHN0YXRlLmVNSXMuYWRkKG1zZ09iai5pZCk7XG4gICAgICAgIHN0YXRlLm1lc3NhZ2VzQ2FsbGJhY2sobXNnT2JqLmRhdGEpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGNsb3NlKGNoYW5uZWxTdGF0ZSkge1xuICBjaGFubmVsU3RhdGUuY2xvc2VkID0gdHJ1ZTtcbiAgY2hhbm5lbFN0YXRlLmRiLmNsb3NlKCk7XG59XG5cbmZ1bmN0aW9uIHBvc3RNZXNzYWdlKGNoYW5uZWxTdGF0ZSwgbWVzc2FnZUpzb24pIHtcbiAgY2hhbm5lbFN0YXRlLndyaXRlQmxvY2tQcm9taXNlID0gY2hhbm5lbFN0YXRlLndyaXRlQmxvY2tQcm9taXNlLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB3cml0ZU1lc3NhZ2UoY2hhbm5lbFN0YXRlLmRiLCBjaGFubmVsU3RhdGUudXVpZCwgbWVzc2FnZUpzb24pO1xuICB9KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoKDAsIF91dGlsLnJhbmRvbUludCkoMCwgMTApID09PSAwKSB7XG4gICAgICAvKiBhd2FpdCAoZG8gbm90IGF3YWl0KSAqL1xuICAgICAgY2xlYW5PbGRNZXNzYWdlcyhjaGFubmVsU3RhdGUuZGIsIGNoYW5uZWxTdGF0ZS5vcHRpb25zLmlkYi50dGwpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBjaGFubmVsU3RhdGUud3JpdGVCbG9ja1Byb21pc2U7XG59XG5cbmZ1bmN0aW9uIG9uTWVzc2FnZShjaGFubmVsU3RhdGUsIGZuLCB0aW1lKSB7XG4gIGNoYW5uZWxTdGF0ZS5tZXNzYWdlc0NhbGxiYWNrVGltZSA9IHRpbWU7XG4gIGNoYW5uZWxTdGF0ZS5tZXNzYWdlc0NhbGxiYWNrID0gZm47XG4gIHJlYWROZXdNZXNzYWdlcyhjaGFubmVsU3RhdGUpO1xufVxuXG5mdW5jdGlvbiBjYW5CZVVzZWQoKSB7XG4gIGlmIChfZGV0ZWN0Tm9kZVtcImRlZmF1bHRcIl0pIHJldHVybiBmYWxzZTtcbiAgdmFyIGlkYiA9IGdldElkYigpO1xuICBpZiAoIWlkYikgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gYXZlcmFnZVJlc3BvbnNlVGltZShvcHRpb25zKSB7XG4gIHJldHVybiBvcHRpb25zLmlkYi5mYWxsYmFja0ludGVydmFsICogMjtcbn1cblxudmFyIF9kZWZhdWx0ID0ge1xuICBjcmVhdGU6IGNyZWF0ZSxcbiAgY2xvc2U6IGNsb3NlLFxuICBvbk1lc3NhZ2U6IG9uTWVzc2FnZSxcbiAgcG9zdE1lc3NhZ2U6IHBvc3RNZXNzYWdlLFxuICBjYW5CZVVzZWQ6IGNhbkJlVXNlZCxcbiAgdHlwZTogdHlwZSxcbiAgYXZlcmFnZVJlc3BvbnNlVGltZTogYXZlcmFnZVJlc3BvbnNlVGltZSxcbiAgbWljcm9TZWNvbmRzOiBtaWNyb1NlY29uZHNcbn07XG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IF9kZWZhdWx0OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlRGVmYXVsdCA9IHJlcXVpcmUoXCJAYmFiZWwvcnVudGltZS9oZWxwZXJzL2ludGVyb3BSZXF1aXJlRGVmYXVsdFwiKTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZ2V0TG9jYWxTdG9yYWdlID0gZ2V0TG9jYWxTdG9yYWdlO1xuZXhwb3J0cy5zdG9yYWdlS2V5ID0gc3RvcmFnZUtleTtcbmV4cG9ydHMucG9zdE1lc3NhZ2UgPSBwb3N0TWVzc2FnZTtcbmV4cG9ydHMuYWRkU3RvcmFnZUV2ZW50TGlzdGVuZXIgPSBhZGRTdG9yYWdlRXZlbnRMaXN0ZW5lcjtcbmV4cG9ydHMucmVtb3ZlU3RvcmFnZUV2ZW50TGlzdGVuZXIgPSByZW1vdmVTdG9yYWdlRXZlbnRMaXN0ZW5lcjtcbmV4cG9ydHMuY3JlYXRlID0gY3JlYXRlO1xuZXhwb3J0cy5jbG9zZSA9IGNsb3NlO1xuZXhwb3J0cy5vbk1lc3NhZ2UgPSBvbk1lc3NhZ2U7XG5leHBvcnRzLmNhbkJlVXNlZCA9IGNhbkJlVXNlZDtcbmV4cG9ydHMuYXZlcmFnZVJlc3BvbnNlVGltZSA9IGF2ZXJhZ2VSZXNwb25zZVRpbWU7XG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IGV4cG9ydHMudHlwZSA9IGV4cG9ydHMubWljcm9TZWNvbmRzID0gdm9pZCAwO1xuXG52YXIgX2RldGVjdE5vZGUgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCJkZXRlY3Qtbm9kZVwiKSk7XG5cbnZhciBfb2JsaXZpb3VzU2V0ID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi4vb2JsaXZpb3VzLXNldFwiKSk7XG5cbnZhciBfb3B0aW9ucyA9IHJlcXVpcmUoXCIuLi9vcHRpb25zXCIpO1xuXG52YXIgX3V0aWwgPSByZXF1aXJlKFwiLi4vdXRpbFwiKTtcblxuLyoqXG4gKiBBIGxvY2FsU3RvcmFnZS1vbmx5IG1ldGhvZCB3aGljaCB1c2VzIGxvY2Fsc3RvcmFnZSBhbmQgaXRzICdzdG9yYWdlJy1ldmVudFxuICogVGhpcyBkb2VzIG5vdCB3b3JrIGluc2lkZSBvZiB3ZWJ3b3JrZXJzIGJlY2F1c2UgdGhleSBoYXZlIG5vIGFjY2VzcyB0byBsb2Nhc3RvcmFnZVxuICogVGhpcyBpcyBiYXNpY2FsbHkgaW1wbGVtZW50ZWQgdG8gc3VwcG9ydCBJRTkgb3IgeW91ciBncmFuZG1vdGhlcnMgdG9hc3Rlci5cbiAqIEBsaW5rIGh0dHBzOi8vY2FuaXVzZS5jb20vI2ZlYXQ9bmFtZXZhbHVlLXN0b3JhZ2VcbiAqIEBsaW5rIGh0dHBzOi8vY2FuaXVzZS5jb20vI2ZlYXQ9aW5kZXhlZGRiXG4gKi9cbnZhciBtaWNyb1NlY29uZHMgPSBfdXRpbC5taWNyb1NlY29uZHM7XG5leHBvcnRzLm1pY3JvU2Vjb25kcyA9IG1pY3JvU2Vjb25kcztcbnZhciBLRVlfUFJFRklYID0gJ3B1YmtleS5icm9hZGNhc3RDaGFubmVsLSc7XG52YXIgdHlwZSA9ICdsb2NhbHN0b3JhZ2UnO1xuLyoqXG4gKiBjb3BpZWQgZnJvbSBjcm9zc3RhYlxuICogQGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL3RlamFjcXVlcy9jcm9zc3RhYi9ibG9iL21hc3Rlci9zcmMvY3Jvc3N0YWIuanMjTDMyXG4gKi9cblxuZXhwb3J0cy50eXBlID0gdHlwZTtcblxuZnVuY3Rpb24gZ2V0TG9jYWxTdG9yYWdlKCkge1xuICB2YXIgbG9jYWxTdG9yYWdlO1xuICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiBudWxsO1xuXG4gIHRyeSB7XG4gICAgbG9jYWxTdG9yYWdlID0gd2luZG93LmxvY2FsU3RvcmFnZTtcbiAgICBsb2NhbFN0b3JhZ2UgPSB3aW5kb3dbJ2llOC1ldmVudGxpc3RlbmVyL3N0b3JhZ2UnXSB8fCB3aW5kb3cubG9jYWxTdG9yYWdlO1xuICB9IGNhdGNoIChlKSB7Ly8gTmV3IHZlcnNpb25zIG9mIEZpcmVmb3ggdGhyb3cgYSBTZWN1cml0eSBleGNlcHRpb25cbiAgICAvLyBpZiBjb29raWVzIGFyZSBkaXNhYmxlZC4gU2VlXG4gICAgLy8gaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTAyODE1M1xuICB9XG5cbiAgcmV0dXJuIGxvY2FsU3RvcmFnZTtcbn1cblxuZnVuY3Rpb24gc3RvcmFnZUtleShjaGFubmVsTmFtZSkge1xuICByZXR1cm4gS0VZX1BSRUZJWCArIGNoYW5uZWxOYW1lO1xufVxuLyoqXG4qIHdyaXRlcyB0aGUgbmV3IG1lc3NhZ2UgdG8gdGhlIHN0b3JhZ2VcbiogYW5kIGZpcmVzIHRoZSBzdG9yYWdlLWV2ZW50IHNvIG90aGVyIHJlYWRlcnMgY2FuIGZpbmQgaXRcbiovXG5cblxuZnVuY3Rpb24gcG9zdE1lc3NhZ2UoY2hhbm5lbFN0YXRlLCBtZXNzYWdlSnNvbikge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlcykge1xuICAgICgwLCBfdXRpbC5zbGVlcCkoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBrZXkgPSBzdG9yYWdlS2V5KGNoYW5uZWxTdGF0ZS5jaGFubmVsTmFtZSk7XG4gICAgICB2YXIgd3JpdGVPYmogPSB7XG4gICAgICAgIHRva2VuOiAoMCwgX3V0aWwucmFuZG9tVG9rZW4pKDEwKSxcbiAgICAgICAgdGltZTogbmV3IERhdGUoKS5nZXRUaW1lKCksXG4gICAgICAgIGRhdGE6IG1lc3NhZ2VKc29uLFxuICAgICAgICB1dWlkOiBjaGFubmVsU3RhdGUudXVpZFxuICAgICAgfTtcbiAgICAgIHZhciB2YWx1ZSA9IEpTT04uc3RyaW5naWZ5KHdyaXRlT2JqKTtcbiAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGtleSwgdmFsdWUpO1xuICAgICAgLyoqXG4gICAgICAgKiBTdG9yYWdlRXZlbnQgZG9lcyBub3QgZmlyZSB0aGUgJ3N0b3JhZ2UnIGV2ZW50XG4gICAgICAgKiBpbiB0aGUgd2luZG93IHRoYXQgY2hhbmdlcyB0aGUgc3RhdGUgb2YgdGhlIGxvY2FsIHN0b3JhZ2UuXG4gICAgICAgKiBTbyB3ZSBmaXJlIGl0IG1hbnVhbGx5XG4gICAgICAgKi9cblxuICAgICAgdmFyIGV2ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG4gICAgICBldi5pbml0RXZlbnQoJ3N0b3JhZ2UnLCB0cnVlLCB0cnVlKTtcbiAgICAgIGV2LmtleSA9IGtleTtcbiAgICAgIGV2Lm5ld1ZhbHVlID0gdmFsdWU7XG4gICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldik7XG4gICAgICByZXMoKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGFkZFN0b3JhZ2VFdmVudExpc3RlbmVyKGNoYW5uZWxOYW1lLCBmbikge1xuICB2YXIga2V5ID0gc3RvcmFnZUtleShjaGFubmVsTmFtZSk7XG5cbiAgdmFyIGxpc3RlbmVyID0gZnVuY3Rpb24gbGlzdGVuZXIoZXYpIHtcbiAgICBpZiAoZXYua2V5ID09PSBrZXkpIHtcbiAgICAgIGZuKEpTT04ucGFyc2UoZXYubmV3VmFsdWUpKTtcbiAgICB9XG4gIH07XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3N0b3JhZ2UnLCBsaXN0ZW5lcik7XG4gIHJldHVybiBsaXN0ZW5lcjtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlU3RvcmFnZUV2ZW50TGlzdGVuZXIobGlzdGVuZXIpIHtcbiAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3N0b3JhZ2UnLCBsaXN0ZW5lcik7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZShjaGFubmVsTmFtZSwgb3B0aW9ucykge1xuICBvcHRpb25zID0gKDAsIF9vcHRpb25zLmZpbGxPcHRpb25zV2l0aERlZmF1bHRzKShvcHRpb25zKTtcblxuICBpZiAoIWNhbkJlVXNlZCgpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCcm9hZGNhc3RDaGFubmVsOiBsb2NhbHN0b3JhZ2UgY2Fubm90IGJlIHVzZWQnKTtcbiAgfVxuXG4gIHZhciB1dWlkID0gKDAsIF91dGlsLnJhbmRvbVRva2VuKSgxMCk7XG4gIC8qKlxuICAgKiBlTUlzXG4gICAqIGNvbnRhaW5zIGFsbCBtZXNzYWdlcyB0aGF0IGhhdmUgYmVlbiBlbWl0dGVkIGJlZm9yZVxuICAgKiBAdHlwZSB7T2JsaXZpb3VzU2V0fVxuICAgKi9cblxuICB2YXIgZU1JcyA9IG5ldyBfb2JsaXZpb3VzU2V0W1wiZGVmYXVsdFwiXShvcHRpb25zLmxvY2Fsc3RvcmFnZS5yZW1vdmVUaW1lb3V0KTtcbiAgdmFyIHN0YXRlID0ge1xuICAgIGNoYW5uZWxOYW1lOiBjaGFubmVsTmFtZSxcbiAgICB1dWlkOiB1dWlkLFxuICAgIGVNSXM6IGVNSXMgLy8gZW1pdHRlZE1lc3NhZ2VzSWRzXG5cbiAgfTtcbiAgc3RhdGUubGlzdGVuZXIgPSBhZGRTdG9yYWdlRXZlbnRMaXN0ZW5lcihjaGFubmVsTmFtZSwgZnVuY3Rpb24gKG1zZ09iaikge1xuICAgIGlmICghc3RhdGUubWVzc2FnZXNDYWxsYmFjaykgcmV0dXJuOyAvLyBubyBsaXN0ZW5lclxuXG4gICAgaWYgKG1zZ09iai51dWlkID09PSB1dWlkKSByZXR1cm47IC8vIG93biBtZXNzYWdlXG5cbiAgICBpZiAoIW1zZ09iai50b2tlbiB8fCBlTUlzLmhhcyhtc2dPYmoudG9rZW4pKSByZXR1cm47IC8vIGFscmVhZHkgZW1pdHRlZFxuXG4gICAgaWYgKG1zZ09iai5kYXRhLnRpbWUgJiYgbXNnT2JqLmRhdGEudGltZSA8IHN0YXRlLm1lc3NhZ2VzQ2FsbGJhY2tUaW1lKSByZXR1cm47IC8vIHRvbyBvbGRcblxuICAgIGVNSXMuYWRkKG1zZ09iai50b2tlbik7XG4gICAgc3RhdGUubWVzc2FnZXNDYWxsYmFjayhtc2dPYmouZGF0YSk7XG4gIH0pO1xuICByZXR1cm4gc3RhdGU7XG59XG5cbmZ1bmN0aW9uIGNsb3NlKGNoYW5uZWxTdGF0ZSkge1xuICByZW1vdmVTdG9yYWdlRXZlbnRMaXN0ZW5lcihjaGFubmVsU3RhdGUubGlzdGVuZXIpO1xufVxuXG5mdW5jdGlvbiBvbk1lc3NhZ2UoY2hhbm5lbFN0YXRlLCBmbiwgdGltZSkge1xuICBjaGFubmVsU3RhdGUubWVzc2FnZXNDYWxsYmFja1RpbWUgPSB0aW1lO1xuICBjaGFubmVsU3RhdGUubWVzc2FnZXNDYWxsYmFjayA9IGZuO1xufVxuXG5mdW5jdGlvbiBjYW5CZVVzZWQoKSB7XG4gIGlmIChfZGV0ZWN0Tm9kZVtcImRlZmF1bHRcIl0pIHJldHVybiBmYWxzZTtcbiAgdmFyIGxzID0gZ2V0TG9jYWxTdG9yYWdlKCk7XG4gIGlmICghbHMpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGF2ZXJhZ2VSZXNwb25zZVRpbWUoKSB7XG4gIHJldHVybiAxMjA7XG59XG5cbnZhciBfZGVmYXVsdCA9IHtcbiAgY3JlYXRlOiBjcmVhdGUsXG4gIGNsb3NlOiBjbG9zZSxcbiAgb25NZXNzYWdlOiBvbk1lc3NhZ2UsXG4gIHBvc3RNZXNzYWdlOiBwb3N0TWVzc2FnZSxcbiAgY2FuQmVVc2VkOiBjYW5CZVVzZWQsXG4gIHR5cGU6IHR5cGUsXG4gIGF2ZXJhZ2VSZXNwb25zZVRpbWU6IGF2ZXJhZ2VSZXNwb25zZVRpbWUsXG4gIG1pY3JvU2Vjb25kczogbWljcm9TZWNvbmRzXG59O1xuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBfZGVmYXVsdDsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQgPSByZXF1aXJlKFwiQGJhYmVsL3J1bnRpbWUvaGVscGVycy9pbnRlcm9wUmVxdWlyZURlZmF1bHRcIik7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmNyZWF0ZSA9IGNyZWF0ZTtcbmV4cG9ydHMuY2xvc2UgPSBjbG9zZTtcbmV4cG9ydHMucG9zdE1lc3NhZ2UgPSBwb3N0TWVzc2FnZTtcbmV4cG9ydHMub25NZXNzYWdlID0gb25NZXNzYWdlO1xuZXhwb3J0cy5jYW5CZVVzZWQgPSBjYW5CZVVzZWQ7XG5leHBvcnRzLmF2ZXJhZ2VSZXNwb25zZVRpbWUgPSBhdmVyYWdlUmVzcG9uc2VUaW1lO1xuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBleHBvcnRzLnR5cGUgPSBleHBvcnRzLm1pY3JvU2Vjb25kcyA9IHZvaWQgMDtcblxudmFyIF9kZXRlY3ROb2RlID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiZGV0ZWN0LW5vZGVcIikpO1xuXG52YXIgX3V0aWwgPSByZXF1aXJlKFwiLi4vdXRpbFwiKTtcblxudmFyIG1pY3JvU2Vjb25kcyA9IF91dGlsLm1pY3JvU2Vjb25kcztcbmV4cG9ydHMubWljcm9TZWNvbmRzID0gbWljcm9TZWNvbmRzO1xudmFyIHR5cGUgPSAnbmF0aXZlJztcbmV4cG9ydHMudHlwZSA9IHR5cGU7XG5cbmZ1bmN0aW9uIGNyZWF0ZShjaGFubmVsTmFtZSkge1xuICB2YXIgc3RhdGUgPSB7XG4gICAgbWVzc2FnZXNDYWxsYmFjazogbnVsbCxcbiAgICBiYzogbmV3IEJyb2FkY2FzdENoYW5uZWwoY2hhbm5lbE5hbWUpLFxuICAgIHN1YkZuczogW10gLy8gc3Vic2NyaWJlckZ1bmN0aW9uc1xuXG4gIH07XG5cbiAgc3RhdGUuYmMub25tZXNzYWdlID0gZnVuY3Rpb24gKG1zZykge1xuICAgIGlmIChzdGF0ZS5tZXNzYWdlc0NhbGxiYWNrKSB7XG4gICAgICBzdGF0ZS5tZXNzYWdlc0NhbGxiYWNrKG1zZy5kYXRhKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIHN0YXRlO1xufVxuXG5mdW5jdGlvbiBjbG9zZShjaGFubmVsU3RhdGUpIHtcbiAgY2hhbm5lbFN0YXRlLmJjLmNsb3NlKCk7XG4gIGNoYW5uZWxTdGF0ZS5zdWJGbnMgPSBbXTtcbn1cblxuZnVuY3Rpb24gcG9zdE1lc3NhZ2UoY2hhbm5lbFN0YXRlLCBtZXNzYWdlSnNvbikge1xuICBjaGFubmVsU3RhdGUuYmMucG9zdE1lc3NhZ2UobWVzc2FnZUpzb24sIGZhbHNlKTtcbn1cblxuZnVuY3Rpb24gb25NZXNzYWdlKGNoYW5uZWxTdGF0ZSwgZm4sIHRpbWUpIHtcbiAgY2hhbm5lbFN0YXRlLm1lc3NhZ2VzQ2FsbGJhY2tUaW1lID0gdGltZTtcbiAgY2hhbm5lbFN0YXRlLm1lc3NhZ2VzQ2FsbGJhY2sgPSBmbjtcbn1cblxuZnVuY3Rpb24gY2FuQmVVc2VkKCkge1xuICAvKipcbiAgICogaW4gdGhlIGVsZWN0cm9uLXJlbmRlcmVyLCBpc05vZGUgd2lsbCBiZSB0cnVlIGV2ZW4gaWYgd2UgYXJlIGluIGJyb3dzZXItY29udGV4dFxuICAgKiBzbyB3ZSBhbHNvIGNoZWNrIGlmIHdpbmRvdyBpcyB1bmRlZmluZWRcbiAgICovXG4gIGlmIChfZGV0ZWN0Tm9kZVtcImRlZmF1bHRcIl0gJiYgdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiBmYWxzZTtcblxuICBpZiAodHlwZW9mIEJyb2FkY2FzdENoYW5uZWwgPT09ICdmdW5jdGlvbicpIHtcbiAgICBpZiAoQnJvYWRjYXN0Q2hhbm5lbC5fcHVia2V5KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Jyb2FkY2FzdENoYW5uZWw6IERvIG5vdCBvdmVyd3JpdGUgd2luZG93LkJyb2FkY2FzdENoYW5uZWwgd2l0aCB0aGlzIG1vZHVsZSwgdGhpcyBpcyBub3QgYSBwb2x5ZmlsbCcpO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBhdmVyYWdlUmVzcG9uc2VUaW1lKCkge1xuICByZXR1cm4gMTAwO1xufVxuXG52YXIgX2RlZmF1bHQgPSB7XG4gIGNyZWF0ZTogY3JlYXRlLFxuICBjbG9zZTogY2xvc2UsXG4gIG9uTWVzc2FnZTogb25NZXNzYWdlLFxuICBwb3N0TWVzc2FnZTogcG9zdE1lc3NhZ2UsXG4gIGNhbkJlVXNlZDogY2FuQmVVc2VkLFxuICB0eXBlOiB0eXBlLFxuICBhdmVyYWdlUmVzcG9uc2VUaW1lOiBhdmVyYWdlUmVzcG9uc2VUaW1lLFxuICBtaWNyb1NlY29uZHM6IG1pY3JvU2Vjb25kc1xufTtcbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gX2RlZmF1bHQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLl9yZW1vdmVUb29PbGRWYWx1ZXMgPSBfcmVtb3ZlVG9vT2xkVmFsdWVzO1xuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSB2b2lkIDA7XG5cbi8qKlxuICpcbiAqXG4gKi9cbnZhciBPYmxpdmlvdXNTZXQgPSBmdW5jdGlvbiBPYmxpdmlvdXNTZXQodHRsKSB7XG4gIHRoaXMudHRsID0gdHRsO1xuICB0aGlzLnNldCA9IG5ldyBTZXQoKTtcbiAgdGhpcy50aW1lTWFwID0gbmV3IE1hcCgpO1xuICB0aGlzLmhhcyA9IHRoaXMuc2V0Lmhhcy5iaW5kKHRoaXMuc2V0KTtcbn07XG5cbk9ibGl2aW91c1NldC5wcm90b3R5cGUgPSB7XG4gIGFkZDogZnVuY3Rpb24gYWRkKHZhbHVlKSB7XG4gICAgdGhpcy50aW1lTWFwLnNldCh2YWx1ZSwgbm93KCkpO1xuICAgIHRoaXMuc2V0LmFkZCh2YWx1ZSk7XG5cbiAgICBfcmVtb3ZlVG9vT2xkVmFsdWVzKHRoaXMpO1xuICB9LFxuICBjbGVhcjogZnVuY3Rpb24gY2xlYXIoKSB7XG4gICAgdGhpcy5zZXQuY2xlYXIoKTtcbiAgICB0aGlzLnRpbWVNYXAuY2xlYXIoKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gX3JlbW92ZVRvb09sZFZhbHVlcyhvYmxpdmlvdXNTZXQpIHtcbiAgdmFyIG9sZGVyVGhlbiA9IG5vdygpIC0gb2JsaXZpb3VzU2V0LnR0bDtcbiAgdmFyIGl0ZXJhdG9yID0gb2JsaXZpb3VzU2V0LnNldFtTeW1ib2wuaXRlcmF0b3JdKCk7XG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICB2YXIgdmFsdWUgPSBpdGVyYXRvci5uZXh0KCkudmFsdWU7XG4gICAgaWYgKCF2YWx1ZSkgcmV0dXJuOyAvLyBubyBtb3JlIGVsZW1lbnRzXG5cbiAgICB2YXIgdGltZSA9IG9ibGl2aW91c1NldC50aW1lTWFwLmdldCh2YWx1ZSk7XG5cbiAgICBpZiAodGltZSA8IG9sZGVyVGhlbikge1xuICAgICAgb2JsaXZpb3VzU2V0LnRpbWVNYXBbXCJkZWxldGVcIl0odmFsdWUpO1xuICAgICAgb2JsaXZpb3VzU2V0LnNldFtcImRlbGV0ZVwiXSh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHdlIHJlYWNoZWQgYSB2YWx1ZSB0aGF0IGlzIG5vdCBvbGQgZW5vdWdoXG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG5vdygpIHtcbiAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xufVxuXG52YXIgX2RlZmF1bHQgPSBPYmxpdmlvdXNTZXQ7XG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IF9kZWZhdWx0OyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5maWxsT3B0aW9uc1dpdGhEZWZhdWx0cyA9IGZpbGxPcHRpb25zV2l0aERlZmF1bHRzO1xuXG5mdW5jdGlvbiBmaWxsT3B0aW9uc1dpdGhEZWZhdWx0cyhvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9O1xuICBvcHRpb25zID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7IC8vIG1haW5cblxuICBpZiAodHlwZW9mIG9wdGlvbnMud2ViV29ya2VyU3VwcG9ydCA9PT0gJ3VuZGVmaW5lZCcpIG9wdGlvbnMud2ViV29ya2VyU3VwcG9ydCA9IHRydWU7IC8vIGluZGV4ZWQtZGJcblxuICBpZiAoIW9wdGlvbnMuaWRiKSBvcHRpb25zLmlkYiA9IHt9OyAvLyAgYWZ0ZXIgdGhpcyB0aW1lIHRoZSBtZXNzYWdlcyBnZXQgZGVsZXRlZFxuXG4gIGlmICghb3B0aW9ucy5pZGIudHRsKSBvcHRpb25zLmlkYi50dGwgPSAxMDAwICogNDU7XG4gIGlmICghb3B0aW9ucy5pZGIuZmFsbGJhY2tJbnRlcnZhbCkgb3B0aW9ucy5pZGIuZmFsbGJhY2tJbnRlcnZhbCA9IDE1MDsgLy8gbG9jYWxzdG9yYWdlXG5cbiAgaWYgKCFvcHRpb25zLmxvY2Fsc3RvcmFnZSkgb3B0aW9ucy5sb2NhbHN0b3JhZ2UgPSB7fTtcbiAgaWYgKCFvcHRpb25zLmxvY2Fsc3RvcmFnZS5yZW1vdmVUaW1lb3V0KSBvcHRpb25zLmxvY2Fsc3RvcmFnZS5yZW1vdmVUaW1lb3V0ID0gMTAwMCAqIDYwOyAvLyBub2RlXG5cbiAgaWYgKCFvcHRpb25zLm5vZGUpIG9wdGlvbnMubm9kZSA9IHt9O1xuICBpZiAoIW9wdGlvbnMubm9kZS50dGwpIG9wdGlvbnMubm9kZS50dGwgPSAxMDAwICogNjAgKiAyOyAvLyAyIG1pbnV0ZXM7XG5cbiAgaWYgKHR5cGVvZiBvcHRpb25zLm5vZGUudXNlRmFzdFBhdGggPT09ICd1bmRlZmluZWQnKSBvcHRpb25zLm5vZGUudXNlRmFzdFBhdGggPSB0cnVlO1xuICByZXR1cm4gb3B0aW9ucztcbn0iLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuaXNQcm9taXNlID0gaXNQcm9taXNlO1xuZXhwb3J0cy5zbGVlcCA9IHNsZWVwO1xuZXhwb3J0cy5yYW5kb21JbnQgPSByYW5kb21JbnQ7XG5leHBvcnRzLnJhbmRvbVRva2VuID0gcmFuZG9tVG9rZW47XG5leHBvcnRzLm1pY3JvU2Vjb25kcyA9IG1pY3JvU2Vjb25kcztcblxuLyoqXG4gKiByZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIG9iamVjdCBpcyBhIHByb21pc2VcbiAqL1xuZnVuY3Rpb24gaXNQcm9taXNlKG9iaikge1xuICBpZiAob2JqICYmIHR5cGVvZiBvYmoudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzbGVlcCh0aW1lKSB7XG4gIGlmICghdGltZSkgdGltZSA9IDA7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzKSB7XG4gICAgcmV0dXJuIHNldFRpbWVvdXQocmVzLCB0aW1lKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJhbmRvbUludChtaW4sIG1heCkge1xuICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpICsgbWluKTtcbn1cbi8qKlxuICogaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzEzNDk0MjYvMzQ0MzEzN1xuICovXG5cblxuZnVuY3Rpb24gcmFuZG9tVG9rZW4obGVuZ3RoKSB7XG4gIGlmICghbGVuZ3RoKSBsZW5ndGggPSA1O1xuICB2YXIgdGV4dCA9ICcnO1xuICB2YXIgcG9zc2libGUgPSAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4enkwMTIzNDU2Nzg5JztcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdGV4dCArPSBwb3NzaWJsZS5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcG9zc2libGUubGVuZ3RoKSk7XG4gIH1cblxuICByZXR1cm4gdGV4dDtcbn1cblxudmFyIGxhc3RNcyA9IDA7XG52YXIgYWRkaXRpb25hbCA9IDA7XG4vKipcbiAqIHJldHVybnMgdGhlIGN1cnJlbnQgdGltZSBpbiBtaWNyby1zZWNvbmRzLFxuICogV0FSTklORzogVGhpcyBpcyBhIHBzZXVkby1mdW5jdGlvblxuICogUGVyZm9ybWFuY2Uubm93IGlzIG5vdCByZWxpYWJsZSBpbiB3ZWJ3b3JrZXJzLCBzbyB3ZSBqdXN0IG1ha2Ugc3VyZSB0byBuZXZlciByZXR1cm4gdGhlIHNhbWUgdGltZS5cbiAqIFRoaXMgaXMgZW5vdWdoIGluIGJyb3dzZXJzLCBhbmQgdGhpcyBmdW5jdGlvbiB3aWxsIG5vdCBiZSB1c2VkIGluIG5vZGVqcy5cbiAqIFRoZSBtYWluIHJlYXNvbiBmb3IgdGhpcyBoYWNrIGlzIHRvIGVuc3VyZSB0aGF0IEJyb2FkY2FzdENoYW5uZWwgYmVoYXZlcyBlcXVhbCB0byBwcm9kdWN0aW9uIHdoZW4gaXQgaXMgdXNlZCBpbiBmYXN0LXJ1bm5pbmcgdW5pdCB0ZXN0cy5cbiAqL1xuXG5mdW5jdGlvbiBtaWNyb1NlY29uZHMoKSB7XG4gIHZhciBtcyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4gIGlmIChtcyA9PT0gbGFzdE1zKSB7XG4gICAgYWRkaXRpb25hbCsrO1xuICAgIHJldHVybiBtcyAqIDEwMDAgKyBhZGRpdGlvbmFsO1xuICB9IGVsc2Uge1xuICAgIGxhc3RNcyA9IG1zO1xuICAgIGFkZGl0aW9uYWwgPSAwO1xuICAgIHJldHVybiBtcyAqIDEwMDA7XG4gIH1cbn0iLCJmdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikge1xuICByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDoge1xuICAgIGRlZmF1bHQ6IG9ialxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQ7IiwibW9kdWxlLmV4cG9ydHMgPSBmYWxzZTtcblxuIl19
