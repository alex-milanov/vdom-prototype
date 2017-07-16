'use strict';

const {
	section, h1, a, div, i,
	form, button, input, label,
	ul, li, h, hr
} = require('../util/vdom');

const {take} = require('../util/common');

module.exports = ({state, actions}) => section('#ui',
	h1('VDOM Prototype'),
	hr(),
	i('#toggle.fa', {
		class: {
			'fa-toggle-on': state.toggled,
			'fa-toggle-off': !state.toggled
		}
	}),
	label('Items Count'),
	' ',
	input('#itemsCount', {
		attrs: {
			type: 'number',
			value: state.listCount
		}
	}),
	ul('.itemsList',
		take(state.listCount).map(index =>
			li(`List Item ${index}`)
		)
	)
);
