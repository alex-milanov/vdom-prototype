'use strict';

const {
	section, h1, a, div, i, span,
	form, button, input, label,
	select, option, header,
	ul, li, h, hr
} = require('../util/vdom');

const {take} = require('../util/common');

module.exports = ({state, actions}) => section('#ui',
	header(
		h1('<!-- VDOM Prototype -->')
	),
	i('#toggle.fa', {
		on: {
			click: () => actions.toggle()
		},
		class: {
			'fa-toggle-on': state.toggled,
			'fa-toggle-off': !state.toggled
		}
	}),
	' ',
	label('Items Count'),
	' ',
	select('#itemsType', {
		on: {
			change: ev => actions.set('itemsType', ev.target.value)
		}
	}, ['number', 'text', 'password'].map(type =>
		option({props: {
			value: type
		}}, type)
	)),
	' ',
	input('#itemsCount', {
		on: {
			input: ev => actions.set('itemsCount', ev.target.value)
		},
		attrs: {
			type: state.itemsType
		},
		props: {
			value: state.itemsCount
		},
		style: {
			width: (Math.max(3, String(state.itemsCount).length) + 3) * 0.60 + 'em'
		}
	}),
	/*
	input({
		attrs: {
			type: 'checkbox',
			checked: state.itemsType === 'number'
		}
	}),
	*/
	ul('.itemsList',
		(state.itemsType === 'number') && take(state.itemsCount).map(index =>
			li(`List Item ${index}`)
		) || []
	)
);
