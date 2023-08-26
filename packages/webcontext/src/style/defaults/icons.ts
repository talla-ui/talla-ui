import { UIIcon } from "desk-frame";

/** @internal SVG icon set */
export const icons = {
	Blank: new UIIcon(`<svg viewBox="0 0 48 48"></svg>`),
	Close: new UIIcon(
		`<svg viewBox="0 0 48 48"><path d="M39 12l-3-3l-12 12l-12-12l-3 3l12 12l-12 12l3 3l12-12l12 12l3-3l-12-12l12-12z"/></svg>`
	),
	Check: new UIIcon(
		`<svg viewBox="0 0 48 48"><path d="M18 32l-8-8l-3 3L18 38l24-24-3-3z"/></svg>`
	),
	ExpandDown: new UIIcon(
		`<svg viewBox="0 0 48 48"><path d="M32 18l-9 9l-9-9l-3 3l12 12l12-12z"/></svg>`
	),
	ExpandUp: new UIIcon(
		`<svg viewBox="0 0 48 48"><path d="M32 30l-9-9l-9 9l-3-3l12-12l12 12z"/></svg>`
	),
	ExpandRight: new UIIcon(
		`<svg viewBox="0 0 48 48"><path d="M18 32l9-9l-9-9l3-3l12 12l-12 12z"/></svg>`
	),
	ExpandLeft: new UIIcon(
		`<svg viewBox="0 0 48 48"><path d="M30 32l-9-9l9-9l-3-3l-12 12l12 12z"/></svg>`
	),
	Plus: new UIIcon(
		`<svg viewBox="0 0 48 48"><path d="M8 20h14V6h4v14h14v4H26v14h-4V24H8z"/></svg>`
	),
	Minus: new UIIcon(`<svg viewBox="0 0 48 48"><path d="M8 20H40v4H8z"/></svg>`),
	Menu: new UIIcon(
		`<svg viewBox="0 0 48 48"><path d="M8 10H40v4H8zM8 20H40v4H8zM8 30H40v4H8z"/></svg>`
	),
	More: new UIIcon(
		`<svg viewBox="0 0 48 48"><circle cx="24"cy="10"r="4"/><circle cx="24"cy="24"r="4"/><circle cx="24"cy="38"r="4"/></svg>`
	),
};
