import { UIColor } from "@talla-ui/core";

/** @internal Default set of colors */
export const colors: [name: string, color: UIColor][] = [
	["Black", new UIColor("#000000")],
	["DarkerGray", new UIColor("#333333")],
	["DarkGray", new UIColor("#777777")],
	["Gray", new UIColor("#aaaaaa")],
	["LightGray", new UIColor("#dddddd")],
	["White", new UIColor("#ffffff")],
	["Slate", new UIColor("#667788")],
	["LightSlate", new UIColor("#c0c8d0")],
	["Red", new UIColor("#ee3333")],
	["Orange", new UIColor("#ee9922")],
	["Yellow", new UIColor("#ddcc33")],
	["Lime", new UIColor("#99bb33")],
	["Green", new UIColor("#44aa44")],
	["Turquoise", new UIColor("#33aaaa")],
	["Cyan", new UIColor("#33bbbb")],
	["Blue", new UIColor("#2277ff")],
	["Violet", new UIColor("#8844ee")],
	["Purple", new UIColor("#aa4488")],
	["Magenta", new UIColor("#dd2299")],
	["Separator", new UIColor("Background").text().alpha(0.25)],
	["Background", new UIColor("White")],
	["Text", new UIColor("Background").text()],
	["Danger", new UIColor("Red")],
	["DangerBackground", new UIColor("Danger")],
	["Success", new UIColor("Green")],
	["SuccessBackground", new UIColor("Success")],
	["Primary", new UIColor("Background").fg("#222222", "#777777")],
	["PrimaryBackground", new UIColor("Primary")],
	["Brand", new UIColor("Blue")],
	["BrandBackground", new UIColor("Brand")],
];
