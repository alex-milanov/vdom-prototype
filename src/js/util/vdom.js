'use strict';

const {jsonEqual, take, biterate} = require('./common');
const {select, on, set, get, append, remove, create, replace} = require('./dom');

const changed = (node1, node2) => typeof node1 !== typeof node2
	|| typeof node1 === 'string' && node1 !== node2
	|| node1.tag !== node2.tag;

const update = (parent, newNode, oldNode, index = 0) =>
	(!oldNode) && [() => append(parent, create(newNode))]
	|| (!newNode) && [(child => () => remove(parent, child))(parent.childNodes[index])]
	|| newNode === oldNode && []
	|| (changed(newNode, oldNode))
		&& [(child => () => replace(parent, create(newNode), child))(parent.childNodes[index])]
	|| (newNode.children.length === oldNode.children.length) && jsonEqual(newNode, oldNode) && []
	|| newNode.tag && (newNode.children.length !== oldNode.children.length)
		&& [Math.min(newNode.children.length, oldNode.children.length)].map(minLength =>
			jsonEqual(newNode.children.slice(0, minLength), oldNode.children.slice(0, minLength))
			&& biterate(newNode.children, oldNode.children,
				(n, o, _i) => update(parent.childNodes[index], n, o, _i),
				minLength
			)
		).pop()
	|| (newNode.tag)
		&& biterate(newNode.children, oldNode.children,
			(n, o, _i) => update(parent.childNodes[index], n, o, _i)
		)
	|| [];

const processSelector = selector => ({
	tag: (selector.match(/^([a-zA-Z]+)/ig) || ['div']).shift(),
	class: (selector.match(/(\.[a-zA-Z0-9\-_]+)/ig) || []).map(cls => cls.replace('.', '')),
	id: (selector.match(/(#[a-zA-Z0-9\-_]+)/ig) || []).map(cls => cls.replace('#', '')).shift()
});

const processData = (data, node) => Object.assign({}, node, {
	props: data.props || {},
	attrs: data.attrs || {},
	class: [].concat(
		node.class,
		Object.keys(data.class || {}).filter(cls => data.class[cls])
	)
});

const h = (selector, data, ...children) => [processSelector(selector)].map(
	node => Object.assign(
		{},
		node,
		!data.tag ? processData(data, node) : {},
		{
			children: [].concat(
				data.tag ? data : [],
				children && children.length === 1 && children[0] instanceof Array
					&& children[0]
				|| children
			)
		}
	)
).pop();

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

module.exports = {
	changed,
	update,
	attach,
	patch,
	h
};
