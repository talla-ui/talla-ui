import {
	Activity,
	ActivityRouter,
	app,
	Binding,
	BindingOrValue,
	fmt,
	FormState,
	ModalMenuOptions,
	ObservableObject,
	StringConvertible,
	UI,
	UIButton,
	UIIconResource,
	UIText,
	UITextField,
	ViewBuilder,
	ViewBuilderEventHandler,
	ViewBuilderFunction,
	ViewEvent,
	Widget,
} from "talla-ui";
import { EffectsDemo } from "./effects";

// NEW Simple pattern: defer() + extend() for stateless reusable views
export function CardLayout(title: StringConvertible) {
	let titleModifier: ViewBuilderFunction<UIText.TextBuilder> | undefined;
	let content: ViewBuilder[] = [];
	return UI.Column()
		.dropShadow()
		.border(1)
		.padding(16)
		.gap()
		.maxWidth("100%")
		.borderRadius(16)
		.extend(
			{
				with(...viewBuilders: ViewBuilder[]) {
					content = viewBuilders;
					return this;
				},
				blue() {
					this.background(UI.colors.blue);
					return this;
				},
				applyTitle(f: ViewBuilderFunction<UIText.TextBuilder>) {
					titleModifier = f;
					return this;
				},
			},
			(_, base) => {
				base.with(
					UI.Text(title).style("title").apply(titleModifier),
					...content,
				);
			},
		);
}

// The widget class represents the state and event handlers
class CollapsibleWidget extends Widget {
	expanded = false;
	onToggle() {
		this.expanded = !this.expanded;
	}
}

// The view builder determines the presentation only
function CollapsibleView(
	v: Binding<CollapsibleWidget>,
	text: StringConvertible,
	width: number,
	content: ViewBuilder[],
) {
	return UI.Column()
		.width(width, undefined, "100%")
		.with(
			UI.Text(text)
				.icon(v.bind("expanded").then("chevronDown", "chevronNext"))
				.cursor("pointer")
				.background("text")
				.fg("background")
				.padding()
				.onClick("Toggle"),
			UI.ShowWhen(
				v.bind("expanded"),
				UI.Column(...content).effect("fade-bottom"),
			),
		);
}

// The builder function puts the view and widget together using Widget.builder()
function Collapsible(text: StringConvertible, ...content: ViewBuilder[]) {
	let width = 300;
	return CollapsibleWidget.builder((v) =>
		CollapsibleView(v, text, width, content),
	).extend({
		/** Expands (default) or collapses the widget */
		expand(set = true) {
			this.initializer.set("expanded", set);
			return this;
		},
		width(w: number) {
			width = w;
			return this;
		},
	});
}

// Using extend() with defer for stateless deferred views
function MyTitle(text?: StringConvertible) {
	return UI.Text(text)
		.style("title")
		.padding({ bottom: 8 })
		.allowKeyboardFocus()
		.onClick("Select")
		.handleKey("Enter", "Select")
		.handle("Select", async function (_, view) {
			view.text = "Confirming...";
			let choice = await app.showConfirmDialogAsync([
				"Are you sure you want to click this button?",
			]);
			console.log("Select", choice);
			view.text = text;
		})
		.extend({
			text(t: BindingOrValue<StringConvertible | undefined>) {
				text = t;
				return this;
			},
		});
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

type ButtonSwitchOption = {
	text?: StringConvertible;
	icon?: UIIconResource;
	value: unknown;
	disabled?: boolean;
};

const SwitchButton = () => UI.Button().style("toggleButton");

// The widget class can also be moved into the closure, at a slight perf hit
function ButtonSwitch(options: ButtonSwitchOption[]) {
	class ButtonSwitchWidget extends Widget {
		value: unknown = undefined;
		protected onSetValue(e: ViewEvent) {
			if (!e.data.value) return;
			if (this.value === e.data.value) return;
			this.value = e.data.value;
			this.emitChange("Change", { value: this.value });
		}
	}

	let Button = SwitchButton;
	return ButtonSwitchWidget.builder((v) =>
		UI.Row().with(
			...options.map((option) =>
				Button()
					.text(option.text)
					.icon(option.icon)
					.value(option.value)
					.pressed(v.bind("value").equals(option.value))
					.disabled(option.disabled ?? false)
					.onClick("SetValue")
					.onPress("SetValue"),
			),
		),
	).extend({
		value(value: BindingOrValue<unknown>) {
			this.initializer.set("value", value);
			return this;
		},
		formStateValue(formState: Binding<FormState>, formField: string) {
			this.initializer.observeFormState(formState, formField, "value");
			return this;
		},
		onChange(handle: string | ViewBuilderEventHandler<ButtonSwitchWidget>) {
			this.initializer.handle("Change", handle);
			return this;
		},
		button(fn: ViewBuilderFunction<UIButton.ButtonBuilder>) {
			Button = () => fn(Button());
			return this;
		},
	});
}

function MainView(v: Binding<MainActivity>) {
	return UI.Column()
		.align("center")
		.with(
			UI.Spacer(32),
			EffectsDemo(),
			UI.Spacer(32),
			MyTitle("Page title").width(400),
			CardLayout("Card").with(
				Collapsible(
					"Rendered",
					UI.Column()
						.divider()
						.border()
						.with(
							UI.Text(fmt("Built: {}", new Date().toLocaleString())).padding(),
							UI.Text(
								Binding.fmt("View defined: {}", v.bind("viewDefined")),
							).padding(),
							UI.Text(
								Binding.fmt("Current: {}", v.bind("currentDate")),
							).padding(),
							UI.Text(
								Binding.fmt("Count: {}", v.bind("countService.count")),
							).padding(),
						),
				)
					.expand()
					.width(400),
				UI.Row(
					UI.Button("Off").onClick((_, button) => {
						button.pressed = !button.pressed;
						button.text = button.pressed ? "On" : "Off";
					}),
					UI.Button()
						.chevron()
						.minWidth(180)
						.textAlign("start")
						.dropdownPicker(
							new ModalMenuOptions([
								{ value: 0, text: "Zero" },
								{ value: 1, text: "One" },
								{ value: 2, text: "Two" },
								{ value: 3, text: "Three", disabled: true },
								{ value: 4, text: "Four" },
							]),
						)
						.value(v.bind("countService.count")),
					UI.Spacer(),
					UI.Button()
						.icon("more")
						.style("icon")
						.dropdownMenu(
							new ModalMenuOptions([
								{ divider: true, title: "Options" },
								{ value: "one", text: "One" },
								{ value: "two", text: "Two" },
								{ value: "three", text: "Three", icon: UI.icons.check },
								{ divider: true, title: "Divider" },
								{ value: "four", text: "Four" },
								{ value: "five", text: "Five" },
								{ value: "six", text: "Six" },
								{ value: "seven", text: "Seven" },
								{ value: "eight", text: "Eight" },
								{ value: "nine", text: "Nine" },
								{ divider: true },
								{ value: "ten", text: "Ten" },
								{ value: "eleven", text: "Eleven" },
								{ value: "twelve", text: "Twelve" },
							]),
						)
						.onMenuItemSelect((event) => {
							console.log("Dropdown", event.data.value);
						}),
				),
			),

			UI.Text().fmt("Current: {:L}", v.bind("currentDate")).padding(),
			UI.Spacer(8),
			UI.Text()
				.fmt("Count: {}", v.bind("countService.count"))
				.dim(v.bind("countService.count").not()),
			UI.Spacer(8),
			UI.Row(UI.Button("Up").icon("chevronUp").onClick("Count")),
			UI.Spacer(8),
			UI.Row(
				UI.Button("Sub").navigateTo("./sub").chevron("next"),
				UI.Button("Remount").onClick("Remount").style("accent"),
				UI.Button("Change").onClick("ChangeEvent"),
			),
			UI.Spacer(32),

			UI.Row(
				UI.Button("Select (form)")
					.align("start")
					.chevron("down")
					.dropdownPicker([
						{ value: "one", text: "1" },
						{ value: "two", text: "2" },
						{ value: "three", text: "3" },
					])
					.formStateValue(v.bind("tabform"), "tab"),
				UI.Text(v.bind("tabform.values.tab").string("Selected: {}")),
				UI.Spacer(),
				UI.Button("Select")
					.align("start")
					.chevron("down")
					.dropdownPicker([
						{ value: "one", text: "1" },
						{ value: "two", text: "2" },
						{ value: "three", text: "3" },
					])
					.value(v.bind("tab"))
					.onMenuItemSelect("SelectTab"),
			),

			UI.Row(
				UI.Button("1")
					.value("one")
					.style(v.bind("tab").equals("one").then("accent"))
					.onClick("SelectTab"),
				UI.Button("2")
					.value("two")
					.style(v.bind("tab").equals("two").then("accent"))
					.onClick("SelectTab"),
				UI.Button("3")
					.value("three")
					.style(v.bind("tab").equals("three").then("accent"))
					.onClick("SelectTab"),
			),
			ButtonSwitch([
				{ text: "One", value: "one" },
				{ text: "Two", value: "two" },
				{ text: "Three", value: "three" },
			])
				.value(v.bind("tab"))
				.onChange("SelectTab"),

			UI.Column()
				.gap(8)
				.maxWidth("100%")
				.with(
					// Test: text styles
					UI.Row(
						UI.Text("Large").style("large"),
						UI.Text("Title").style("title"),
						UI.Text("Headline").style("headline"),
						UI.Text("Body").style("body"),
						UI.Text("Caption").style("caption"),
						UI.Text("Bdg").style("badge"),
						UI.Text("OK").style("successBadge"),
						UI.Text("No").style("dangerBadge"),
					),

					// Test: line height
					UI.Row(
						UI.Text("Text with icon").icon("search"),
						UI.Text("Actual text"),
						UI.Button("Text button").style("text"),
						UI.Button("Ghost button").style("ghost"),
						UI.Button("Button with icon").style("text").icon("search"),
					),
					UI.Row(
						UI.Text("Text with icon").icon(new UIIconResource("💬")),
						UI.Text("Regular text"),
					),
					UI.Row(
						UI.Text("Text with small icon").icon(new UIIconResource("💬"), 12),
						UI.Text("Text with large icon").icon(new UIIconResource("💬"), 24),
						UI.Button("Small icon button")
							.style("text")
							.icon(new UIIconResource("💬"), 12),
						UI.Button("Large icon button")
							.style("text")
							.icon(new UIIconResource("💬"), 24),
					),
					UI.Row(
						UI.Text("Text with small icon").icon("search", 12),
						UI.Text("Text with large icon").icon("search", 24),
						UI.Button("Small icon button").style("text").icon("search", 12),
						UI.Button("Large icon button").style("text").icon("search", 24),
					),

					// Test: button styles
					UI.Row(
						UI.Button("Default")
							.style("default")
							.onClick(() => {
								app.showConfirmDialogAsync([
									"Button pressed",
									"Are you sure you want to continue?",
								]);
							}),
						UI.Button("Accent").style("accent"),
						UI.Button("Success").style("success"),
						UI.Button("Danger").style("danger"),
						UI.Button("Ghost").style("ghost"),
						UI.Button("Text").style("text"),
						UI.Button("Link").style("link"),
						UI.Button("Small").style("small"),
					).wrapContent(),
					UI.Row(
						UI.Button().icon("plus").style("icon"),
						UI.Button().icon("plus").style("accentIcon"),
						UI.Button().icon("plus").style("successIcon"),
						UI.Button().icon("plus").style("dangerIcon"),
						UI.Button("Icon Top").icon("plus").style("iconTop"),
						UI.Button("Top Start").icon("plus").style("iconTopStart"),
						UI.Button("Top End").icon("plus").style("iconTopEnd"),
						UI.Button().icon("plus").minWidth(0),
						UI.Button().icon("search").minWidth(0),
						UI.Button("Both").icon("plus"),
						UI.Button("Both").icon("plus", { margin: 16 }),
					).wrapContent(),
					UI.Row(
						UI.Button().icon("plus", 12).style("icon"),
						UI.Button().icon("plus", 12).style("accentIcon"),
						UI.Button().icon("plus", 12).style("successIcon"),
						UI.Button().icon("plus", 12).style("dangerIcon"),
						UI.Button("Icon Top").icon("plus", 12).style("iconTop"),
						UI.Button("Top Start").icon("plus", 12).style("iconTopStart"),
						UI.Button("Top End").icon("plus", 12).style("iconTopEnd"),
						UI.Button().icon("plus", 12).minWidth(0),
						UI.Button().icon("search", 12).minWidth(0),
						UI.Button("Both").icon("plus", 12),
						UI.Button("Both").icon("plus", { size: 12, margin: 16 }),
					).wrapContent(),
					UI.Row()
						.padding(8)
						.background("shade")
						.wrapContent()
						.with(
							UI.Button("Default").style("default"),
							UI.Button("Accent").style("accent"),
							UI.Button("Success").style("success"),
							UI.Button("Danger").style("danger"),
							UI.Button("Ghost").style("ghost"),
							UI.Button("Text").style("text"),
							UI.Button("Link").style("link"),
							UI.Button("Small").style("small"),
						),
					UI.Row().padding(8).background("shade").with(
						UI.Text("Testing"),
						UI.TextField("Testing"),
						UI.TextField("Testing").style("ghost"), //.readOnly(),
						UI.Button("Button"),
						UI.Button().icon("search").style("icon"),
					),
				),

			// Test: table
			UI.Column(
				UI.Row(UI.Text("Numbers").align("end").width(100), UI.Text("Factors")),
				UI.List(v.bind("numbers"), (item) =>
					UI.List(item.bind("factors"), (factor) =>
						UI.Row(
							UI.Text(item.bind("id")).align("end").width(100),
							UI.Text(factor),
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

	tab: string = "one";

	tabform = new FormState((f) => f.object({ tab: f.string() }));

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

	onSelectTab(e: ViewEvent) {
		this.tab = e.data.value as string;
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
	router = this.attach(new ActivityRouter());
	matchNavigationPath(path: string) {
		if (path === "sub")
			return () =>
				this.router.replace(new SubActivity(this.countService), true);
		if (path === "other")
			return () => this.router.replace(new OtherActivity(), true);

		// no match
		this.router.clear();
	}
}

function SubView(v: Binding<SubActivity>) {
	return UI.Column()
		.align("center")
		.with(
			UI.Spacer(32),
			UI.Text().fmt("Sub activity created {}", v.bind("created")),
			UI.Text().fmt("Changes: {}", v.bind("activeCount.changes")),
			UI.Text().fmt("Count: {}", v.bind("activeCount.state.count")),
			UI.Text().fmt("Count * 2: {}", v.bind("activeCount.state.countTimesTwo")),
			UI.Text(
				Binding.fmt(
					"Count is non-zero? {}",
					v.bind("activeCount.state.countIsNonZero"),
				),
			),
			UI.Spacer(8),
			UI.Text(
				Binding.fmt(
					"Viewport: {:i}×{:i}",
					UI.viewport.width,
					UI.viewport.height,
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
			).layout(UI.viewport.cols.lt(2).then({ axis: "vertical" })),
		);
}

export class SubActivity extends Activity {
	static View = SubView;

	constructor(public readonly countService: CountService) {
		super();
	}

	created = new Date();

	activeCount = this.createActiveState(
		["countService"],
		async (): Promise<{
			service: CountService;
			changes: number;
			state: {
				count?: number;
				countTimesTwo?: number;
				countIsNonZero?: boolean;
			};
		}> => {
			console.log("countService updated");
			let changes: number = this.activeCount.changes || 0;
			return {
				service: this.countService,
				changes: changes + 1,
				state: this.createActiveState(
					["activeCount.service.count"],
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
	).watch(["countService"], (service: CountService) => {
		console.log("countService changed here too:", service);
		return { updated: true };
	});

	fooState = this.createActiveState(["foo"], () => {
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

// This pattern is more OO but less readable:
class TextFieldGroupWidget extends Widget {
	text?: string = undefined;
	error?: any;
	onInput(e: ViewEvent<UITextField>) {
		this.text = e.source.value;
	}

	static TextFieldGroup(
		text: StringConvertible,
		type: "text" | "password" = "text",
	) {
		return TextFieldGroupWidget.builder((v) =>
			UI.Column()
				.gap()
				.with(
					UI.Text(text).dim(),
					UI.TextField().trim().value(v.bind("text")).type(type),
					UI.Text.fmt("Error: {}", v.bind("error"))
						.hideWhen(v.bind("error").not())
						.fg("danger"),
				),
		).extend({
			bindFormState(
				formState: Binding<FormState | undefined>,
				formField: string,
			) {
				this.initializer.observeFormState(formState, formField, "text", (f) =>
					String(f.values[formField] ?? ""),
				);
				this.initializer.set("error", formState.bind("errors").bind(formField));
				return this;
			},
		});
	}
}
const TextFieldGroup = TextFieldGroupWidget.TextFieldGroup;

function OtherView(v: Binding<OtherActivity>) {
	return UI.Column()
		.align("center")
		.with(
			UI.Spacer(32),
			UI.Text().fmt("Other activity created {}", v.bind("created")),

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
						UI.Text("Remember"),
						UI.Spacer(),
						UI.Button()
							.style("ghost")
							.chevron("down")
							.formStateValue(v.bind("form"), "rememberMe")
							.value(false)
							.dropdownPicker(
								new ModalMenuOptions(
									[
										{ value: true, text: "Yes" },
										{ value: false, text: "No" },
									],
									140,
								),
							)
							.minWidth(0),
					),
					UI.Row(
						UI.Text("Remember"),
						UI.Spacer(),
						UI.Toggle()
							.formStateValue(v.bind("form"), "rememberMe")
							.type("switch"),
					),
					UI.Row(UI.Text(v.bind("form.errors.rememberMe")).textColor("danger")),
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
			rememberMe: f.coerce.boolean().literal(true),
		}),
	).immediateValidation();

	protected onSubmit() {
		let values = this.form.validate();
		console.log("onSubmit", values);
	}

	beforeUnlink() {
		console.log("Other activity unlinking");
	}

	protected async onShowDialog() {
		this._dialogRouter.replace(new DialogActivity(), true);
	}
	private _dialogRouter = this.attach(new ActivityRouter());
}

function DialogView() {
	return UI.Column().with(
		UI.Column()
			.gap(8)
			.padding(16)
			.with(
				UI.Text("Dialog").style("headline"),
				UI.Button()
					.icon("close")
					.position("overlay", 8, 8)
					.style("icon")
					.onClick("Close"),
				UI.Text(
					"This is a dialog. It contains a title, a body, and a row of buttons. " +
						"It can be used to display a message or to collect input from the user.",
				)
					.wrap()
					.maxWidth(340),
				UI.Spacer(),
				UI.Button("Dropdown")
					.chevron("down")
					.textAlign("start")
					.dropdownMenu(
						new ModalMenuOptions([
							{ value: "one", text: "One" },
							{ value: "two", text: "Two" },
							{ value: "three", text: "Three" },
						]),
					)
					.onMenuItemSelect("Dropdown"),
			),
		UI.Row()
			.background("shade")
			.padding(16)
			.with(
				UI.Spacer(),
				UI.Button("Cancel").onClick("Close"),
				UI.Button("Confirm").style("accent").onClick("Close"),
			),
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

	protected async onDropdown(e: ViewEvent<UIButton>) {
		let choice = e.data.value;
		app.showAlertDialogAsync(["You picked an option", String(choice)]);
	}
}
