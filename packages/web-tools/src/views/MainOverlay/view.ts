import { Binding, UI } from "@talla-ui/core";
import icons from "../icons";
import type { MainOverlayView } from "./MainOverlayView";

const BadgeButton = (count: Binding<number>) =>
	UI.Button(count)
		.bg("danger")
		.fg(UI.colors.danger.text())
		.fontSize(12)
		.borderRadius(16)
		.size("auto", 20)
		.minWidth(20)
		.maxWidth(40)
		.padding(2)
		.lineHeight(1)
		.textAlign("center")
		.style({ lineBreakMode: "clip" });

const dockedStyle = {
	background: UI.colors.background,
	borderRadius: 0,
	borderWidth: 0,
	width: 324,
	padding: 2,
	css: { boxShadow: "inset 0 0 0 2px rgba(128,128,128,0.5)" },
};
const undockedStyle = {
	background: UI.colors.background.alpha(0.8),
	borderRadius: 8,
	borderColor: UI.colors.background.brighten(0.5),
	borderWidth: 2,
	width: "auto",
	padding: 0,
	css: {
		backdropFilter: "blur(15px)",
		boxShadow: "0 0 0 4px rgba(0,0,0,0.4)",
	},
};

const ToolbarRow = (v: Binding<MainOverlayView>) =>
	UI.Row()
		.padding(4)
		.gap(2)
		.with(
			UI.Button()
				.icon(icons.information)
				.onClick("ShowIndex")
				.style("icon")
				.borderRadius(4)
				.fg(v.bind("mode").equals("index").then("blue", "text"))
				.pressed(v.bind("mode").equals("index")),
			UI.Button()
				.icon(icons.treeStructure)
				.onClick("ShowInspector")
				.style("icon")
				.borderRadius(4)
				.fg(v.bind("mode").equals("inspect").then("blue", "text"))
				.pressed(v.bind("mode").equals("inspect")),
			UI.Button()
				.icon(icons.selectElement)
				.onClick("ShowPicker")
				.style("icon")
				.borderRadius(4)
				.fg(v.bind("mode").equals("picker").then("blue", "text"))
				.pressed(v.bind("mode").equals("picker")),
			UI.Spacer(4),
			BadgeButton(v.bind("log.numErrors"))
				.hideWhen(v.bind.not("log.numErrors"))
				.onClick("ShowErrors"),
			UI.Spacer(),
			UI.Button().icon(UI.icons.more, 16).style("icon").onClick("MoreMenu"),
			UI.Button()
				.icon(UI.icons.chevronDown)
				.style("icon")
				.onClick("ToggleMinimized")
				.hideWhen(v.bind("docked")),
		);

export const MainOverlayViewBody = (v: Binding<MainOverlayView>) =>
	UI.Column()
		.name("WebToolsOverlay")
		.effect("click-foreground")
		.position(v.bind("overlayPosition"))
		.style(v.bind("docked").then(dockedStyle, undockedStyle))
		.with(
			// Minimized: button
			UI.Column()
				.effect("drag-modal", true)
				.hideWhen(v.bind("mode").equals("minimized").not())
				.border(
					2,
					v.bind("log.numErrors").then("danger", "success"),
					v.bind("log.numErrors").then("dashed", "dotted"),
					8,
				)
				.centerContent()
				.with(
					UI.Button()
						.icon(icons.information)
						.style("ghost")
						.borderRadius(0)
						.padding(0)
						.size(32)
						.onClick("Unminimize"),
				),

			// Not minimized, not docked: draggable toolbar
			UI.Column(ToolbarRow(v))
				.effect("drag-modal", true)
				.hideWhen(
					Binding.any(v.bind("mode").equals("minimized"), v.bind("docked")),
				)
				.position("stretch")
				.bg("background"),

			// Not minimized, docked: plain toolbar
			UI.Column(ToolbarRow(v))
				.hideWhen(v.bind.not("docked"))
				.position("stretch"),

			// Content
			UI.Column()
				.flex()
				.style(
					Binding.any(
						v.bind("docked").then({
							minHeight: 0,
						}),
						v
							.bind("mode")
							.equals("minimized")
							.then(
								{
									width: 0,
									minHeight: 0,
									css: {
										transition: "all 0.1s ease-in-out",
									},
								},
								{
									width: 320,
									minHeight: "min(500px, calc(100vh - 160px))",
									css: {
										transition: "all 0.1s ease-in-out",
									},
								},
							),
					),
				)
				.with(
					UI.Divider(),
					UI.Show(
						Binding.all(v.bind("mode").equals("index"), "indexView").else(
							undefined,
						),
					),
					UI.Show(
						Binding.all(v.bind("mode").equals("inspect"), "inspectView").else(
							undefined,
						),
					),
					UI.Show(
						Binding.all(v.bind("mode").equals("picker"), "pickerView").else(
							undefined,
						),
					),
				),
		);
