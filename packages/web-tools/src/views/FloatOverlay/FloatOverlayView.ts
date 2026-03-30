import { Binding, UI, UIColumn, Widget } from "@talla-ui/core";
import { InspectPanelView } from "../InspectPanel/InspectPanelView";
import icons from "../icons";

const BodyView = (title: string, inspectView: InspectPanelView) =>
	UI.Column()
		.name("WebToolsFloat")
		.background(UI.colors.background.alpha(0.8))
		.effect("click-foreground")
		.position({ gravity: "overlay", top: 32 })
		.width(320)
		.maxWidth("90vw")
		.height(300)
		.border(2, UI.colors.background.brighten(0.5), "solid", 8)
		.style({
			css: {
				backdropFilter: "blur(15px)",
				boxShadow: "0 0 0 4px rgba(0,0,0,0.4)",
			},
		})
		.with(
			UI.Row(
				UI.Text(title).bold(),
				UI.Spacer(),
				UI.IconButton(icons.copy).bare().onClick("Clone"),
				UI.IconButton(UI.icons.close, 16).bare().onClick("Close"),
			)
				.background("background")
				.effect("drag-modal", true)
				.gap(4)
				.padding({ start: 8, end: 4, top: 1, bottom: 4 }),
			UI.Divider(),
			UI.Column(UI.Show(Binding.from(inspectView)))
				.scroll()
				.grow(),
		);

export class FloatOverlayView extends Widget {
	title: string;
	inspectView = this.attach(new InspectPanelView(), { delegate: this });

	constructor(object?: unknown, title = "Inspect") {
		super();
		this.title = title;
		this.inspectView.setObject(object);
	}

	protected override get body() {
		return BodyView(this.title, this.inspectView).build();
	}

	protected override beforeRender(col: UIColumn) {
		let randX = Math.floor((Math.random() * window.innerWidth) / 3 + 64);
		let randY = Math.floor(Math.random() * 40);
		col.position = {
			...col.position,
			left: randX,
			top: window.innerHeight / 3 + randY,
		};
	}

	protected onClone() {
		this.emit("ShowFloat", { object: this.inspectView.object });
	}

	protected onClose() {
		this.unlink();
	}
}
