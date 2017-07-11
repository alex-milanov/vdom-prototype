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
