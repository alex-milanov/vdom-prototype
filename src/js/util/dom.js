'use strict';

const {put, del} = require('./common');
const {fn} = require('iblokz-data');

const keys = o => Object.keys(o);

const select = selector =>
	(selector instanceof HTMLElement) && selector
	|| (typeof selector === 'string') && document.querySelector(selector)
	|| null;

const createEvent = (el, eventName, selector, cb) =>
	ev => (typeof selector === 'string' && typeof cb !== 'undefined')
		? (Array.from(
			el.querySelectorAll(selector)).indexOf(ev.target) > -1)
				? cb(ev) : false
		: (cb => cb(ev))(selector);

const on = (el, eventName, cb) =>
// [createEvent(el, eventName, selector, cb)].map(cb => (
	el.addEventListener(eventName, cb);
// {el, cb} ));

const off = (el, eventName, cb) => el.removeEventListener(
	eventName, cb // createEvent(el, eventName, selector, cb)
);

const get = (el, attr, defaultValue) =>
	el.getAttribute(attr) || defaultValue;

const set = (el, attr, value) => el.setAttribute(attr, value);
const unset = (el, attr) => el.removeAttribute(attr);

const apply = (el, attrs) => (
	Object.keys(attrs).forEach(attr => set(el, attr, attrs[attr])),
	el
);

const applyProps = (el, props) => (Object.keys(props)
	.forEach(prop => put(el, prop, props[prop])),
	// console.log(props, el),
	el);

const applyClasses = (el, classes) => (set(el, 'class', ''), classes.forEach(cls =>
	el.classList.add(cls)
), el);

const applyEvents = (el, events) => (keys(events)
	.forEach(eventName => on(el, eventName, events[eventName])),
	el);

const applyStyle = (el, style) => (keys(style)
	.forEach(k => put(el.style, k, style[k])),
	el);

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
	: append(
		applyEvents(
			applyStyle(
				applyProps(
					applyClasses(
						apply(document.createElement(node.tag), node.attrs),
						node.class
					),
					node.props
				),
				node.style
			),
			node.on
		),
		node.children.map(create)
	);

const replace = (parent, el, child) => (parent.replaceChild(
	el, (child instanceof Node) ? child : parent.childNodes[child]
), el);

module.exports = {
	select,
	on,
	off,
	get,
	set,
	unset,
	applyClasses,
	append,
	remove,
	create,
	replace
};
