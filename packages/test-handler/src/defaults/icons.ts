import { UI, UIIconResource } from "@talla-ui/core";

/** @internal test SVG icon set */
export default {
	blank: new UIIconResource(`<svg></svg>`),
	close: new UIIconResource(`<svg id="test-close"></svg>`),
	check: new UIIconResource(`<svg id="test-check"></svg>`),
	chevronDown: new UIIconResource(`<svg id="test-chevronDown"></svg>`),
	chevronUp: new UIIconResource(`<svg id="test-chevronUp"></svg>`),
	chevronNext: new UIIconResource(
		`<svg id="test-chevronNext"></svg>`,
	).setMirrorRTL(),
	chevronBack: new UIIconResource(
		`<svg id="test-chevronBack"></svg>`,
	).setMirrorRTL(),
	plus: new UIIconResource(`<svg id="test-plus"></svg>`),
	minus: new UIIconResource(`<svg id="test-minus"></svg>`),
	menu: new UIIconResource(`<svg id="test-menu"></svg>`),
	more: new UIIconResource(`<svg id="test-more"></svg>`),
	search: new UIIconResource(`<svg id="test-search"></svg>`),
} as Readonly<Record<UI.IconName, UIIconResource>>;
