'use strict';

// following loosly: https://medium.com/@deathmood/how-to-write-your-own-virtual-dom-ee74acc13060

// lib
const Rx = require('rx');
const $ = Rx.Observable;

//
const {obj} = require('iblokz-data');

const listDiff = require('list-diff2');
const deepDiff = require('deep-diff');
// const {diff, applyChange, applyDiff} = require('deep-diff');

const {take} = require('./util/common');
const {on, select} = require('./util/dom');
const {attach, patch, h} = require('./util/vdom');

const ui = require('./ui');

// actions
const actions$ = new Rx.Subject();
const actions = {
	set: (path, value) => actions$.onNext(
		state => obj.patch(state, path, value)
	),
	toggle: () => actions$.onNext(
		state => Object.assign({}, state, {toggled: !state.toggled})
	),
	initial: {listCount: 3, itemsType: 'number', toggled: false}
};

// reducing the stream of actions to the app state
const state$ = actions$
	.startWith(() => actions.initial)
	.scan((state, reducer) => reducer(state), {})
	.map(state => (console.log(state), state))
	.share();

let vdom = attach('#ui', ui({state: actions.initial, actions}));

console.log(vdom);

on(document, 'click', '#toggle', ev => actions.toggle());

on(document, 'input', '#itemsCount', ev => {
	actions.set('itemsCount', ev.target.value);
	// vdom = patch(vdom, h('ul', {}, take(ev.target.value).map(index =>
	// 	h('li', {}, `List Item ${index}`)
	// )));
});

on(document, 'change', '#itemsType', ev => {
	actions.set('itemsType', ev.target.value);
	// vdom = patch(vdom, h('ul', {}, take(ev.target.value).map(index =>
	// 	h('li', {}, `List Item ${index}`)
	// )));
});

// mapping the state to the ui
const ui$ = state$.map(state => ui({state, actions}));

ui$.subscribe(vtree => {
	vdom = patch(vdom, vtree);
});
