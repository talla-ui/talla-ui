import {
	Activity,
	app,
	bind,
	BindingOrValue,
	ComponentView,
	ComponentViewBuilder,
	DeferredViewBuilder,
	fmt,
	ObservableObject,
	StringConvertible,
	UI,
	UIButton,
	UITextField,
	ViewBuilder,
	ViewEvent,
} from "talla-ui";

function Collapsible(label: StringConvertible, ...content: ViewBuilder[]) {
	class CollapsibleView extends ComponentView {
		width = width;
		expanded = false;
		onToggle() {
			this.expanded = !this.expanded;
		}
	}

	let width = 300;
	return {
		...ComponentViewBuilder(CollapsibleView, () =>
			UI.Column()
				.width(bind("width"))
				.with(
					UI.Label(label)
						.icon(bind("expanded").then("chevronDown", "chevronNext"))
						.cursor("pointer")
						.background("text")
						.fg("background")
						.padding()
						.intercept("Click", "Toggle"),
					UI.ShowWhen(bind("expanded"), UI.Column(...content)),
				),
		),
		/** Set the expanded state of the view */
		expand(expanded = true) {
			this.initializer.set("expanded", expanded);
			return this;
		},
		width(w: number) {
			width = w;
			return this;
		},
	};
}

function MyTitle(label?: StringConvertible) {
	let width: BindingOrValue<number | undefined>;
	return {
		...DeferredViewBuilder(() =>
			UI.Label(label)
				.labelStyle("title")
				.padding({ bottom: 8 })
				.width(width)
				.allowKeyboardFocus()
				.intercept("Click", "Select")
				.intercept("EnterKeyPress", "Select")
				.intercept("Select", async function () {
					this.text = "Confirming...";
					let choice = await app.showConfirmDialogAsync([
						"Are you sure you want to click this button?",
					]);
					console.log("Select", choice);
				}),
		),
		label(l: BindingOrValue<StringConvertible | undefined>) {
			label = l;
			return this;
		},
		width(w: BindingOrValue<number | undefined>) {
			width = w;
			return this;
		},
	};
}

class CountService extends ObservableObject {
	count = 0;

	constructor() {
		super();
		this.observe("count", (count) => {
			console.log("Count updated in service:", count);
		});
	}

	increment() {
		this.count++;
		if (this.count > 10) this.count = 0;
	}
}

function MainView() {
	return UI.Column()
		.align("center")
		.with(
			UI.Spacer(32),
			MyTitle("Title").width(400),
			Collapsible(
				"Rendered",
				UI.Column()
					.divider()
					.border()
					.with(
						UI.Label(fmt("Built: {}", new Date().toLocaleString())).padding(),
						UI.Label(
							bind.fmt("View defined: {}", bind("viewDefined")),
						).padding(),
						UI.Label(bind.fmt("Current: {}", bind("currentDate"))).padding(),
						UI.Label(
							bind.fmt("Count: {}", bind("countService.count")),
						).padding(),
					),
			)
				.expand()
				.width(400),

			UI.Label(bind.fmt("Current: {:L}", bind("currentDate"))).padding(),
			UI.Spacer(8),
			UI.Label(bind.fmt("Count: {}", bind("countService.count"))).dim(
				bind.not("countService.count"),
			),
			UI.Spacer(8),
			UI.Row(UI.Button("Up").icon("chevronUp").emit("Count")),
			UI.Spacer(8),
			UI.Row(
				UI.Button("Sub")
					.navigateTo("./sub")
					.icon("chevronNext")
					.buttonStyle("iconTopEnd"),
				UI.Button("Remount").emit("Remount").buttonStyle("primary"),
				UI.Button("Change").emit("ChangeEvent"),
			),
		);
}

export class MainActivity extends Activity {
	static {
		import.meta.hot?.accept(); // for Vite
		app.hotReload(import.meta, this);
	}

	navigationPath = "";
	viewDefined = new Date();

	get currentDate() {
		return new Date();
	}

	constructor() {
		super();
		app.addActivity(new RouterActivity(this.countService));
	}

	onRemount() {
		app.remount();
	}

	onChangeEvent() {
		this.emitChange();
	}

	countService = new CountService();

	protected override viewBuilder() {
		this.viewDefined = new Date();
		return MainView();
	}

	protected onCount() {
		this.countService.increment();
	}
}

export class RouterActivity extends Activity {
	constructor(public readonly countService: CountService) {
		super();
	}
	navigationPath = "";
	matchNavigationPath(remainder: string): void | boolean | Activity {
		if (remainder === "sub") return new SubActivity(this.countService);
		if (remainder === "other") return new OtherActivity();
	}
}

function SubView() {
	return UI.Column()
		.align("center")
		.with(
			UI.Spacer(32),
			UI.Label(bind.fmt("Sub activity created {}", bind("created"))),
			UI.Label(bind.fmt("Changes: {}", bind("activeCount.changes"))),
			UI.Label(bind.fmt("Count: {}", bind("activeCount.state.count"))),
			UI.Label(
				bind.fmt("Count * 2: {}", bind("activeCount.state.countTimesTwo")),
			),
			UI.Label(
				bind.fmt(
					"Count is non-zero? {}",
					bind("activeCount.state.countIsNonZero"),
				),
			),
			UI.Spacer(8),
			UI.Label(
				bind.fmt(
					"Viewport: {:i}×{:i}",
					bind("viewport.width"),
					bind("viewport.height"),
				),
			),
			UI.Spacer(8),
			UI.Row(
				UI.TextField()
					.value(bind("activeCount.state.count"))
					.emit("SetCount")
					.trim(),
				UI.Button("Reset").emit("ResetCount"),
			).padding(8),
			UI.Row(
				UI.Button("Back").icon("chevronBack").emit("NavigateBack"),
				UI.Row(UI.Button("Other").navigateTo("/other").icon("chevronNext")),
			).layout(bind("viewport.cols").lt(2).then({ axis: "vertical" })),
		);
}

export class SubActivity extends Activity {
	constructor(public readonly countService: CountService) {
		super();
	}

	created = new Date();

	activeCount = this.createActiveState(
		[this.bind("countService")],
		async () => {
			let changes: number = this.activeCount.changes || 0;
			return {
				service: this.countService,
				changes: changes + 1,
				state: this.createActiveState(
					[this.bind("activeCount.service.count")],
					(count) => {
						console.log("activeCount.state updated", count);
						return {
							count: count,
							countTimesTwo: count * 2,
							countIsNonZero: count !== 0,
						};
					},
				),
			};
		},
	);

	fooState = this.createActiveState([bind("foo")], () => {
		return { foo: this.foo };
	});
	foo = "bar";

	protected override viewBuilder() {
		console.log("SubActivity viewBuilder", this.activeCount);
		return SubView();
	}

	protected onSetCount(e: ViewEvent<UITextField>) {
		console.log("onSetCount", e.source.value);
		this.countService.count = +e.source.value! || 0;
		// this.countService.emitChange();
	}

	onResetCount() {
		this.countService.count = 0;
		this.countService.emitChange();
	}

	beforeUnlink() {
		console.log("Sub activity unlinking");
	}
}

function OtherView() {
	return UI.Column()
		.align("center")
		.with(
			UI.Spacer(32),
			UI.Label(bind.fmt("Other activity created {}", bind("created"))),
			UI.Spacer(8),
			UI.Row(UI.Button("Back").icon("chevronBack").emit("NavigateBack")),
			UI.Row(UI.Button("Dialog").emit("ShowDialog")),
		);
}

export class OtherActivity extends Activity {
	created = new Date();

	protected override viewBuilder() {
		return OtherView();
	}

	beforeUnlink() {
		console.log("Other activity unlinking");
	}

	protected async onShowDialog() {
		let d = await this.attachActivityAsync(new DialogActivity());
	}
}

function DialogView() {
	return UI.Column()
		.align("center")
		.gap(8)
		.padding(16)
		.with(
			UI.Spacer(32),
			UI.Label("Dialog"),
			UI.Button("Dropdown").chevron("down").emit("Drop"),
			UI.Row(UI.Button("Close").icon("close").emit("Close")),
		);
}

export class DialogActivity extends Activity {
	protected override viewBuilder() {
		this.setRenderMode("dialog");
		return DialogView();
	}

	protected onClose() {
		this.unlink();
	}

	protected async onDrop(e: ViewEvent<UIButton>) {
		let choice = await app.showModalMenuAsync((menu) => {
			menu.items = [
				{ key: "one", text: "One" },
				{ key: "two", text: "Two" },
				{ key: "disabled", text: "Disabled", disabled: true },
				{ key: "three", text: "Three", hint: "⌘+T" },
				{ divider: true },
				{ key: "more", text: "More..." },
			];
		}, e.source);
		app.showAlertDialogAsync(["You picked an option", String(choice)]);
	}
}
