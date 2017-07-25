'use strict';

const {
	section, h1, a, div, i,
	form, button, input, label,
	select, option, header,
	ul, li, h, hr
} = require('../util/vdom');

const {take} = require('../util/common');

module.exports = ({state, actions}) => section('#ui',
	header(
		h1('VDOM Prototype')
	),
	i('#toggle.fa', {
		class: {
			'fa-toggle-on': state.toggled,
			'fa-toggle-off': !state.toggled
		}
	}),
	label('Items Count'),
	' ',
	select('#itemsType', ['number', 'text', 'password'].map(type =>
		option({props: {
			value: type
		}}, type)
	)),
	input('#itemsCount', {
		attrs: {
			type: state.itemsType
		},
		props: {
			value: state.itemsCount
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
