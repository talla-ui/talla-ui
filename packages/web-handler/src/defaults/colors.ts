import { UI, UIColor } from "@talla-ui/core";

/** @internal Returns the default color set */
export function makeDefaultColors(): Record<UIColor.ColorName, UIColor> {
	return {
		transparent: new UIColor("#00000000"),
		black: new UIColor("#000000"),
		darkerGray: new UIColor("#333333"),
		darkGray: new UIColor("#777777"),
		gray: new UIColor("#aaaaaa"),
		lightGray: new UIColor("#dddddd"),
		white: new UIColor("#ffffff"),
		slate: new UIColor("#667788"),
		lightSlate: new UIColor("#c0c8d0"),
		red: new UIColor("#ee3333"),
		orange: new UIColor("#ee9922"),
		yellow: new UIColor("#ddcc33"),
		lime: new UIColor("#99bb33"),
		green: new UIColor("#44aa44"),
		turquoise: new UIColor("#33aaaa"),
		cyan: new UIColor("#33bbbb"),
		blue: new UIColor("#2277ff"),
		violet: new UIColor("#8844ee"),
		purple: new UIColor("#aa4488"),
		magenta: new UIColor("#dd2299"),
		divider: UI.colors.background.text().alpha(0.15),
		accent: UI.colors.background.map((bg) =>
			UIColor.isBrightColor(bg)
				? new UIColor("#333333")
				: new UIColor("#555555"),
		),
		background: UI.colors.white,
		shade: UI.colors.background.contrast(-0.05),
		text: UI.colors.background.text(),
		darkText: UI.colors.black,
		lightText: UI.colors.white,
		danger: UI.colors.red,
		success: UI.colors.green,
		link: UI.colors.blue,
	};
}
