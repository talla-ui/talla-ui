import { UIIconResource } from "@desk-framework/frame-core";

/** @internal SVG icon set */
export const icons: [name: string, icon: UIIconResource][] = [
	["blank", new UIIconResource(`<svg viewBox="0 0 48 48"></svg>`)],
	[
		"close",
		new UIIconResource(
			`<svg viewBox="0 0 48 48"><path d="M39 12l-3-3l-12 12l-12-12l-3 3l12 12l-12 12l3 3l12-12l12 12l3-3l-12-12l12-12z"/></svg>`,
		),
	],
	[
		"check",
		new UIIconResource(
			`<svg viewBox="0 0 48 48"><path d="M18 32l-8-8l-3 3L18 38l24-24-3-3z"/></svg>`,
		),
	],
	[
		"chevronDown",
		new UIIconResource(
			`<svg viewBox="0 0 48 48"><path d="M32 18l-9 9l-9-9l-3 3l12 12l12-12z"/></svg>`,
		),
	],
	[
		"chevronUp",
		new UIIconResource(
			`<svg viewBox="0 0 48 48"><path d="M32 30l-9-9l-9 9l-3-3l12-12l12 12z"/></svg>`,
		),
	],
	[
		"chevronNext",
		new UIIconResource(
			`<svg viewBox="0 0 48 48"><path d="M18 32l9-9l-9-9l3-3l12 12l-12 12z"/></svg>`,
		).setMirrorRTL(),
	],
	[
		"chevronBack",
		new UIIconResource(
			`<svg viewBox="0 0 48 48"><path d="M30 32l-9-9l9-9l-3-3l-12 12l12 12z"/></svg>`,
		).setMirrorRTL(),
	],
	[
		"plus",
		new UIIconResource(
			`<svg viewBox="0 0 48 48"><path d="M8 20h14V6h4v14h14v4H26v14h-4V24H8z"/></svg>`,
		),
	],
	[
		"minus",
		new UIIconResource(
			`<svg viewBox="0 0 48 48"><path d="M8 20H40v4H8z"/></svg>`,
		),
	],
	[
		"menu",
		new UIIconResource(
			`<svg viewBox="0 0 48 48"><path d="M8 10H40v4H8zM8 20H40v4H8zM8 30H40v4H8z"/></svg>`,
		),
	],
	[
		"more",
		new UIIconResource(
			`<svg viewBox="0 0 48 48"><circle cx="24"cy="10"r="4"/><circle cx="24"cy="24"r="4"/><circle cx="24"cy="38"r="4"/></svg>`,
		),
	],
];
