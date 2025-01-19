import { UIIconResource } from "@talla-ui/core";

/** @internal SVG icon set */
export const icons: [name: string, icon: UIIconResource][] = [
	["Blank", new UIIconResource(`<svg></svg>`)],
	["Close", new UIIconResource(`<svg id="test-close"></svg>`)],
	["Check", new UIIconResource(`<svg id="test-check"></svg>`)],
	["ChevronDown", new UIIconResource(`<svg id="test-chevronDown"></svg>`)],
	["ChevronUp", new UIIconResource(`<svg id="test-chevronUp"></svg>`)],
	[
		"ChevronNext",
		new UIIconResource(`<svg id="test-chevronNext"></svg>`).setMirrorRTL(),
	],
	[
		"ChevronBack",
		new UIIconResource(`<svg id="test-chevronBack"></svg>`).setMirrorRTL(),
	],
	["Plus", new UIIconResource(`<svg id="test-plus"></svg>`)],
	["Minus", new UIIconResource(`<svg id="test-minus"></svg>`)],
	["Menu", new UIIconResource(`<svg id="test-menu"></svg>`)],
	["More", new UIIconResource(`<svg id="test-more"></svg>`)],
	["Search", new UIIconResource(`<svg id="test-search"></svg>`)],
];
