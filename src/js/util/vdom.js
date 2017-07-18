'use strict';

const htmlTags = require('html-tags');

const {jsonEqual, take, biterate} = require('./common');
const {select, on, set, get, applyClasses, append, remove, create, replace} = require('./dom');

const breakingChanges = (node1, node2) => typeof node1 !== typeof node2
	|| typeof node1 === 'string' && node1 !== node2
	|| node1.tag !== node2.tag;

const update = (parent, newNode, oldNode, index = 0) =>
	// 1. breaking changes
	// if no old node just append the new one
	(!oldNode) && [() => append(parent, create(newNode))]
	// if no new node remove the old one
	|| (!newNode) && [(child => () => remove(parent, child))(parent.childNodes[index])]
	// if no change no patches
	|| newNode === oldNode && []
	// if breaking changes replace old node with new
	|| (breakingChanges(newNode, oldNode))
		&& [(child => () => replace(parent, create(newNode), child))(parent.childNodes[index])]
	// 2. no breaking changes
	|| [].concat(
		// 2.3 props, attrs, events
		// classes
		!jsonEqual(newNode.class, oldNode.class)
			? [(child => () => applyClasses(child, newNode.class))(parent.childNodes[index])]
			: [],
		// 2.2 children
		// same length and same contents -> no patches needed
		(newNode.children.length === oldNode.children.length) && jsonEqual(newNode, oldNode) && []
		// different lengths, but contain matching portions -> iterate through the differences
		|| newNode.tag && (newNode.children.length !== oldNode.children.length)
			&& [Math.min(newNode.children.length, oldNode.children.length)].map(minLength =>
				jsonEqual(newNode.children.slice(0, minLength), oldNode.children.slice(0, minLength))
				&& biterate(newNode.children, oldNode.children,
					(n, o, _i) => update(parent.childNodes[index], n, o, _i),
					minLength
				)
			).pop()
		// now iterate through the children (the tag is to indicate that this is a htmlnode)
		|| (newNode.tag)
			&& biterate(newNode.children, oldNode.children,
				(n, o, _i) => update(parent.childNodes[index], n, o, _i)
			)
		|| []
	);

const processSelector = selector => ({
	tag: (selector.match(/^([a-zA-Z0-9]+)/ig) || ['div']).shift(),
	class: (selector.match(/(\.[a-zA-Z0-9\-_]+)/ig) || []).map(cls => cls.replace('.', '')),
	id: (selector.match(/(#[a-zA-Z0-9\-_]+)/ig) || []).map(cls => cls.replace('#', '')).shift()
});

const processData = (node, data = {}) => Object.assign({}, node, {
	props: data.props || {},
	attrs: Object.assign({},
		data.attrs,
		node.id ? {id: node.id} : {}
	),
	class: [].concat(
		node.class,
		Object.keys(data.class || {}).filter(cls => data.class[cls])
	)
});

const processChildren = children =>
	children && children.length === 1 && children[0] instanceof Array
		&& children[0]
		|| children;

// our h (hyperscript) function
const h = (selector, data, ...children) => [processSelector(selector)].map(
	node => Object.assign(
		{},
		node,
		processData(node, (data && !data.tag) ? data : {}),
		{
			children: processChildren([].concat(
				data && (typeof data === 'string' || data.tag || data instanceof Array) ? data : [],
				children && children || []
			))
		}
	)
).pop();

// attach an apply a virtual dom tree to an element
const attach = (selector, tree) => ({
	el: append(
		select(selector), create(tree)
	),
	tree
});
/*
const attach = (selector, tree) => [select(selector)].map(oldEl => ({
	el: replace(oldEl.parentNode, create(tree), oldEl),
	tree
})).pop();
*/

// apply a new patch to a virtual dom tree
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

// generate hyperscript helpers ul('#list') -> h('ul#list')
const hyperHelpers = htmlTags.reduce(
	(o, tag) => {
		o[tag] = function() {
			return [Array.from(arguments)]
				// .map(processAttrs)
				.map(args => (
					// is the first argument a selector
					args[0] && typeof args[0] === 'string' && args[0].match(/^(\.|#)[a-zA-Z\-_0-9]+/ig))
						? [].concat(tag + args[0], args.slice(1))
						: [tag].concat(args))
				.map(args => h.apply(this, args))
				.pop();
		};
		return o;
	}, {}
);

console.log(hyperHelpers);

module.exports = Object.assign(
	{
		breakingChanges,
		update,
		attach,
		patch,
		h
	},
	hyperHelpers
);
