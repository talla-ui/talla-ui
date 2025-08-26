import { UI, UIIconResource } from "@talla-ui/core";

function _mk(content: string, mirror = false, size = 48) {
	return new UIIconResource(
		`<svg viewBox="0 0 ${size} ${size}">` + content + `</svg>`,
	).setMirrorRTL(mirror);
}

/** @internal simple SVG icon set */
export default {
	blank: _mk(""),
	close: _mk(
		`<path d="M39 12l-3-3l-12 12l-12-12l-3 3l12 12l-12 12l3 3l12-12l12 12l3-3l-12-12l12-12z"/>`,
	),
	check: _mk(`<path d="M18 32l-8-8l-3 3L18 38l24-24-3-3z"/>`),
	chevronDown: _mk(`<path d="M32 18l-9 9l-9-9l-3 3l12 12l12-12z"/>`),
	chevronUp: _mk(`<path d="M32 30l-9-9l-9 9l-3-3l12-12l12 12z"/>`),
	chevronNext: _mk(`<path d="M18 32l9-9l-9-9l3-3l12 12l-12 12z"/>`, true),
	chevronBack: _mk(`<path d="M30 32l-9-9l9-9l-3-3l-12 12l12 12z"/>`, true),
	plus: _mk(`<path d="M8 20h14V6h4v14h14v4H26v14h-4V24H8z"/>`),
	minus: _mk(`<path d="M8 20H40v4H8z"/>`),
	menu: _mk(`<path d="M8 10H40v4H8zM8 20H40v4H8zM8 30H40v4H8z"/>`),
	more: _mk(
		`<circle cx="24"cy="10"r="4"/><circle cx="24"cy="24"r="4"/><circle cx="24"cy="38"r="4"/>`,
	),
	search: _mk(
		`<path d="m19.6 21l-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14"/>`,
		false,
		24,
	),
} as Readonly<Record<UI.IconName, UIIconResource>>;
