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
