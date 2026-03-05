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
		.dropShadow(8)
		.border(1)
		.padding(16)
		.gap(8)
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
					UI.Text(title).larger().bold().apply(titleModifier),
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
				.padding(8)
				.onClick("Toggle"),
			UI.ShowWhen(v.bind("expanded"), UI.Column(...content).effect("fade-top")),
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
		.larger()
		.bold()
		.padding({ bottom: 8 })
		.allowKeyboardFocus()
		.onClick("Select")
		.onKey("Enter", "Select")
		.on("Select", async function (_, view) {
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

const SwitchButton = () => UI.Button().buttonVariant("toggleButton");

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
		UI.Row()
			.gap(8)
			.with(
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
		onChange(handler: string | ViewBuilderEventHandler<ButtonSwitchWidget>) {
			this.initializer.on("Change", handler);
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
		.gravity("center")
		.with(
			UI.Spacer(32),
			Collapsible("Effects demo", EffectsDemo()).width(500),
			UI.Spacer(32),
			MyTitle("Page title").width(400),
			CardLayout("Card").with(
				Collapsible(
					"Rendered",
					UI.Column()
						.divider()
						.border(1)
						.with(
							UI.Text(fmt("Built: {}", new Date().toLocaleString())).padding(8),
							UI.Text(
								Binding.fmt("View defined: {}", v.bind("viewDefined")),
							).padding(8),
							UI.Text(
								Binding.fmt("Current: {}", v.bind("currentDate")),
							).padding(8),
							UI.Text(
								Binding.fmt("Count: {}", v.bind("countService.count")),
							).padding(8),
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
						.chevron("down")
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
					UI.IconButton("more")
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
				).gap(8),
			),

			UI.Text().fmt("Current: {:L}", v.bind("currentDate")).padding(8),
			UI.Spacer(8),
			UI.Text()
				.fmt("Count: {}", v.bind("countService.count"))
				.dim(v.bind("countService.count").not()),
			UI.Spacer(8),
			UI.Row(UI.Button("Up").icon("chevronUp").onClick("Count")),
			UI.Spacer(8),
			UI.Row(
				UI.Button("Sub").navigateTo("./sub").chevron("next"),
				UI.Button("Remount").onClick("Remount").accent(),
				UI.Button("Change").onClick("ChangeEvent"),
			).gap(8),
			UI.Spacer(32),

			UI.Row(
				UI.Button("Select (form)")
					.textAlign("start")
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
					.textAlign("start")
					.chevron("down")
					.dropdownPicker([
						{ value: "one", text: "1" },
						{ value: "two", text: "2" },
						{ value: "three", text: "3" },
					])
					.value(v.bind("tab"))
					.onMenuItemSelect("SelectTab"),
			).gap(8),

			UI.Row(
				UI.Button("1")
					.value("one")
					.accent(v.bind("tab").equals("one"))
					.onClick("SelectTab"),
				UI.Button("2")
					.value("two")
					.accent(v.bind("tab").equals("two"))
					.onClick("SelectTab"),
				UI.Button("3")
					.value("three")
					.accent(v.bind("tab").equals("three"))
					.onClick("SelectTab"),
			).gap(8),
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
						UI.Text("Larger").larger(),
						UI.Text("Body"),
						UI.Text("Smaller").smaller(),
						UI.Badge("Bdg"),
						UI.Badge("OK", UI.colors.success),
						UI.Badge("No", UI.colors.danger),
						UI.Badge("AI", UI.colors.purple, UI.colors.yellow).icon(
							new UIIconResource("✨"),
							12,
						),
					).gap(8),

					// Test: line height
					UI.Row(
						UI.Text("Text with icon").icon("search"),
						UI.Text("Actual text"),
						UI.Button("Bare button").bare(),
						UI.Button("Ghost button").ghost(),
						UI.Button("Button with icon").bare().icon("search"),
					).gap(8),
					UI.Row(
						UI.Text("Text with icon").icon(new UIIconResource("💬")),
						UI.Text("Regular text"),
					).gap(8),
					UI.Row(
						UI.Text("Text with small icon").icon(new UIIconResource("💬"), 12),
						UI.Text("Text with large icon").icon(new UIIconResource("💬"), 24),
						UI.Button("Small icon button")
							.icon(new UIIconResource("💬"), 12)
							.ghost(),
						UI.Button("Large icon button")
							.icon(new UIIconResource("💬"), 24)
							.ghost(),
					).gap(8),
					UI.Row(
						UI.Text("Text with small icon").icon("search", 12),
						UI.Text("Text with large icon").icon("search", 24),
						UI.Button("Small icon button").icon("search", 12).bare(),
						UI.Button("Large icon button").icon("search", 24).bare(),
					).gap(8),

					// Test: button styles
					UI.Row(
						UI.Button("Default").onClick(() => {
							app.showConfirmDialogAsync([
								"Button pressed",
								"Are you sure you want to continue?",
							]);
						}),
						UI.Button("Accent").accent(),
						UI.Button("Ghost").ghost(),
						UI.Button("Bare").bare(),
						UI.Link("Link"),
						UI.Button("Small").small(),
					)
						.gap(8)
						.wrapContent(),
					UI.Row(
						UI.IconButton("plus"),
						UI.IconButton("plus").accent(),
						UI.Button().icon("plus").minWidth(0),
						UI.Button().icon("search").minWidth(0),
						UI.Button("Both").icon("plus"),
						UI.Button("Both").icon("plus", { margin: 16 }),
					)
						.gap(8)
						.wrapContent(),
					UI.Row(
						UI.IconButton("plus", 12),
						UI.IconButton("plus", 12).accent(),
						UI.IconButton("plus", 12).ghost(),
						UI.IconButton("plus", 12).fg(UI.colors.green),
						UI.IconButton("plus", 12)
							.bg(UI.colors.danger)
							.fg(UI.colors.danger.text()),
						UI.Button().icon("plus", 12).minWidth(0),
						UI.Button().icon("search", 12).minWidth(0),
						UI.Button("Both").icon("plus", 12),
						UI.Button("Both").icon("plus", { size: 12, margin: 16 }),
					)
						.gap(8)
						.wrapContent(),
					UI.Row(
						UI.Text("Default").icon("plus"),
						UI.Text("Start").icon("plus", { position: "start" }),
						UI.Text("End").icon("plus", { position: "end" }),
						UI.Text("Top").icon("plus", { position: "top" }).center(),
						UI.Text("Bottom").icon("plus", { position: "bottom" }).center(),
						UI.Text("Top start")
							.icon("plus", { position: "top" })
							.textAlign("start"),
						UI.Text("Top end")
							.icon("plus", { position: "top" })
							.textAlign("end"),
					)
						.gap(8)
						.wrapContent(),
					UI.Row(
						UI.Button("Default").icon("plus"),
						UI.Button("Start").icon("plus", { position: "start" }),
						UI.Button("End").icon("plus", { position: "end" }),
						UI.Button("Chevron+End")
							.icon("plus", { position: "end" })
							.chevron("down"),
						UI.Button("Top").icon("plus", { position: "top" }),
						UI.Button("Bottom").icon("plus", { position: "bottom" }),
						UI.Button("Top start")
							.icon("plus", { position: "top" })
							.textAlign("start"),
						UI.Button("Top end")
							.icon("plus", { position: "top" })
							.textAlign("end"),
						UI.Button("Chev+TopEnd")
							.icon("plus", { position: "top" })
							.chevron("down")
							.textAlign("end"),
					)
						.gap(8)
						.wrapContent(),
					UI.Row()
						.gap(8)
						.padding(8)
						.background("shade")
						.wrapContent()
						.with(
							UI.Button("Default"),
							UI.Button("Accent").accent(),
							UI.Button("Success").style({ textColor: UI.colors.green }),
							UI.Button("Danger").style({ textColor: UI.colors.danger }),
							UI.Button("Ghost").ghost(),
							UI.Button("Bare").bare(),
							UI.Button("Link").link(),
							UI.Button("Small").small(),
							UI.Button("Accent small").small().accent(),
							UI.Button("Ghost small").small().ghost(),
							UI.Button("Link small").small().link(),
						),
					UI.Row()
						.gap(8)
						.padding(8)
						.background("shade")
						.with(
							UI.Text("Testing"),
							UI.TextField("Testing"),
							UI.TextField("Testing").ghost(),
							UI.Button("Button"),
							UI.IconButton("search"),
						),
				),

			// Test: table
			UI.Column(
				UI.Row(
					UI.Text("Numbers").textAlign("end").width(100),
					UI.Text("Factors"),
				).gap(8),
				UI.List(v.bind("numbers"), (item) =>
					UI.List(item.bind("factors"), (factor) =>
						UI.Row(
							UI.Text(item.bind("id")).textAlign("end").width(100),
							UI.Text(factor),
						).gap(8),
					).outer(UI.Column().border({ top: 1 })),
				),
			),
		);
}

export class MainActivity extends Activity {
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
		.gravity("center")
		.with(
			UI.Spacer(32),
			UI.Text().fmt("Sub activity created {}", v.bind("created")),
			UI.Text().fmt("Changes: {}", v.bind("changes")),
			UI.Text().fmt("Count: {}", v.bind("count")),
			UI.Text().fmt("Count * 2: {}", v.bind("countTimesTwo")),
			UI.Text(Binding.fmt("Count is non-zero? {}", v.bind("countIsNonZero"))),
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
				UI.TextField().value(v.bind("count")).onInput("SetCount").trim(),
				UI.Button("Reset").onClick("ResetCount"),
			)
				.gap(8)
				.padding(8),
			UI.Row(
				UI.Button("Back").icon("chevronBack").onClick("NavigateBack"),
				UI.Row(
					UI.Button("Other")
						.navigateTo("/other")
						.icon("chevronNext", { position: "end" }),
				),
			)
				.gap(8)
				.layout(UI.viewport.cols.lt(2).then({ axis: "vertical" })),
		);
}

export class SubActivity extends Activity {
	static View = SubView;

	constructor(public readonly countService: CountService) {
		super();
		// Observe countService changes asynchronously, incrementing changes counter
		this.observeAsync("countService", (service) => {
			console.log("countService updated; count=", service.count);
			this.changes++;
		});
		// Observe count directly and update derived state
		this.observeAsync(
			[new Binding<number>("countService.count"), "countService"],
			(count, service) => {
				console.log("count updated:", count, countService.count);
				this.count = count;
				this.countTimesTwo = count * 2;
				this.countIsNonZero = count !== 0;
			},
		);
	}

	created = new Date();
	changes = 0;
	count = 0;
	countTimesTwo = 0;
	countIsNonZero = false;

	protected onSetCount(e: ViewEvent<UITextField>) {
		console.log("onSetCount", e.source.value);
		this.countService.count = +e.source.value! || 0;
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
				.gap(8)
				.with(
					UI.Text(text).dim(),
					UI.TextField()
						.trim()
						.value(v.bind("text"))
						.type(type)
						.invalid(v.bind("error")),
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
		.gravity("center")
		.with(
			UI.Spacer(32),
			UI.Text().fmt("Other activity created {}", v.bind("created")),

			UI.Divider(),
			UI.Column()
				.gap(8)
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
							.ghost()
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
			rememberMe: f.literal(true),
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
				UI.Text("Dialog").style({ bold: true }),
				UI.IconButton("close", 16)
					.position("overlay", 8, 8)
					.bare()
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
			.gap(8)
			.background("shade")
			.padding(16)
			.with(
				UI.Spacer(),
				UI.Button("Cancel").onClick("Close"),
				UI.Button("Confirm").accent().onClick("Close"),
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
