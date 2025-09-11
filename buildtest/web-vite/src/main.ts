import {
	Activity,
	app,
	bind,
	Binding,
	BindingOrValue,
	ComponentView,
	ComponentViewBuilder,
	DeferredViewBuilder,
	fmt,
	FormState,
	ModalMenuOptions,
	ObservableObject,
	StringConvertible,
	UI,
	UIButton,
	UITextField,
	ViewBuilder,
	ViewEvent,
} from "talla-ui";

export function CardLayout(title: StringConvertible) {
	let content: ViewBuilder[] = [];
	return {
		...new DeferredViewBuilder(() =>
			// This runs only once, before the first view is created
			UI.Column()
				.dropShadow()
				.border(1)
				.borderRadius(16)
				.padding(16)
				.gap()
				.with(UI.Label(title).labelStyle("title"), ...content),
		),
		with(...cardContent: ViewBuilder[]) {
			content = cardContent;
			return this;
		},
	};
}

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
		...ComponentViewBuilder(CollapsibleView, (v) =>
			UI.Column()
				.width(v.bind("width"))
				.with(
					UI.Label(label)
						.icon(v.bind("expanded").then("chevronDown", "chevronNext"))
						.cursor("pointer")
						.background("text")
						.fg("background")
						.padding()
						.onClick("Toggle"),
					UI.ShowWhen(v.bind("expanded"), UI.Column(...content)),
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
				.onClick("Select")
				.handleKey("Enter", "Select")
				.handle("Select", async function (_, label) {
					label.text = "Confirming...";
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

function MainView(v: Binding<MainActivity>) {
	return UI.Column()
		.align("center")
		.with(
			UI.Spacer(32),
			MyTitle("Title").width(400),
			CardLayout("Card").with(
				Collapsible(
					"Rendered",
					UI.Column()
						.divider()
						.border()
						.with(
							UI.Label(fmt("Built: {}", new Date().toLocaleString())).padding(),
							UI.Label(
								bind.fmt("View defined: {}", v.bind("viewDefined")),
							).padding(),
							UI.Label(
								bind.fmt("Current: {}", v.bind("currentDate")),
							).padding(),
							UI.Label(
								bind.fmt("Count: {}", v.bind("countService.count")),
							).padding(),
						),
				)
					.expand()
					.width(400),
				UI.Row(
					UI.Button("Off")
						.onClick((_, button) => {
							button.pressed = !button.pressed;
							button.text = button.pressed ? "On" : "Off";
						})
						.buttonStyle(
							UI.styles.button.default.extend().setPressed({
								background: UI.colors.success,
								textColor: UI.colors.background,
							}),
						),
					UI.Button()
						.chevron()
						.minWidth(200)
						.textAlign("start")
						.dropdownPicker(
							new ModalMenuOptions([
								{ value: 0, text: "Zero" },
								{ value: 1, text: "One" },
								{ value: 2, text: "Two" },
							]),
						)
						.value(v.bind("countService.count")),
					UI.Spacer(),
					UI.Button()
						.icon("more")
						.buttonStyle("icon")
						.dropdownMenu(
							new ModalMenuOptions([
								{ value: "one", text: "One" },
								{ value: "two", text: "Two" },
								{ value: "three", text: "Three" },
							]),
						)
						.onMenuItemSelect((event) => {
							console.log("Dropdown", event.data.value);
						}),
				),
			),

			UI.Label(bind.fmt("Current: {:L}", v.bind("currentDate"))).padding(),
			UI.Spacer(8),
			UI.Label(bind.fmt("Count: {}", v.bind("countService.count"))).dim(
				v.bind("countService.count").not(),
			),
			UI.Spacer(8),
			UI.Row(UI.Button("Up").icon("chevronUp").onClick("Count")),
			UI.Spacer(8),
			UI.Row(
				UI.Button("Sub")
					.navigateTo("./sub")
					.icon("chevronNext")
					.buttonStyle("iconTopEnd"),
				UI.Button("Remount").onClick("Remount").buttonStyle("primary"),
				UI.Button("Change").onClick("ChangeEvent"),
			),
			UI.Spacer(32),

			// Test: table
			UI.Column(
				UI.Row(
					UI.Label("Numbers").align("end").width(100),
					UI.Label("Factors"),
				),
				UI.List(v.bind("numbers"), (item) =>
					UI.List(item.bind("factors"), (factor) =>
						UI.Row(
							UI.Label(item.bind("id")).align("end").width(100),
							UI.Label(factor),
						),
					).outer(UI.Column().border({ top: 1 })),
				),
			),
		);
}

export class MainActivity extends Activity {
	static {
		import.meta.hot?.accept(); // for Vite
		app.hotReload(import.meta, this);
	}

	static View = MainView;
	viewDefined = new Date();

	navigationPath = "";

	numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => ({
		id: i,
		factors: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((f) => i % f === 0),
	}));

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

function SubView(v: Binding<SubActivity>) {
	return UI.Column()
		.align("center")
		.with(
			UI.Spacer(32),
			UI.Label(bind.fmt("Sub activity created {}", v.bind("created"))),
			UI.Label(bind.fmt("Changes: {}", v.bind("activeCount.changes"))),
			UI.Label(bind.fmt("Count: {}", v.bind("activeCount.state.count"))),
			UI.Label(
				bind.fmt("Count * 2: {}", v.bind("activeCount.state.countTimesTwo")),
			),
			UI.Label(
				bind.fmt(
					"Count is non-zero? {}",
					v.bind("activeCount.state.countIsNonZero"),
				),
			),
			UI.Spacer(8),
			UI.Label(
				bind.fmt(
					"Viewport: {:i}×{:i}",
					UI.viewport.bind("width"),
					UI.viewport.bind("height"),
				),
			),
			UI.Spacer(8),
			UI.Row(
				UI.TextField()
					.value(v.bind("activeCount.state.count"))
					.onInput("SetCount")
					.trim(),
				UI.Button("Reset").onClick("ResetCount"),
			).padding(8),
			UI.Row(
				UI.Button("Back").icon("chevronBack").onClick("NavigateBack"),
				UI.Row(UI.Button("Other").navigateTo("/other").icon("chevronNext")),
			).layout(UI.viewport.bind("cols").lt(2).then({ axis: "vertical" })),
		);
}

export class SubActivity extends Activity {
	static View = SubView;

	constructor(public readonly countService: CountService) {
		super();
	}

	created = new Date();

	activeCount = this.createActiveState(
		[bind.from(this, "countService")],
		async (): Promise<{
			service: CountService;
			changes: number;
			state: {
				count?: number;
				countTimesTwo?: number;
				countIsNonZero?: boolean;
			};
		}> => {
			let changes: number = this.activeCount.changes || 0;
			return {
				service: this.countService,
				changes: changes + 1,
				state: this.createActiveState(
					[
						bind
							.from<SubActivity, "activeCount">(this, "activeCount")
							.bind("service.count"),
					],
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

function TextFieldGroup(
	label: StringConvertible,
	type: "text" | "password" = "text",
) {
	class TextFieldGroupView extends ComponentView {
		text?: string = undefined;
		error?: any;
		onInput(e: ViewEvent<UITextField>) {
			this.text = e.source.value;
		}
		bindForm(
			formState: BindingOrValue<FormState | undefined>,
			formField: string,
		) {
			let current: FormState | undefined;
			this.observeFormState(formState, formField, "text", (form) => {
				current = form;
				return form.values[formField] ?? "";
			});
			this.listen((e) => {
				if (e.name === "Change" && current) {
					current.validateField(formField);
					current.emitChange();
				}
			});
		}
	}

	return {
		...ComponentViewBuilder(TextFieldGroupView, (v) =>
			UI.Column()
				.gap()
				.with(
					UI.Label(label).labelStyle("secondary"),
					UI.TextField().value(v.bind("text")).type(type),
					UI.Label(v.bind("error"))
						.hideWhen(v.bind("error").not())
						.fg("danger"),
				),
		),
		bindFormState(formState: Binding<FormState>, formField: string) {
			this.initializer.finalize((view) => {
				view.bindForm(formState, formField);
			});
			this.initializer.set("error", formState.bind("errors").bind(formField));
			return this;
		},
	};
}

function OtherView(v: Binding<OtherActivity>) {
	return UI.Column()
		.align("center")
		.with(
			UI.Spacer(32),
			UI.Label(bind.fmt("Other activity created {}", v.bind("created"))),

			UI.Divider(),
			UI.Column()
				.gap()
				.with(
					TextFieldGroup("User name").bindFormState(v.bind("form"), "userName"),
					TextFieldGroup("Password", "password").bindFormState(
						v.bind("form"),
						"password",
					),
					UI.Row(
						UI.Label("Remember"),
						UI.Spacer(),
						UI.Button()
							.chevron("down")
							.formStateValue(v.bind("form"), "rememberMe")
							.value(false)
							.dropdownPicker(
								new ModalMenuOptions([
									{ value: true, text: "Yes" },
									{ value: false, text: "No" },
								]),
							),
					),
					UI.Row(
						UI.Label("Remember"),
						UI.Spacer(),
						UI.Toggle()
							.formStateValue(v.bind("form"), "rememberMe")
							.type("switch"),
					),
					UI.Button("Submit").onClick("Submit"),
				),

			UI.Spacer(8),
			UI.Row(UI.Button("Back").icon("chevronBack").onClick("NavigateBack")),
			UI.Row(UI.Button("Dialog").onClick("ShowDialog")),
		);
}

export class OtherActivity extends Activity {
	static View = OtherView;

	created = new Date();

	form = new FormState((f) =>
		f.object({
			userName: f.string().required("User name is required"),
			password: f.string().required("Password is required"),
			rememberMe: f.boolean(),
		}),
	);

	protected onSubmit() {
		let values = this.form.validate();
		console.log("onSubmit", values);
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
			UI.Button("Dropdown").chevron("down").onClick("Drop"),
			UI.Row(UI.Button("Close").icon("close").onClick("Close")),
		);
}

export class DialogActivity extends Activity {
	static View = DialogView;

	constructor() {
		super();
		this.setRenderMode("dialog");
	}

	protected onClose() {
		this.unlink();
	}

	protected async onDrop(e: ViewEvent<UIButton>) {
		let choice = await app.showModalMenuAsync((menu) => {
			menu.items = [
				{ value: "one", text: "One" },
				{ value: "two", text: "Two" },
				{ value: "disabled", text: "Disabled", disabled: true },
				{ value: "three", text: "Three", hint: "⌘+T" },
				{ divider: true },
				{ value: "more", text: "More..." },
			];
		}, e.source);
		app.showAlertDialogAsync(["You picked an option", String(choice)]);
	}
}
