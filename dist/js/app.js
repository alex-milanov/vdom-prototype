(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.DeepDiff = factory());
}(this, (function () { 'use strict';

var $scope;
var conflict;
var conflictResolution = [];
if (typeof global === 'object' && global) {
  $scope = global;
} else if (typeof window !== 'undefined') {
  $scope = window;
} else {
  $scope = {};
}
conflict = $scope.DeepDiff;
if (conflict) {
  conflictResolution.push(
    function() {
      if ('undefined' !== typeof conflict && $scope.DeepDiff === accumulateDiff) {
        $scope.DeepDiff = conflict;
        conflict = undefined;
      }
    });
}

// nodejs compatible on server side and in the browser.
function inherits(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
}

function Diff(kind, path) {
  Object.defineProperty(this, 'kind', {
    value: kind,
    enumerable: true
  });
  if (path && path.length) {
    Object.defineProperty(this, 'path', {
      value: path,
      enumerable: true
    });
  }
}

function DiffEdit(path, origin, value) {
  DiffEdit.super_.call(this, 'E', path);
  Object.defineProperty(this, 'lhs', {
    value: origin,
    enumerable: true
  });
  Object.defineProperty(this, 'rhs', {
    value: value,
    enumerable: true
  });
}
inherits(DiffEdit, Diff);

function DiffNew(path, value) {
  DiffNew.super_.call(this, 'N', path);
  Object.defineProperty(this, 'rhs', {
    value: value,
    enumerable: true
  });
}
inherits(DiffNew, Diff);

function DiffDeleted(path, value) {
  DiffDeleted.super_.call(this, 'D', path);
  Object.defineProperty(this, 'lhs', {
    value: value,
    enumerable: true
  });
}
inherits(DiffDeleted, Diff);

function DiffArray(path, index, item) {
  DiffArray.super_.call(this, 'A', path);
  Object.defineProperty(this, 'index', {
    value: index,
    enumerable: true
  });
  Object.defineProperty(this, 'item', {
    value: item,
    enumerable: true
  });
}
inherits(DiffArray, Diff);

function arrayRemove(arr, from, to) {
  var rest = arr.slice((to || from) + 1 || arr.length);
  arr.length = from < 0 ? arr.length + from : from;
  arr.push.apply(arr, rest);
  return arr;
}

function realTypeOf(subject) {
  var type = typeof subject;
  if (type !== 'object') {
    return type;
  }

  if (subject === Math) {
    return 'math';
  } else if (subject === null) {
    return 'null';
  } else if (Array.isArray(subject)) {
    return 'array';
  } else if (Object.prototype.toString.call(subject) === '[object Date]') {
    return 'date';
  } else if (typeof subject.toString === 'function' && /^\/.*\//.test(subject.toString())) {
    return 'regexp';
  }
  return 'object';
}

function deepDiff(lhs, rhs, changes, prefilter, path, key, stack) {
  path = path || [];
  stack = stack || [];
  var currentPath = path.slice(0);
  if (typeof key !== 'undefined') {
    if (prefilter) {
      if (typeof(prefilter) === 'function' && prefilter(currentPath, key)) {
        return; } else if (typeof(prefilter) === 'object') {
        if (prefilter.prefilter && prefilter.prefilter(currentPath, key)) {
          return; }
        if (prefilter.normalize) {
          var alt = prefilter.normalize(currentPath, key, lhs, rhs);
          if (alt) {
            lhs = alt[0];
            rhs = alt[1];
          }
        }
      }
    }
    currentPath.push(key);
  }

  // Use string comparison for regexes
  if (realTypeOf(lhs) === 'regexp' && realTypeOf(rhs) === 'regexp') {
    lhs = lhs.toString();
    rhs = rhs.toString();
  }

  var ltype = typeof lhs;
  var rtype = typeof rhs;

  var ldefined = ltype !== 'undefined' || (stack && stack[stack.length - 1].lhs && stack[stack.length - 1].lhs.hasOwnProperty(key));
  var rdefined = rtype !== 'undefined' || (stack && stack[stack.length - 1].rhs && stack[stack.length - 1].rhs.hasOwnProperty(key));

  if (!ldefined && rdefined) {
    changes(new DiffNew(currentPath, rhs));
  } else if (!rdefined && ldefined) {
    changes(new DiffDeleted(currentPath, lhs));
  } else if (realTypeOf(lhs) !== realTypeOf(rhs)) {
    changes(new DiffEdit(currentPath, lhs, rhs));
  } else if (realTypeOf(lhs) === 'date' && (lhs - rhs) !== 0) {
    changes(new DiffEdit(currentPath, lhs, rhs));
  } else if (ltype === 'object' && lhs !== null && rhs !== null) {
    if (!stack.filter(function(x) {
        return x.lhs === lhs; }).length) {
      stack.push({ lhs: lhs, rhs: rhs });
      if (Array.isArray(lhs)) {
        var i, len = lhs.length;
        for (i = 0; i < lhs.length; i++) {
          if (i >= rhs.length) {
            changes(new DiffArray(currentPath, i, new DiffDeleted(undefined, lhs[i])));
          } else {
            deepDiff(lhs[i], rhs[i], changes, prefilter, currentPath, i, stack);
          }
        }
        while (i < rhs.length) {
          changes(new DiffArray(currentPath, i, new DiffNew(undefined, rhs[i++])));
        }
      } else {
        var akeys = Object.keys(lhs);
        var pkeys = Object.keys(rhs);
        akeys.forEach(function(k, i) {
          var other = pkeys.indexOf(k);
          if (other >= 0) {
            deepDiff(lhs[k], rhs[k], changes, prefilter, currentPath, k, stack);
            pkeys = arrayRemove(pkeys, other);
          } else {
            deepDiff(lhs[k], undefined, changes, prefilter, currentPath, k, stack);
          }
        });
        pkeys.forEach(function(k) {
          deepDiff(undefined, rhs[k], changes, prefilter, currentPath, k, stack);
        });
      }
      stack.length = stack.length - 1;
    } else if (lhs !== rhs) {
      // lhs is contains a cycle at this element and it differs from rhs
      changes(new DiffEdit(currentPath, lhs, rhs));
    }
  } else if (lhs !== rhs) {
    if (!(ltype === 'number' && isNaN(lhs) && isNaN(rhs))) {
      changes(new DiffEdit(currentPath, lhs, rhs));
    }
  }
}

function accumulateDiff(lhs, rhs, prefilter, accum) {
  accum = accum || [];
  deepDiff(lhs, rhs,
    function(diff) {
      if (diff) {
        accum.push(diff);
      }
    },
    prefilter);
  return (accum.length) ? accum : undefined;
}

function applyArrayChange(arr, index, change) {
  if (change.path && change.path.length) {
    var it = arr[index],
      i, u = change.path.length - 1;
    for (i = 0; i < u; i++) {
      it = it[change.path[i]];
    }
    switch (change.kind) {
      case 'A':
        applyArrayChange(it[change.path[i]], change.index, change.item);
        break;
      case 'D':
        delete it[change.path[i]];
        break;
      case 'E':
      case 'N':
        it[change.path[i]] = change.rhs;
        break;
    }
  } else {
    switch (change.kind) {
      case 'A':
        applyArrayChange(arr[index], change.index, change.item);
        break;
      case 'D':
        arr = arrayRemove(arr, index);
        break;
      case 'E':
      case 'N':
        arr[index] = change.rhs;
        break;
    }
  }
  return arr;
}

function applyChange(target, source, change) {
  if (target && source && change && change.kind) {
    var it = target,
      i = -1,
      last = change.path ? change.path.length - 1 : 0;
    while (++i < last) {
      if (typeof it[change.path[i]] === 'undefined') {
        it[change.path[i]] = (typeof change.path[i] === 'number') ? [] : {};
      }
      it = it[change.path[i]];
    }
    switch (change.kind) {
      case 'A':
        applyArrayChange(change.path ? it[change.path[i]] : it, change.index, change.item);
        break;
      case 'D':
        delete it[change.path[i]];
        break;
      case 'E':
      case 'N':
        it[change.path[i]] = change.rhs;
        break;
    }
  }
}

function revertArrayChange(arr, index, change) {
  if (change.path && change.path.length) {
    // the structure of the object at the index has changed...
    var it = arr[index],
      i, u = change.path.length - 1;
    for (i = 0; i < u; i++) {
      it = it[change.path[i]];
    }
    switch (change.kind) {
      case 'A':
        revertArrayChange(it[change.path[i]], change.index, change.item);
        break;
      case 'D':
        it[change.path[i]] = change.lhs;
        break;
      case 'E':
        it[change.path[i]] = change.lhs;
        break;
      case 'N':
        delete it[change.path[i]];
        break;
    }
  } else {
    // the array item is different...
    switch (change.kind) {
      case 'A':
        revertArrayChange(arr[index], change.index, change.item);
        break;
      case 'D':
        arr[index] = change.lhs;
        break;
      case 'E':
        arr[index] = change.lhs;
        break;
      case 'N':
        arr = arrayRemove(arr, index);
        break;
    }
  }
  return arr;
}

function revertChange(target, source, change) {
  if (target && source && change && change.kind) {
    var it = target,
      i, u;
    u = change.path.length - 1;
    for (i = 0; i < u; i++) {
      if (typeof it[change.path[i]] === 'undefined') {
        it[change.path[i]] = {};
      }
      it = it[change.path[i]];
    }
    switch (change.kind) {
      case 'A':
        // Array was modified...
        // it will be an array...
        revertArrayChange(it[change.path[i]], change.index, change.item);
        break;
      case 'D':
        // Item was deleted...
        it[change.path[i]] = change.lhs;
        break;
      case 'E':
        // Item was edited...
        it[change.path[i]] = change.lhs;
        break;
      case 'N':
        // Item is new...
        delete it[change.path[i]];
        break;
    }
  }
}

function applyDiff(target, source, filter) {
  if (target && source) {
    var onChange = function(change) {
      if (!filter || filter(target, source, change)) {
        applyChange(target, source, change);
      }
    };
    deepDiff(target, source, onChange);
  }
}

Object.defineProperties(accumulateDiff, {

  diff: {
    value: accumulateDiff,
    enumerable: true
  },
  observableDiff: {
    value: deepDiff,
    enumerable: true
  },
  applyDiff: {
    value: applyDiff,
    enumerable: true
  },
  applyChange: {
    value: applyChange,
    enumerable: true
  },
  revertChange: {
    value: revertChange,
    enumerable: true
  },
  isConflict: {
    value: function() {
      return 'undefined' !== typeof conflict;
    },
    enumerable: true
  },
  noConflict: {
    value: function() {
      if (conflictResolution) {
        conflictResolution.forEach(function(it) {
          it();
        });
        conflictResolution = null;
      }
      return accumulateDiff;
    },
    enumerable: true
  }
});

return accumulateDiff;

})));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],2:[function(require,module,exports){
module.exports = require('./lib/diff').diff

},{"./lib/diff":3}],3:[function(require,module,exports){
/**
 * Diff two list in O(N).
 * @param {Array} oldList - Original List
 * @param {Array} newList - List After certain insertions, removes, or moves
 * @return {Object} - {moves: <Array>}
 *                  - moves is a list of actions that telling how to remove and insert
 */
function diff (oldList, newList, key) {
  var oldMap = makeKeyIndexAndFree(oldList, key)
  var newMap = makeKeyIndexAndFree(newList, key)

  var newFree = newMap.free

  var oldKeyIndex = oldMap.keyIndex
  var newKeyIndex = newMap.keyIndex

  var moves = []

  // a simulate list to manipulate
  var children = []
  var i = 0
  var item
  var itemKey
  var freeIndex = 0

  // fist pass to check item in old list: if it's removed or not
  while (i < oldList.length) {
    item = oldList[i]
    itemKey = getItemKey(item, key)
    if (itemKey) {
      if (!newKeyIndex.hasOwnProperty(itemKey)) {
        children.push(null)
      } else {
        var newItemIndex = newKeyIndex[itemKey]
        children.push(newList[newItemIndex])
      }
    } else {
      var freeItem = newFree[freeIndex++]
      children.push(freeItem || null)
    }
    i++
  }

  var simulateList = children.slice(0)

  // remove items no longer exist
  i = 0
  while (i < simulateList.length) {
    if (simulateList[i] === null) {
      remove(i)
      removeSimulate(i)
    } else {
      i++
    }
  }

  // i is cursor pointing to a item in new list
  // j is cursor pointing to a item in simulateList
  var j = i = 0
  while (i < newList.length) {
    item = newList[i]
    itemKey = getItemKey(item, key)

    var simulateItem = simulateList[j]
    var simulateItemKey = getItemKey(simulateItem, key)

    if (simulateItem) {
      if (itemKey === simulateItemKey) {
        j++
      } else {
        // new item, just inesrt it
        if (!oldKeyIndex.hasOwnProperty(itemKey)) {
          insert(i, item)
        } else {
          // if remove current simulateItem make item in right place
          // then just remove it
          var nextItemKey = getItemKey(simulateList[j + 1], key)
          if (nextItemKey === itemKey) {
            remove(i)
            removeSimulate(j)
            j++ // after removing, current j is right, just jump to next one
          } else {
            // else insert item
            insert(i, item)
          }
        }
      }
    } else {
      insert(i, item)
    }

    i++
  }

  function remove (index) {
    var move = {index: index, type: 0}
    moves.push(move)
  }

  function insert (index, item) {
    var move = {index: index, item: item, type: 1}
    moves.push(move)
  }

  function removeSimulate (index) {
    simulateList.splice(index, 1)
  }

  return {
    moves: moves,
    children: children
  }
}

/**
 * Convert list to key-item keyIndex object.
 * @param {Array} list
 * @param {String|Function} key
 */
function makeKeyIndexAndFree (list, key) {
  var keyIndex = {}
  var free = []
  for (var i = 0, len = list.length; i < len; i++) {
    var item = list[i]
    var itemKey = getItemKey(item, key)
    if (itemKey) {
      keyIndex[itemKey] = i
    } else {
      free.push(item)
    }
  }
  return {
    keyIndex: keyIndex,
    free: free
  }
}

function getItemKey (item, key) {
  if (!item || !key) return void 666
  return typeof key === 'string'
    ? item[key]
    : key(item)
}

exports.makeKeyIndexAndFree = makeKeyIndexAndFree // exports for test
exports.diff = diff

},{}],4:[function(require,module,exports){
'use strict';

// following loosly: https://medium.com/@deathmood/how-to-write-your-own-virtual-dom-ee74acc13060

const listDiff = require('list-diff2');
const deepDiff = require('deep-diff');
// const {diff, applyChange, applyDiff} = require('deep-diff');

const {jsonEqual, take, biterate} = require('./util/common');
const {select, on, set, get, append, remove, create, replace} = require('./util/dom');

const changed = (node1, node2) => typeof node1 !== typeof node2
	|| typeof node1 === 'string' && node1 !== node2
	|| node1.type !== node2.type;

const update = (parent, newNode, oldNode, index = 0) =>
	(!oldNode) && [() => append(parent, create(newNode))]
	|| (!newNode) && [(child => () => remove(parent, child))(parent.childNodes[index])]
	|| newNode === oldNode && []
	|| (changed(newNode, oldNode))
		&& [(child => () => replace(parent, create(newNode), child))(parent.childNodes[index])]
	|| (newNode.children.length === oldNode.children.length) && jsonEqual(newNode, oldNode) && []
	|| newNode.type && (newNode.children.length !== oldNode.children.length)
		&& [Math.min(newNode.children.length, oldNode.children.length)].map(minLength =>
			jsonEqual(newNode.children.slice(0, minLength), oldNode.children.slice(0, minLength))
			&& biterate(newNode.children, oldNode.children,
				(n, o, _i) => update(parent.childNodes[index], n, o, _i),
				minLength
			)
		).pop()
	|| (newNode.type)
		&& biterate(newNode.children, oldNode.children,
			(n, o, _i) => update(parent.childNodes[index], n, o, _i)
		)
	|| [];

const h = (type, props, ...children) => ({
	type,
	props,
	children:
		children && children.length === 1 && children[0] instanceof Array
			&& children[0]
		|| children
});

const attach = (selector, tree) => ({
	el: append(
		select(selector), create(tree)
	),
	tree
});

const patch = (vdom, tree) => {
	// console.log(deepDiff.diff(vdom.tree, tree));
	let patches = update(vdom.el, tree, vdom.tree);
	console.log(patches);
	patches.forEach(p => p());
	return ({
		el: vdom.el,
		tree
	});
};

let vdom = attach('#ui', h('ul', {},
	h('li', {}, 'List Item 1'),
	h('li', {}, 'List Item 2'),
	h('li', {}, 'List Item 3')
));

on(select('#patch'), 'click', ev => {
	vdom = patch(vdom, h('p', {}, 'Hello World!'));
});

on(select('#itemsCount'), 'input', ev => {
	vdom = patch(vdom, h('ul', {}, take(ev.target.value).map(index =>
		h('li', {}, `List Item ${index}`)
	)));
});

},{"./util/common":5,"./util/dom":6,"deep-diff":1,"list-diff2":2}],5:[function(require,module,exports){
'use strict';

const jsonEqual = (a, b) =>
	JSON.stringify(a) === JSON.stringify(b);

const biterate = (a, b, cb, index = 0) =>
	(typeof a[index] !== 'undefined'
	|| typeof b[index] !== 'undefined')
		&& [].concat(
			cb(a[index], b[index], index),
			biterate(a, b, cb, index + 1)
		)
		|| [];

const biterate2 = (a, b, cb) => {
	for (let index = 0; index < a.length || index < b.length; index++) {
		cb(a[index], b[index], index);
	}
};
// biterate([1, 2, 3, 4], ['a', 'b', 'c'], (a, b, index) => console.log(a, b, index));

const take = (num, index = 0) =>
	(index < num) ? [].concat(index, take(num, index + 1)) : [];

module.exports = {
	jsonEqual,
	biterate,
	biterate2,
	take
};

},{}],6:[function(require,module,exports){
'use strict';

const select = selector =>
	(selector instanceof HTMLElement) && selector
	|| (typeof selector === 'string') && document.querySelector(selector)
	|| null;

const on = (el, eventName, selector, cb) =>
	el.addEventListener(eventName, ev =>
		(typeof selector === 'string' && typeof cb !== 'undefined')
			? (Array.from(
				el.querySelectorAll(selector)).indexOf(ev.target) > -1)
					? cb(ev) : false
			: (cb => cb(ev))(selector));

const get = (el, attr, defaultValue) =>
	el.getAttribute(attr) || defaultValue;

const set = (el, attr, value) => el.setAttribute(attr, value);

const append = (parent, children = []) => (
	((children instanceof HTMLElement) && parent.appendChild(children)
	|| (children instanceof Array) && children.forEach(el =>
		parent.appendChild(el)
	)),
	parent
);

const remove = (parent, child) => {
	console.log('removing', parent, child);
	return typeof child === 'number'
		&& parent.removeChild(parent.childNodes[child])
	|| child instanceof HTMLElement
		&& parent.removeChild(child);
};

const create = node => typeof node === 'string'
	? document.createTextNode(node)
	: append(document.createElement(node.type), node.children.map(create));

const replace = (parent, el, child) => parent.replaceChild(
	el, (child instanceof Node) ? child : parent.childNodes[child]
);

module.exports = {
	select,
	on,
	get,
	set,
	append,
	remove,
	create,
	replace
};

},{}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZGVlcC1kaWZmL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xpc3QtZGlmZjIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbGlzdC1kaWZmMi9saWIvZGlmZi5qcyIsInNyYy9qcy9pbmRleC5qcyIsInNyYy9qcy91dGlsL2NvbW1vbi5qcyIsInNyYy9qcy91dGlsL2RvbS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL1pBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG5cdHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpIDpcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKGZhY3RvcnkpIDpcblx0KGdsb2JhbC5EZWVwRGlmZiA9IGZhY3RvcnkoKSk7XG59KHRoaXMsIChmdW5jdGlvbiAoKSB7ICd1c2Ugc3RyaWN0JztcblxudmFyICRzY29wZTtcbnZhciBjb25mbGljdDtcbnZhciBjb25mbGljdFJlc29sdXRpb24gPSBbXTtcbmlmICh0eXBlb2YgZ2xvYmFsID09PSAnb2JqZWN0JyAmJiBnbG9iYWwpIHtcbiAgJHNjb3BlID0gZ2xvYmFsO1xufSBlbHNlIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAkc2NvcGUgPSB3aW5kb3c7XG59IGVsc2Uge1xuICAkc2NvcGUgPSB7fTtcbn1cbmNvbmZsaWN0ID0gJHNjb3BlLkRlZXBEaWZmO1xuaWYgKGNvbmZsaWN0KSB7XG4gIGNvbmZsaWN0UmVzb2x1dGlvbi5wdXNoKFxuICAgIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgY29uZmxpY3QgJiYgJHNjb3BlLkRlZXBEaWZmID09PSBhY2N1bXVsYXRlRGlmZikge1xuICAgICAgICAkc2NvcGUuRGVlcERpZmYgPSBjb25mbGljdDtcbiAgICAgICAgY29uZmxpY3QgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfSk7XG59XG5cbi8vIG5vZGVqcyBjb21wYXRpYmxlIG9uIHNlcnZlciBzaWRlIGFuZCBpbiB0aGUgYnJvd3Nlci5cbmZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvcjtcbiAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gRGlmZihraW5kLCBwYXRoKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAna2luZCcsIHtcbiAgICB2YWx1ZToga2luZCxcbiAgICBlbnVtZXJhYmxlOiB0cnVlXG4gIH0pO1xuICBpZiAocGF0aCAmJiBwYXRoLmxlbmd0aCkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncGF0aCcsIHtcbiAgICAgIHZhbHVlOiBwYXRoLFxuICAgICAgZW51bWVyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIERpZmZFZGl0KHBhdGgsIG9yaWdpbiwgdmFsdWUpIHtcbiAgRGlmZkVkaXQuc3VwZXJfLmNhbGwodGhpcywgJ0UnLCBwYXRoKTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdsaHMnLCB7XG4gICAgdmFsdWU6IG9yaWdpbixcbiAgICBlbnVtZXJhYmxlOiB0cnVlXG4gIH0pO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JocycsIHtcbiAgICB2YWx1ZTogdmFsdWUsXG4gICAgZW51bWVyYWJsZTogdHJ1ZVxuICB9KTtcbn1cbmluaGVyaXRzKERpZmZFZGl0LCBEaWZmKTtcblxuZnVuY3Rpb24gRGlmZk5ldyhwYXRoLCB2YWx1ZSkge1xuICBEaWZmTmV3LnN1cGVyXy5jYWxsKHRoaXMsICdOJywgcGF0aCk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmhzJywge1xuICAgIHZhbHVlOiB2YWx1ZSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlXG4gIH0pO1xufVxuaW5oZXJpdHMoRGlmZk5ldywgRGlmZik7XG5cbmZ1bmN0aW9uIERpZmZEZWxldGVkKHBhdGgsIHZhbHVlKSB7XG4gIERpZmZEZWxldGVkLnN1cGVyXy5jYWxsKHRoaXMsICdEJywgcGF0aCk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnbGhzJywge1xuICAgIHZhbHVlOiB2YWx1ZSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlXG4gIH0pO1xufVxuaW5oZXJpdHMoRGlmZkRlbGV0ZWQsIERpZmYpO1xuXG5mdW5jdGlvbiBEaWZmQXJyYXkocGF0aCwgaW5kZXgsIGl0ZW0pIHtcbiAgRGlmZkFycmF5LnN1cGVyXy5jYWxsKHRoaXMsICdBJywgcGF0aCk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnaW5kZXgnLCB7XG4gICAgdmFsdWU6IGluZGV4LFxuICAgIGVudW1lcmFibGU6IHRydWVcbiAgfSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnaXRlbScsIHtcbiAgICB2YWx1ZTogaXRlbSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlXG4gIH0pO1xufVxuaW5oZXJpdHMoRGlmZkFycmF5LCBEaWZmKTtcblxuZnVuY3Rpb24gYXJyYXlSZW1vdmUoYXJyLCBmcm9tLCB0bykge1xuICB2YXIgcmVzdCA9IGFyci5zbGljZSgodG8gfHwgZnJvbSkgKyAxIHx8IGFyci5sZW5ndGgpO1xuICBhcnIubGVuZ3RoID0gZnJvbSA8IDAgPyBhcnIubGVuZ3RoICsgZnJvbSA6IGZyb207XG4gIGFyci5wdXNoLmFwcGx5KGFyciwgcmVzdCk7XG4gIHJldHVybiBhcnI7XG59XG5cbmZ1bmN0aW9uIHJlYWxUeXBlT2Yoc3ViamVjdCkge1xuICB2YXIgdHlwZSA9IHR5cGVvZiBzdWJqZWN0O1xuICBpZiAodHlwZSAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gdHlwZTtcbiAgfVxuXG4gIGlmIChzdWJqZWN0ID09PSBNYXRoKSB7XG4gICAgcmV0dXJuICdtYXRoJztcbiAgfSBlbHNlIGlmIChzdWJqZWN0ID09PSBudWxsKSB7XG4gICAgcmV0dXJuICdudWxsJztcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHN1YmplY3QpKSB7XG4gICAgcmV0dXJuICdhcnJheSc7XG4gIH0gZWxzZSBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHN1YmplY3QpID09PSAnW29iamVjdCBEYXRlXScpIHtcbiAgICByZXR1cm4gJ2RhdGUnO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBzdWJqZWN0LnRvU3RyaW5nID09PSAnZnVuY3Rpb24nICYmIC9eXFwvLipcXC8vLnRlc3Qoc3ViamVjdC50b1N0cmluZygpKSkge1xuICAgIHJldHVybiAncmVnZXhwJztcbiAgfVxuICByZXR1cm4gJ29iamVjdCc7XG59XG5cbmZ1bmN0aW9uIGRlZXBEaWZmKGxocywgcmhzLCBjaGFuZ2VzLCBwcmVmaWx0ZXIsIHBhdGgsIGtleSwgc3RhY2spIHtcbiAgcGF0aCA9IHBhdGggfHwgW107XG4gIHN0YWNrID0gc3RhY2sgfHwgW107XG4gIHZhciBjdXJyZW50UGF0aCA9IHBhdGguc2xpY2UoMCk7XG4gIGlmICh0eXBlb2Yga2V5ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmIChwcmVmaWx0ZXIpIHtcbiAgICAgIGlmICh0eXBlb2YocHJlZmlsdGVyKSA9PT0gJ2Z1bmN0aW9uJyAmJiBwcmVmaWx0ZXIoY3VycmVudFBhdGgsIGtleSkpIHtcbiAgICAgICAgcmV0dXJuOyB9IGVsc2UgaWYgKHR5cGVvZihwcmVmaWx0ZXIpID09PSAnb2JqZWN0Jykge1xuICAgICAgICBpZiAocHJlZmlsdGVyLnByZWZpbHRlciAmJiBwcmVmaWx0ZXIucHJlZmlsdGVyKGN1cnJlbnRQYXRoLCBrZXkpKSB7XG4gICAgICAgICAgcmV0dXJuOyB9XG4gICAgICAgIGlmIChwcmVmaWx0ZXIubm9ybWFsaXplKSB7XG4gICAgICAgICAgdmFyIGFsdCA9IHByZWZpbHRlci5ub3JtYWxpemUoY3VycmVudFBhdGgsIGtleSwgbGhzLCByaHMpO1xuICAgICAgICAgIGlmIChhbHQpIHtcbiAgICAgICAgICAgIGxocyA9IGFsdFswXTtcbiAgICAgICAgICAgIHJocyA9IGFsdFsxXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY3VycmVudFBhdGgucHVzaChrZXkpO1xuICB9XG5cbiAgLy8gVXNlIHN0cmluZyBjb21wYXJpc29uIGZvciByZWdleGVzXG4gIGlmIChyZWFsVHlwZU9mKGxocykgPT09ICdyZWdleHAnICYmIHJlYWxUeXBlT2YocmhzKSA9PT0gJ3JlZ2V4cCcpIHtcbiAgICBsaHMgPSBsaHMudG9TdHJpbmcoKTtcbiAgICByaHMgPSByaHMudG9TdHJpbmcoKTtcbiAgfVxuXG4gIHZhciBsdHlwZSA9IHR5cGVvZiBsaHM7XG4gIHZhciBydHlwZSA9IHR5cGVvZiByaHM7XG5cbiAgdmFyIGxkZWZpbmVkID0gbHR5cGUgIT09ICd1bmRlZmluZWQnIHx8IChzdGFjayAmJiBzdGFja1tzdGFjay5sZW5ndGggLSAxXS5saHMgJiYgc3RhY2tbc3RhY2subGVuZ3RoIC0gMV0ubGhzLmhhc093blByb3BlcnR5KGtleSkpO1xuICB2YXIgcmRlZmluZWQgPSBydHlwZSAhPT0gJ3VuZGVmaW5lZCcgfHwgKHN0YWNrICYmIHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdLnJocyAmJiBzdGFja1tzdGFjay5sZW5ndGggLSAxXS5yaHMuaGFzT3duUHJvcGVydHkoa2V5KSk7XG5cbiAgaWYgKCFsZGVmaW5lZCAmJiByZGVmaW5lZCkge1xuICAgIGNoYW5nZXMobmV3IERpZmZOZXcoY3VycmVudFBhdGgsIHJocykpO1xuICB9IGVsc2UgaWYgKCFyZGVmaW5lZCAmJiBsZGVmaW5lZCkge1xuICAgIGNoYW5nZXMobmV3IERpZmZEZWxldGVkKGN1cnJlbnRQYXRoLCBsaHMpKTtcbiAgfSBlbHNlIGlmIChyZWFsVHlwZU9mKGxocykgIT09IHJlYWxUeXBlT2YocmhzKSkge1xuICAgIGNoYW5nZXMobmV3IERpZmZFZGl0KGN1cnJlbnRQYXRoLCBsaHMsIHJocykpO1xuICB9IGVsc2UgaWYgKHJlYWxUeXBlT2YobGhzKSA9PT0gJ2RhdGUnICYmIChsaHMgLSByaHMpICE9PSAwKSB7XG4gICAgY2hhbmdlcyhuZXcgRGlmZkVkaXQoY3VycmVudFBhdGgsIGxocywgcmhzKSk7XG4gIH0gZWxzZSBpZiAobHR5cGUgPT09ICdvYmplY3QnICYmIGxocyAhPT0gbnVsbCAmJiByaHMgIT09IG51bGwpIHtcbiAgICBpZiAoIXN0YWNrLmZpbHRlcihmdW5jdGlvbih4KSB7XG4gICAgICAgIHJldHVybiB4LmxocyA9PT0gbGhzOyB9KS5sZW5ndGgpIHtcbiAgICAgIHN0YWNrLnB1c2goeyBsaHM6IGxocywgcmhzOiByaHMgfSk7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShsaHMpKSB7XG4gICAgICAgIHZhciBpLCBsZW4gPSBsaHMubGVuZ3RoO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKGkgPj0gcmhzLmxlbmd0aCkge1xuICAgICAgICAgICAgY2hhbmdlcyhuZXcgRGlmZkFycmF5KGN1cnJlbnRQYXRoLCBpLCBuZXcgRGlmZkRlbGV0ZWQodW5kZWZpbmVkLCBsaHNbaV0pKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRlZXBEaWZmKGxoc1tpXSwgcmhzW2ldLCBjaGFuZ2VzLCBwcmVmaWx0ZXIsIGN1cnJlbnRQYXRoLCBpLCBzdGFjayk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChpIDwgcmhzLmxlbmd0aCkge1xuICAgICAgICAgIGNoYW5nZXMobmV3IERpZmZBcnJheShjdXJyZW50UGF0aCwgaSwgbmV3IERpZmZOZXcodW5kZWZpbmVkLCByaHNbaSsrXSkpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGFrZXlzID0gT2JqZWN0LmtleXMobGhzKTtcbiAgICAgICAgdmFyIHBrZXlzID0gT2JqZWN0LmtleXMocmhzKTtcbiAgICAgICAgYWtleXMuZm9yRWFjaChmdW5jdGlvbihrLCBpKSB7XG4gICAgICAgICAgdmFyIG90aGVyID0gcGtleXMuaW5kZXhPZihrKTtcbiAgICAgICAgICBpZiAob3RoZXIgPj0gMCkge1xuICAgICAgICAgICAgZGVlcERpZmYobGhzW2tdLCByaHNba10sIGNoYW5nZXMsIHByZWZpbHRlciwgY3VycmVudFBhdGgsIGssIHN0YWNrKTtcbiAgICAgICAgICAgIHBrZXlzID0gYXJyYXlSZW1vdmUocGtleXMsIG90aGVyKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVlcERpZmYobGhzW2tdLCB1bmRlZmluZWQsIGNoYW5nZXMsIHByZWZpbHRlciwgY3VycmVudFBhdGgsIGssIHN0YWNrKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBwa2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICAgICAgICBkZWVwRGlmZih1bmRlZmluZWQsIHJoc1trXSwgY2hhbmdlcywgcHJlZmlsdGVyLCBjdXJyZW50UGF0aCwgaywgc3RhY2spO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHN0YWNrLmxlbmd0aCA9IHN0YWNrLmxlbmd0aCAtIDE7XG4gICAgfSBlbHNlIGlmIChsaHMgIT09IHJocykge1xuICAgICAgLy8gbGhzIGlzIGNvbnRhaW5zIGEgY3ljbGUgYXQgdGhpcyBlbGVtZW50IGFuZCBpdCBkaWZmZXJzIGZyb20gcmhzXG4gICAgICBjaGFuZ2VzKG5ldyBEaWZmRWRpdChjdXJyZW50UGF0aCwgbGhzLCByaHMpKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAobGhzICE9PSByaHMpIHtcbiAgICBpZiAoIShsdHlwZSA9PT0gJ251bWJlcicgJiYgaXNOYU4obGhzKSAmJiBpc05hTihyaHMpKSkge1xuICAgICAgY2hhbmdlcyhuZXcgRGlmZkVkaXQoY3VycmVudFBhdGgsIGxocywgcmhzKSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFjY3VtdWxhdGVEaWZmKGxocywgcmhzLCBwcmVmaWx0ZXIsIGFjY3VtKSB7XG4gIGFjY3VtID0gYWNjdW0gfHwgW107XG4gIGRlZXBEaWZmKGxocywgcmhzLFxuICAgIGZ1bmN0aW9uKGRpZmYpIHtcbiAgICAgIGlmIChkaWZmKSB7XG4gICAgICAgIGFjY3VtLnB1c2goZGlmZik7XG4gICAgICB9XG4gICAgfSxcbiAgICBwcmVmaWx0ZXIpO1xuICByZXR1cm4gKGFjY3VtLmxlbmd0aCkgPyBhY2N1bSA6IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gYXBwbHlBcnJheUNoYW5nZShhcnIsIGluZGV4LCBjaGFuZ2UpIHtcbiAgaWYgKGNoYW5nZS5wYXRoICYmIGNoYW5nZS5wYXRoLmxlbmd0aCkge1xuICAgIHZhciBpdCA9IGFycltpbmRleF0sXG4gICAgICBpLCB1ID0gY2hhbmdlLnBhdGgubGVuZ3RoIC0gMTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgdTsgaSsrKSB7XG4gICAgICBpdCA9IGl0W2NoYW5nZS5wYXRoW2ldXTtcbiAgICB9XG4gICAgc3dpdGNoIChjaGFuZ2Uua2luZCkge1xuICAgICAgY2FzZSAnQSc6XG4gICAgICAgIGFwcGx5QXJyYXlDaGFuZ2UoaXRbY2hhbmdlLnBhdGhbaV1dLCBjaGFuZ2UuaW5kZXgsIGNoYW5nZS5pdGVtKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdEJzpcbiAgICAgICAgZGVsZXRlIGl0W2NoYW5nZS5wYXRoW2ldXTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdFJzpcbiAgICAgIGNhc2UgJ04nOlxuICAgICAgICBpdFtjaGFuZ2UucGF0aFtpXV0gPSBjaGFuZ2UucmhzO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgc3dpdGNoIChjaGFuZ2Uua2luZCkge1xuICAgICAgY2FzZSAnQSc6XG4gICAgICAgIGFwcGx5QXJyYXlDaGFuZ2UoYXJyW2luZGV4XSwgY2hhbmdlLmluZGV4LCBjaGFuZ2UuaXRlbSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnRCc6XG4gICAgICAgIGFyciA9IGFycmF5UmVtb3ZlKGFyciwgaW5kZXgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ0UnOlxuICAgICAgY2FzZSAnTic6XG4gICAgICAgIGFycltpbmRleF0gPSBjaGFuZ2UucmhzO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFycjtcbn1cblxuZnVuY3Rpb24gYXBwbHlDaGFuZ2UodGFyZ2V0LCBzb3VyY2UsIGNoYW5nZSkge1xuICBpZiAodGFyZ2V0ICYmIHNvdXJjZSAmJiBjaGFuZ2UgJiYgY2hhbmdlLmtpbmQpIHtcbiAgICB2YXIgaXQgPSB0YXJnZXQsXG4gICAgICBpID0gLTEsXG4gICAgICBsYXN0ID0gY2hhbmdlLnBhdGggPyBjaGFuZ2UucGF0aC5sZW5ndGggLSAxIDogMDtcbiAgICB3aGlsZSAoKytpIDwgbGFzdCkge1xuICAgICAgaWYgKHR5cGVvZiBpdFtjaGFuZ2UucGF0aFtpXV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGl0W2NoYW5nZS5wYXRoW2ldXSA9ICh0eXBlb2YgY2hhbmdlLnBhdGhbaV0gPT09ICdudW1iZXInKSA/IFtdIDoge307XG4gICAgICB9XG4gICAgICBpdCA9IGl0W2NoYW5nZS5wYXRoW2ldXTtcbiAgICB9XG4gICAgc3dpdGNoIChjaGFuZ2Uua2luZCkge1xuICAgICAgY2FzZSAnQSc6XG4gICAgICAgIGFwcGx5QXJyYXlDaGFuZ2UoY2hhbmdlLnBhdGggPyBpdFtjaGFuZ2UucGF0aFtpXV0gOiBpdCwgY2hhbmdlLmluZGV4LCBjaGFuZ2UuaXRlbSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnRCc6XG4gICAgICAgIGRlbGV0ZSBpdFtjaGFuZ2UucGF0aFtpXV07XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnRSc6XG4gICAgICBjYXNlICdOJzpcbiAgICAgICAgaXRbY2hhbmdlLnBhdGhbaV1dID0gY2hhbmdlLnJocztcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHJldmVydEFycmF5Q2hhbmdlKGFyciwgaW5kZXgsIGNoYW5nZSkge1xuICBpZiAoY2hhbmdlLnBhdGggJiYgY2hhbmdlLnBhdGgubGVuZ3RoKSB7XG4gICAgLy8gdGhlIHN0cnVjdHVyZSBvZiB0aGUgb2JqZWN0IGF0IHRoZSBpbmRleCBoYXMgY2hhbmdlZC4uLlxuICAgIHZhciBpdCA9IGFycltpbmRleF0sXG4gICAgICBpLCB1ID0gY2hhbmdlLnBhdGgubGVuZ3RoIC0gMTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgdTsgaSsrKSB7XG4gICAgICBpdCA9IGl0W2NoYW5nZS5wYXRoW2ldXTtcbiAgICB9XG4gICAgc3dpdGNoIChjaGFuZ2Uua2luZCkge1xuICAgICAgY2FzZSAnQSc6XG4gICAgICAgIHJldmVydEFycmF5Q2hhbmdlKGl0W2NoYW5nZS5wYXRoW2ldXSwgY2hhbmdlLmluZGV4LCBjaGFuZ2UuaXRlbSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnRCc6XG4gICAgICAgIGl0W2NoYW5nZS5wYXRoW2ldXSA9IGNoYW5nZS5saHM7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnRSc6XG4gICAgICAgIGl0W2NoYW5nZS5wYXRoW2ldXSA9IGNoYW5nZS5saHM7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnTic6XG4gICAgICAgIGRlbGV0ZSBpdFtjaGFuZ2UucGF0aFtpXV07XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyB0aGUgYXJyYXkgaXRlbSBpcyBkaWZmZXJlbnQuLi5cbiAgICBzd2l0Y2ggKGNoYW5nZS5raW5kKSB7XG4gICAgICBjYXNlICdBJzpcbiAgICAgICAgcmV2ZXJ0QXJyYXlDaGFuZ2UoYXJyW2luZGV4XSwgY2hhbmdlLmluZGV4LCBjaGFuZ2UuaXRlbSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnRCc6XG4gICAgICAgIGFycltpbmRleF0gPSBjaGFuZ2UubGhzO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ0UnOlxuICAgICAgICBhcnJbaW5kZXhdID0gY2hhbmdlLmxocztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdOJzpcbiAgICAgICAgYXJyID0gYXJyYXlSZW1vdmUoYXJyLCBpbmRleCk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYXJyO1xufVxuXG5mdW5jdGlvbiByZXZlcnRDaGFuZ2UodGFyZ2V0LCBzb3VyY2UsIGNoYW5nZSkge1xuICBpZiAodGFyZ2V0ICYmIHNvdXJjZSAmJiBjaGFuZ2UgJiYgY2hhbmdlLmtpbmQpIHtcbiAgICB2YXIgaXQgPSB0YXJnZXQsXG4gICAgICBpLCB1O1xuICAgIHUgPSBjaGFuZ2UucGF0aC5sZW5ndGggLSAxO1xuICAgIGZvciAoaSA9IDA7IGkgPCB1OyBpKyspIHtcbiAgICAgIGlmICh0eXBlb2YgaXRbY2hhbmdlLnBhdGhbaV1dID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBpdFtjaGFuZ2UucGF0aFtpXV0gPSB7fTtcbiAgICAgIH1cbiAgICAgIGl0ID0gaXRbY2hhbmdlLnBhdGhbaV1dO1xuICAgIH1cbiAgICBzd2l0Y2ggKGNoYW5nZS5raW5kKSB7XG4gICAgICBjYXNlICdBJzpcbiAgICAgICAgLy8gQXJyYXkgd2FzIG1vZGlmaWVkLi4uXG4gICAgICAgIC8vIGl0IHdpbGwgYmUgYW4gYXJyYXkuLi5cbiAgICAgICAgcmV2ZXJ0QXJyYXlDaGFuZ2UoaXRbY2hhbmdlLnBhdGhbaV1dLCBjaGFuZ2UuaW5kZXgsIGNoYW5nZS5pdGVtKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdEJzpcbiAgICAgICAgLy8gSXRlbSB3YXMgZGVsZXRlZC4uLlxuICAgICAgICBpdFtjaGFuZ2UucGF0aFtpXV0gPSBjaGFuZ2UubGhzO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ0UnOlxuICAgICAgICAvLyBJdGVtIHdhcyBlZGl0ZWQuLi5cbiAgICAgICAgaXRbY2hhbmdlLnBhdGhbaV1dID0gY2hhbmdlLmxocztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdOJzpcbiAgICAgICAgLy8gSXRlbSBpcyBuZXcuLi5cbiAgICAgICAgZGVsZXRlIGl0W2NoYW5nZS5wYXRoW2ldXTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFwcGx5RGlmZih0YXJnZXQsIHNvdXJjZSwgZmlsdGVyKSB7XG4gIGlmICh0YXJnZXQgJiYgc291cmNlKSB7XG4gICAgdmFyIG9uQ2hhbmdlID0gZnVuY3Rpb24oY2hhbmdlKSB7XG4gICAgICBpZiAoIWZpbHRlciB8fCBmaWx0ZXIodGFyZ2V0LCBzb3VyY2UsIGNoYW5nZSkpIHtcbiAgICAgICAgYXBwbHlDaGFuZ2UodGFyZ2V0LCBzb3VyY2UsIGNoYW5nZSk7XG4gICAgICB9XG4gICAgfTtcbiAgICBkZWVwRGlmZih0YXJnZXQsIHNvdXJjZSwgb25DaGFuZ2UpO1xuICB9XG59XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKGFjY3VtdWxhdGVEaWZmLCB7XG5cbiAgZGlmZjoge1xuICAgIHZhbHVlOiBhY2N1bXVsYXRlRGlmZixcbiAgICBlbnVtZXJhYmxlOiB0cnVlXG4gIH0sXG4gIG9ic2VydmFibGVEaWZmOiB7XG4gICAgdmFsdWU6IGRlZXBEaWZmLFxuICAgIGVudW1lcmFibGU6IHRydWVcbiAgfSxcbiAgYXBwbHlEaWZmOiB7XG4gICAgdmFsdWU6IGFwcGx5RGlmZixcbiAgICBlbnVtZXJhYmxlOiB0cnVlXG4gIH0sXG4gIGFwcGx5Q2hhbmdlOiB7XG4gICAgdmFsdWU6IGFwcGx5Q2hhbmdlLFxuICAgIGVudW1lcmFibGU6IHRydWVcbiAgfSxcbiAgcmV2ZXJ0Q2hhbmdlOiB7XG4gICAgdmFsdWU6IHJldmVydENoYW5nZSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlXG4gIH0sXG4gIGlzQ29uZmxpY3Q6IHtcbiAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBjb25mbGljdDtcbiAgICB9LFxuICAgIGVudW1lcmFibGU6IHRydWVcbiAgfSxcbiAgbm9Db25mbGljdDoge1xuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChjb25mbGljdFJlc29sdXRpb24pIHtcbiAgICAgICAgY29uZmxpY3RSZXNvbHV0aW9uLmZvckVhY2goZnVuY3Rpb24oaXQpIHtcbiAgICAgICAgICBpdCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgY29uZmxpY3RSZXNvbHV0aW9uID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhY2N1bXVsYXRlRGlmZjtcbiAgICB9LFxuICAgIGVudW1lcmFibGU6IHRydWVcbiAgfVxufSk7XG5cbnJldHVybiBhY2N1bXVsYXRlRGlmZjtcblxufSkpKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvZGlmZicpLmRpZmZcbiIsIi8qKlxyXG4gKiBEaWZmIHR3byBsaXN0IGluIE8oTikuXHJcbiAqIEBwYXJhbSB7QXJyYXl9IG9sZExpc3QgLSBPcmlnaW5hbCBMaXN0XHJcbiAqIEBwYXJhbSB7QXJyYXl9IG5ld0xpc3QgLSBMaXN0IEFmdGVyIGNlcnRhaW4gaW5zZXJ0aW9ucywgcmVtb3Zlcywgb3IgbW92ZXNcclxuICogQHJldHVybiB7T2JqZWN0fSAtIHttb3ZlczogPEFycmF5Pn1cclxuICogICAgICAgICAgICAgICAgICAtIG1vdmVzIGlzIGEgbGlzdCBvZiBhY3Rpb25zIHRoYXQgdGVsbGluZyBob3cgdG8gcmVtb3ZlIGFuZCBpbnNlcnRcclxuICovXHJcbmZ1bmN0aW9uIGRpZmYgKG9sZExpc3QsIG5ld0xpc3QsIGtleSkge1xyXG4gIHZhciBvbGRNYXAgPSBtYWtlS2V5SW5kZXhBbmRGcmVlKG9sZExpc3QsIGtleSlcclxuICB2YXIgbmV3TWFwID0gbWFrZUtleUluZGV4QW5kRnJlZShuZXdMaXN0LCBrZXkpXHJcblxyXG4gIHZhciBuZXdGcmVlID0gbmV3TWFwLmZyZWVcclxuXHJcbiAgdmFyIG9sZEtleUluZGV4ID0gb2xkTWFwLmtleUluZGV4XHJcbiAgdmFyIG5ld0tleUluZGV4ID0gbmV3TWFwLmtleUluZGV4XHJcblxyXG4gIHZhciBtb3ZlcyA9IFtdXHJcblxyXG4gIC8vIGEgc2ltdWxhdGUgbGlzdCB0byBtYW5pcHVsYXRlXHJcbiAgdmFyIGNoaWxkcmVuID0gW11cclxuICB2YXIgaSA9IDBcclxuICB2YXIgaXRlbVxyXG4gIHZhciBpdGVtS2V5XHJcbiAgdmFyIGZyZWVJbmRleCA9IDBcclxuXHJcbiAgLy8gZmlzdCBwYXNzIHRvIGNoZWNrIGl0ZW0gaW4gb2xkIGxpc3Q6IGlmIGl0J3MgcmVtb3ZlZCBvciBub3RcclxuICB3aGlsZSAoaSA8IG9sZExpc3QubGVuZ3RoKSB7XHJcbiAgICBpdGVtID0gb2xkTGlzdFtpXVxyXG4gICAgaXRlbUtleSA9IGdldEl0ZW1LZXkoaXRlbSwga2V5KVxyXG4gICAgaWYgKGl0ZW1LZXkpIHtcclxuICAgICAgaWYgKCFuZXdLZXlJbmRleC5oYXNPd25Qcm9wZXJ0eShpdGVtS2V5KSkge1xyXG4gICAgICAgIGNoaWxkcmVuLnB1c2gobnVsbClcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB2YXIgbmV3SXRlbUluZGV4ID0gbmV3S2V5SW5kZXhbaXRlbUtleV1cclxuICAgICAgICBjaGlsZHJlbi5wdXNoKG5ld0xpc3RbbmV3SXRlbUluZGV4XSlcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdmFyIGZyZWVJdGVtID0gbmV3RnJlZVtmcmVlSW5kZXgrK11cclxuICAgICAgY2hpbGRyZW4ucHVzaChmcmVlSXRlbSB8fCBudWxsKVxyXG4gICAgfVxyXG4gICAgaSsrXHJcbiAgfVxyXG5cclxuICB2YXIgc2ltdWxhdGVMaXN0ID0gY2hpbGRyZW4uc2xpY2UoMClcclxuXHJcbiAgLy8gcmVtb3ZlIGl0ZW1zIG5vIGxvbmdlciBleGlzdFxyXG4gIGkgPSAwXHJcbiAgd2hpbGUgKGkgPCBzaW11bGF0ZUxpc3QubGVuZ3RoKSB7XHJcbiAgICBpZiAoc2ltdWxhdGVMaXN0W2ldID09PSBudWxsKSB7XHJcbiAgICAgIHJlbW92ZShpKVxyXG4gICAgICByZW1vdmVTaW11bGF0ZShpKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaSsrXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBpIGlzIGN1cnNvciBwb2ludGluZyB0byBhIGl0ZW0gaW4gbmV3IGxpc3RcclxuICAvLyBqIGlzIGN1cnNvciBwb2ludGluZyB0byBhIGl0ZW0gaW4gc2ltdWxhdGVMaXN0XHJcbiAgdmFyIGogPSBpID0gMFxyXG4gIHdoaWxlIChpIDwgbmV3TGlzdC5sZW5ndGgpIHtcclxuICAgIGl0ZW0gPSBuZXdMaXN0W2ldXHJcbiAgICBpdGVtS2V5ID0gZ2V0SXRlbUtleShpdGVtLCBrZXkpXHJcblxyXG4gICAgdmFyIHNpbXVsYXRlSXRlbSA9IHNpbXVsYXRlTGlzdFtqXVxyXG4gICAgdmFyIHNpbXVsYXRlSXRlbUtleSA9IGdldEl0ZW1LZXkoc2ltdWxhdGVJdGVtLCBrZXkpXHJcblxyXG4gICAgaWYgKHNpbXVsYXRlSXRlbSkge1xyXG4gICAgICBpZiAoaXRlbUtleSA9PT0gc2ltdWxhdGVJdGVtS2V5KSB7XHJcbiAgICAgICAgaisrXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gbmV3IGl0ZW0sIGp1c3QgaW5lc3J0IGl0XHJcbiAgICAgICAgaWYgKCFvbGRLZXlJbmRleC5oYXNPd25Qcm9wZXJ0eShpdGVtS2V5KSkge1xyXG4gICAgICAgICAgaW5zZXJ0KGksIGl0ZW0pXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIC8vIGlmIHJlbW92ZSBjdXJyZW50IHNpbXVsYXRlSXRlbSBtYWtlIGl0ZW0gaW4gcmlnaHQgcGxhY2VcclxuICAgICAgICAgIC8vIHRoZW4ganVzdCByZW1vdmUgaXRcclxuICAgICAgICAgIHZhciBuZXh0SXRlbUtleSA9IGdldEl0ZW1LZXkoc2ltdWxhdGVMaXN0W2ogKyAxXSwga2V5KVxyXG4gICAgICAgICAgaWYgKG5leHRJdGVtS2V5ID09PSBpdGVtS2V5KSB7XHJcbiAgICAgICAgICAgIHJlbW92ZShpKVxyXG4gICAgICAgICAgICByZW1vdmVTaW11bGF0ZShqKVxyXG4gICAgICAgICAgICBqKysgLy8gYWZ0ZXIgcmVtb3ZpbmcsIGN1cnJlbnQgaiBpcyByaWdodCwganVzdCBqdW1wIHRvIG5leHQgb25lXHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBlbHNlIGluc2VydCBpdGVtXHJcbiAgICAgICAgICAgIGluc2VydChpLCBpdGVtKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaW5zZXJ0KGksIGl0ZW0pXHJcbiAgICB9XHJcblxyXG4gICAgaSsrXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZW1vdmUgKGluZGV4KSB7XHJcbiAgICB2YXIgbW92ZSA9IHtpbmRleDogaW5kZXgsIHR5cGU6IDB9XHJcbiAgICBtb3Zlcy5wdXNoKG1vdmUpXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBpbnNlcnQgKGluZGV4LCBpdGVtKSB7XHJcbiAgICB2YXIgbW92ZSA9IHtpbmRleDogaW5kZXgsIGl0ZW06IGl0ZW0sIHR5cGU6IDF9XHJcbiAgICBtb3Zlcy5wdXNoKG1vdmUpXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZW1vdmVTaW11bGF0ZSAoaW5kZXgpIHtcclxuICAgIHNpbXVsYXRlTGlzdC5zcGxpY2UoaW5kZXgsIDEpXHJcbiAgfVxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgbW92ZXM6IG1vdmVzLFxyXG4gICAgY2hpbGRyZW46IGNoaWxkcmVuXHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ29udmVydCBsaXN0IHRvIGtleS1pdGVtIGtleUluZGV4IG9iamVjdC5cclxuICogQHBhcmFtIHtBcnJheX0gbGlzdFxyXG4gKiBAcGFyYW0ge1N0cmluZ3xGdW5jdGlvbn0ga2V5XHJcbiAqL1xyXG5mdW5jdGlvbiBtYWtlS2V5SW5kZXhBbmRGcmVlIChsaXN0LCBrZXkpIHtcclxuICB2YXIga2V5SW5kZXggPSB7fVxyXG4gIHZhciBmcmVlID0gW11cclxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gbGlzdC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldXHJcbiAgICB2YXIgaXRlbUtleSA9IGdldEl0ZW1LZXkoaXRlbSwga2V5KVxyXG4gICAgaWYgKGl0ZW1LZXkpIHtcclxuICAgICAga2V5SW5kZXhbaXRlbUtleV0gPSBpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBmcmVlLnB1c2goaXRlbSlcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIHtcclxuICAgIGtleUluZGV4OiBrZXlJbmRleCxcclxuICAgIGZyZWU6IGZyZWVcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEl0ZW1LZXkgKGl0ZW0sIGtleSkge1xyXG4gIGlmICghaXRlbSB8fCAha2V5KSByZXR1cm4gdm9pZCA2NjZcclxuICByZXR1cm4gdHlwZW9mIGtleSA9PT0gJ3N0cmluZydcclxuICAgID8gaXRlbVtrZXldXHJcbiAgICA6IGtleShpdGVtKVxyXG59XHJcblxyXG5leHBvcnRzLm1ha2VLZXlJbmRleEFuZEZyZWUgPSBtYWtlS2V5SW5kZXhBbmRGcmVlIC8vIGV4cG9ydHMgZm9yIHRlc3RcclxuZXhwb3J0cy5kaWZmID0gZGlmZlxyXG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIGZvbGxvd2luZyBsb29zbHk6IGh0dHBzOi8vbWVkaXVtLmNvbS9AZGVhdGhtb29kL2hvdy10by13cml0ZS15b3VyLW93bi12aXJ0dWFsLWRvbS1lZTc0YWNjMTMwNjBcblxuY29uc3QgbGlzdERpZmYgPSByZXF1aXJlKCdsaXN0LWRpZmYyJyk7XG5jb25zdCBkZWVwRGlmZiA9IHJlcXVpcmUoJ2RlZXAtZGlmZicpO1xuLy8gY29uc3Qge2RpZmYsIGFwcGx5Q2hhbmdlLCBhcHBseURpZmZ9ID0gcmVxdWlyZSgnZGVlcC1kaWZmJyk7XG5cbmNvbnN0IHtqc29uRXF1YWwsIHRha2UsIGJpdGVyYXRlfSA9IHJlcXVpcmUoJy4vdXRpbC9jb21tb24nKTtcbmNvbnN0IHtzZWxlY3QsIG9uLCBzZXQsIGdldCwgYXBwZW5kLCByZW1vdmUsIGNyZWF0ZSwgcmVwbGFjZX0gPSByZXF1aXJlKCcuL3V0aWwvZG9tJyk7XG5cbmNvbnN0IGNoYW5nZWQgPSAobm9kZTEsIG5vZGUyKSA9PiB0eXBlb2Ygbm9kZTEgIT09IHR5cGVvZiBub2RlMlxuXHR8fCB0eXBlb2Ygbm9kZTEgPT09ICdzdHJpbmcnICYmIG5vZGUxICE9PSBub2RlMlxuXHR8fCBub2RlMS50eXBlICE9PSBub2RlMi50eXBlO1xuXG5jb25zdCB1cGRhdGUgPSAocGFyZW50LCBuZXdOb2RlLCBvbGROb2RlLCBpbmRleCA9IDApID0+XG5cdCghb2xkTm9kZSkgJiYgWygpID0+IGFwcGVuZChwYXJlbnQsIGNyZWF0ZShuZXdOb2RlKSldXG5cdHx8ICghbmV3Tm9kZSkgJiYgWyhjaGlsZCA9PiAoKSA9PiByZW1vdmUocGFyZW50LCBjaGlsZCkpKHBhcmVudC5jaGlsZE5vZGVzW2luZGV4XSldXG5cdHx8IG5ld05vZGUgPT09IG9sZE5vZGUgJiYgW11cblx0fHwgKGNoYW5nZWQobmV3Tm9kZSwgb2xkTm9kZSkpXG5cdFx0JiYgWyhjaGlsZCA9PiAoKSA9PiByZXBsYWNlKHBhcmVudCwgY3JlYXRlKG5ld05vZGUpLCBjaGlsZCkpKHBhcmVudC5jaGlsZE5vZGVzW2luZGV4XSldXG5cdHx8IChuZXdOb2RlLmNoaWxkcmVuLmxlbmd0aCA9PT0gb2xkTm9kZS5jaGlsZHJlbi5sZW5ndGgpICYmIGpzb25FcXVhbChuZXdOb2RlLCBvbGROb2RlKSAmJiBbXVxuXHR8fCBuZXdOb2RlLnR5cGUgJiYgKG5ld05vZGUuY2hpbGRyZW4ubGVuZ3RoICE9PSBvbGROb2RlLmNoaWxkcmVuLmxlbmd0aClcblx0XHQmJiBbTWF0aC5taW4obmV3Tm9kZS5jaGlsZHJlbi5sZW5ndGgsIG9sZE5vZGUuY2hpbGRyZW4ubGVuZ3RoKV0ubWFwKG1pbkxlbmd0aCA9PlxuXHRcdFx0anNvbkVxdWFsKG5ld05vZGUuY2hpbGRyZW4uc2xpY2UoMCwgbWluTGVuZ3RoKSwgb2xkTm9kZS5jaGlsZHJlbi5zbGljZSgwLCBtaW5MZW5ndGgpKVxuXHRcdFx0JiYgYml0ZXJhdGUobmV3Tm9kZS5jaGlsZHJlbiwgb2xkTm9kZS5jaGlsZHJlbixcblx0XHRcdFx0KG4sIG8sIF9pKSA9PiB1cGRhdGUocGFyZW50LmNoaWxkTm9kZXNbaW5kZXhdLCBuLCBvLCBfaSksXG5cdFx0XHRcdG1pbkxlbmd0aFxuXHRcdFx0KVxuXHRcdCkucG9wKClcblx0fHwgKG5ld05vZGUudHlwZSlcblx0XHQmJiBiaXRlcmF0ZShuZXdOb2RlLmNoaWxkcmVuLCBvbGROb2RlLmNoaWxkcmVuLFxuXHRcdFx0KG4sIG8sIF9pKSA9PiB1cGRhdGUocGFyZW50LmNoaWxkTm9kZXNbaW5kZXhdLCBuLCBvLCBfaSlcblx0XHQpXG5cdHx8IFtdO1xuXG5jb25zdCBoID0gKHR5cGUsIHByb3BzLCAuLi5jaGlsZHJlbikgPT4gKHtcblx0dHlwZSxcblx0cHJvcHMsXG5cdGNoaWxkcmVuOlxuXHRcdGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCA9PT0gMSAmJiBjaGlsZHJlblswXSBpbnN0YW5jZW9mIEFycmF5XG5cdFx0XHQmJiBjaGlsZHJlblswXVxuXHRcdHx8IGNoaWxkcmVuXG59KTtcblxuY29uc3QgYXR0YWNoID0gKHNlbGVjdG9yLCB0cmVlKSA9PiAoe1xuXHRlbDogYXBwZW5kKFxuXHRcdHNlbGVjdChzZWxlY3RvciksIGNyZWF0ZSh0cmVlKVxuXHQpLFxuXHR0cmVlXG59KTtcblxuY29uc3QgcGF0Y2ggPSAodmRvbSwgdHJlZSkgPT4ge1xuXHQvLyBjb25zb2xlLmxvZyhkZWVwRGlmZi5kaWZmKHZkb20udHJlZSwgdHJlZSkpO1xuXHRsZXQgcGF0Y2hlcyA9IHVwZGF0ZSh2ZG9tLmVsLCB0cmVlLCB2ZG9tLnRyZWUpO1xuXHRjb25zb2xlLmxvZyhwYXRjaGVzKTtcblx0cGF0Y2hlcy5mb3JFYWNoKHAgPT4gcCgpKTtcblx0cmV0dXJuICh7XG5cdFx0ZWw6IHZkb20uZWwsXG5cdFx0dHJlZVxuXHR9KTtcbn07XG5cbmxldCB2ZG9tID0gYXR0YWNoKCcjdWknLCBoKCd1bCcsIHt9LFxuXHRoKCdsaScsIHt9LCAnTGlzdCBJdGVtIDEnKSxcblx0aCgnbGknLCB7fSwgJ0xpc3QgSXRlbSAyJyksXG5cdGgoJ2xpJywge30sICdMaXN0IEl0ZW0gMycpXG4pKTtcblxub24oc2VsZWN0KCcjcGF0Y2gnKSwgJ2NsaWNrJywgZXYgPT4ge1xuXHR2ZG9tID0gcGF0Y2godmRvbSwgaCgncCcsIHt9LCAnSGVsbG8gV29ybGQhJykpO1xufSk7XG5cbm9uKHNlbGVjdCgnI2l0ZW1zQ291bnQnKSwgJ2lucHV0JywgZXYgPT4ge1xuXHR2ZG9tID0gcGF0Y2godmRvbSwgaCgndWwnLCB7fSwgdGFrZShldi50YXJnZXQudmFsdWUpLm1hcChpbmRleCA9PlxuXHRcdGgoJ2xpJywge30sIGBMaXN0IEl0ZW0gJHtpbmRleH1gKVxuXHQpKSk7XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QganNvbkVxdWFsID0gKGEsIGIpID0+XG5cdEpTT04uc3RyaW5naWZ5KGEpID09PSBKU09OLnN0cmluZ2lmeShiKTtcblxuY29uc3QgYml0ZXJhdGUgPSAoYSwgYiwgY2IsIGluZGV4ID0gMCkgPT5cblx0KHR5cGVvZiBhW2luZGV4XSAhPT0gJ3VuZGVmaW5lZCdcblx0fHwgdHlwZW9mIGJbaW5kZXhdICE9PSAndW5kZWZpbmVkJylcblx0XHQmJiBbXS5jb25jYXQoXG5cdFx0XHRjYihhW2luZGV4XSwgYltpbmRleF0sIGluZGV4KSxcblx0XHRcdGJpdGVyYXRlKGEsIGIsIGNiLCBpbmRleCArIDEpXG5cdFx0KVxuXHRcdHx8IFtdO1xuXG5jb25zdCBiaXRlcmF0ZTIgPSAoYSwgYiwgY2IpID0+IHtcblx0Zm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IGEubGVuZ3RoIHx8IGluZGV4IDwgYi5sZW5ndGg7IGluZGV4KyspIHtcblx0XHRjYihhW2luZGV4XSwgYltpbmRleF0sIGluZGV4KTtcblx0fVxufTtcbi8vIGJpdGVyYXRlKFsxLCAyLCAzLCA0XSwgWydhJywgJ2InLCAnYyddLCAoYSwgYiwgaW5kZXgpID0+IGNvbnNvbGUubG9nKGEsIGIsIGluZGV4KSk7XG5cbmNvbnN0IHRha2UgPSAobnVtLCBpbmRleCA9IDApID0+XG5cdChpbmRleCA8IG51bSkgPyBbXS5jb25jYXQoaW5kZXgsIHRha2UobnVtLCBpbmRleCArIDEpKSA6IFtdO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0anNvbkVxdWFsLFxuXHRiaXRlcmF0ZSxcblx0Yml0ZXJhdGUyLFxuXHR0YWtlXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBzZWxlY3QgPSBzZWxlY3RvciA9PlxuXHQoc2VsZWN0b3IgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkgJiYgc2VsZWN0b3Jcblx0fHwgKHR5cGVvZiBzZWxlY3RvciA9PT0gJ3N0cmluZycpICYmIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpXG5cdHx8IG51bGw7XG5cbmNvbnN0IG9uID0gKGVsLCBldmVudE5hbWUsIHNlbGVjdG9yLCBjYikgPT5cblx0ZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGV2ID0+XG5cdFx0KHR5cGVvZiBzZWxlY3RvciA9PT0gJ3N0cmluZycgJiYgdHlwZW9mIGNiICE9PSAndW5kZWZpbmVkJylcblx0XHRcdD8gKEFycmF5LmZyb20oXG5cdFx0XHRcdGVsLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKS5pbmRleE9mKGV2LnRhcmdldCkgPiAtMSlcblx0XHRcdFx0XHQ/IGNiKGV2KSA6IGZhbHNlXG5cdFx0XHQ6IChjYiA9PiBjYihldikpKHNlbGVjdG9yKSk7XG5cbmNvbnN0IGdldCA9IChlbCwgYXR0ciwgZGVmYXVsdFZhbHVlKSA9PlxuXHRlbC5nZXRBdHRyaWJ1dGUoYXR0cikgfHwgZGVmYXVsdFZhbHVlO1xuXG5jb25zdCBzZXQgPSAoZWwsIGF0dHIsIHZhbHVlKSA9PiBlbC5zZXRBdHRyaWJ1dGUoYXR0ciwgdmFsdWUpO1xuXG5jb25zdCBhcHBlbmQgPSAocGFyZW50LCBjaGlsZHJlbiA9IFtdKSA9PiAoXG5cdCgoY2hpbGRyZW4gaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkgJiYgcGFyZW50LmFwcGVuZENoaWxkKGNoaWxkcmVuKVxuXHR8fCAoY2hpbGRyZW4gaW5zdGFuY2VvZiBBcnJheSkgJiYgY2hpbGRyZW4uZm9yRWFjaChlbCA9PlxuXHRcdHBhcmVudC5hcHBlbmRDaGlsZChlbClcblx0KSksXG5cdHBhcmVudFxuKTtcblxuY29uc3QgcmVtb3ZlID0gKHBhcmVudCwgY2hpbGQpID0+IHtcblx0Y29uc29sZS5sb2coJ3JlbW92aW5nJywgcGFyZW50LCBjaGlsZCk7XG5cdHJldHVybiB0eXBlb2YgY2hpbGQgPT09ICdudW1iZXInXG5cdFx0JiYgcGFyZW50LnJlbW92ZUNoaWxkKHBhcmVudC5jaGlsZE5vZGVzW2NoaWxkXSlcblx0fHwgY2hpbGQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudFxuXHRcdCYmIHBhcmVudC5yZW1vdmVDaGlsZChjaGlsZCk7XG59O1xuXG5jb25zdCBjcmVhdGUgPSBub2RlID0+IHR5cGVvZiBub2RlID09PSAnc3RyaW5nJ1xuXHQ/IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKG5vZGUpXG5cdDogYXBwZW5kKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQobm9kZS50eXBlKSwgbm9kZS5jaGlsZHJlbi5tYXAoY3JlYXRlKSk7XG5cbmNvbnN0IHJlcGxhY2UgPSAocGFyZW50LCBlbCwgY2hpbGQpID0+IHBhcmVudC5yZXBsYWNlQ2hpbGQoXG5cdGVsLCAoY2hpbGQgaW5zdGFuY2VvZiBOb2RlKSA/IGNoaWxkIDogcGFyZW50LmNoaWxkTm9kZXNbY2hpbGRdXG4pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0c2VsZWN0LFxuXHRvbixcblx0Z2V0LFxuXHRzZXQsXG5cdGFwcGVuZCxcblx0cmVtb3ZlLFxuXHRjcmVhdGUsXG5cdHJlcGxhY2Vcbn07XG4iXX0=
