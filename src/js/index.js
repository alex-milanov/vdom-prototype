'use strict';

// following loosly: https://medium.com/@deathmood/how-to-write-your-own-virtual-dom-ee74acc13060

const listDiff = require('list-diff2');
const deepDiff = require('deep-diff');
// const {diff, applyChange, applyDiff} = require('deep-diff');

const {take} = require('./util/common');
const {on, select} = require('./util/dom');
const {attach, patch, h} = require('./util/vdom');

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
