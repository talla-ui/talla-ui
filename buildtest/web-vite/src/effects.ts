// ============================================================================
// Effects Demo Section - Updated for dash-separated naming
// ============================================================================

import {
	app,
	Binding,
	ModalMenuOptions,
	ObservableList,
	ObservableObject,
	RenderEffect,
	UI,
	UIButton,
	ViewEvent,
	Widget,
} from "talla-ui";

// Symmetric effects: enter from edge, exit to same edge
const SYMMETRIC_EFFECTS: RenderEffect.EffectName[] = [
	"fade",
	"fade-top",
	"fade-bottom",
	"fade-start",
	"fade-end",
	"scale",
	"pop",
];

// New effects: slide and blur
const NEW_EFFECTS: RenderEffect.EffectName[] = [
	"slide-top",
	"slide-bottom",
	"slide-start",
	"slide-end",
	"blur",
];

// Slow variants
const SLOW_EFFECTS: RenderEffect.EffectName[] = [
	"fade-slow",
	"fade-top-slow",
	"scale-slow",
	"pop-slow",
	"blur-slow",
];

// Asymmetric combinations: different enter/exit animations
const ASYMMETRIC_COMBOS: {
	label: string;
	enter: RenderEffect.EffectName;
	exit: RenderEffect.EffectName;
}[] = [
	{ label: "Slide through ->", enter: "fade-start-in", exit: "fade-end-out" },
	{ label: "Slide through <-", enter: "fade-end-in", exit: "fade-start-out" },
	{ label: "Top then bottom", enter: "fade-top-in", exit: "fade-bottom-out" },
	{ label: "Bottom then top", enter: "fade-bottom-in", exit: "fade-top-out" },
	{ label: "Pop in, fade out", enter: "pop-in", exit: "fade-out" },
	{ label: "Fade in, scale out", enter: "fade-in", exit: "scale-out" },
	{ label: "Blur in, fade out", enter: "blur-in", exit: "fade-out" },
	{ label: "Slide top, fade out", enter: "slide-top-in", exit: "fade-out" },
];

// Observable item for container effects (preserves DOM elements during updates)
class ListItem extends ObservableObject {
	constructor(public label: string) {
		super();
	}
}

class EffectsDemoWidget extends Widget {
	// State for symmetric effects
	symmetricVisible: Record<string, boolean> = {};

	// State for new effects
	newVisible: Record<string, boolean> = {};

	// State for slow effects
	slowVisible: Record<string, boolean> = {};

	// State for asymmetric effects
	asymmetricVisible: Record<string, boolean> = {};

	// State for container effects
	staggerItems = new ObservableList<ListItem>();
	staggerSlowItems = new ObservableList<ListItem>();
	flipItems = new ObservableList(
		new ListItem("A"),
		new ListItem("B"),
		new ListItem("C"),
		new ListItem("D"),
	);

	onToggleSymmetric(e: ViewEvent) {
		const name = e.data.value as string;
		this.symmetricVisible = {
			...this.symmetricVisible,
			[name]: !this.symmetricVisible[name],
		};
	}

	onToggleNew(e: ViewEvent) {
		const name = e.data.value as string;
		this.newVisible = {
			...this.newVisible,
			[name]: !this.newVisible[name],
		};
	}

	onToggleSlow(e: ViewEvent) {
		const name = e.data.value as string;
		this.slowVisible = {
			...this.slowVisible,
			[name]: !this.slowVisible[name],
		};
	}

	onToggleAsymmetric(e: ViewEvent) {
		const name = e.data.value as string;
		this.asymmetricVisible = {
			...this.asymmetricVisible,
			[name]: !this.asymmetricVisible[name],
		};
	}

	onAddStaggerItem() {
		this.staggerItems.add(new ListItem(`Item ${this.staggerItems.length + 1}`));
	}

	onAdd5StaggerItems() {
		const start = this.staggerItems.length + 1;
		for (let i = 0; i < 5; i++) {
			this.staggerItems.add(new ListItem(`Item ${start + i}`));
		}
	}

	onClearStaggerItems() {
		this.staggerItems.clear();
	}

	onAddStaggerSlowItem() {
		this.staggerSlowItems.add(
			new ListItem(`Item ${this.staggerSlowItems.length + 1}`),
		);
	}

	onAdd5StaggerSlowItems() {
		const start = this.staggerSlowItems.length + 1;
		for (let i = 0; i < 5; i++) {
			this.staggerSlowItems.add(new ListItem(`Item ${start + i}`));
		}
	}

	onClearStaggerSlowItems() {
		this.staggerSlowItems.clear();
	}

	onShuffleFlipItems() {
		// Fisher-Yates shuffle - get items as array, shuffle, then replaceAll
		const arr = [...this.flipItems];
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j]!, arr[i]!];
		}
		this.flipItems.replaceAll(arr);
	}

	onReverseFlipItems() {
		const arr = [...this.flipItems].reverse();
		this.flipItems.replaceAll(arr);
	}

	async onShowDialog(e: ViewEvent) {
		const effect = e.data.value as RenderEffect.EffectName;
		const { Dialog } = (await import("@talla-ui/web-handler")) as any;
		const original = Dialog.dialogEffect;
		Dialog.dialogEffect = effect;
		await app.showAlertDialogAsync([
			`Dialog with "${effect}" effect`,
			"This dialog uses the " + effect + " animation.",
		]);
		Dialog.dialogEffect = original;
	}

	async onShowMenu(e: ViewEvent<UIButton>) {
		const effect = e.data.value as RenderEffect.EffectName;
		const { ModalMenu } = (await import("@talla-ui/web-handler")) as any;
		const original = ModalMenu.menuEffect;
		ModalMenu.menuEffect = effect;
		await app.showModalMenuAsync(
			new ModalMenuOptions([
				{ divider: true, title: `Menu: ${effect}` },
				{ value: "one", text: "Option One" },
				{ value: "two", text: "Option Two" },
				{ value: "three", text: "Option Three" },
			]),
			e.source,
		);
		ModalMenu.menuEffect = original;
	}
}

function EffectsDemoView(v: Binding<EffectsDemoWidget>) {
	return UI.Column()
		.gap(16)
		.padding(16)
		.border(1)
		.borderRadius(12)
		.maxWidth(900)
		.with(
			UI.Text("Animation Effects Demo").style({ bold: true }),

			// =====================================================================
			// Symmetric effects section
			// =====================================================================
			UI.Text("Symmetric effects (reversed on exit):").dim(),
			UI.Row()
				.wrapContent()
				.gap(8)
				.with(
					...SYMMETRIC_EFFECTS.map((name) =>
						UI.Button(name)
							.value(name)
							.accent(v.bind("symmetricVisible").bind(name))
							.onClick("ToggleSymmetric"),
					),
				),

			// Symmetric effect preview boxes
			UI.Row()
				.wrapContent()
				.gap(8)
				.minHeight(60)
				.with(
					...SYMMETRIC_EFFECTS.map((name) =>
						UI.ShowWhen(
							v.bind("symmetricVisible").bind(name),
							UI.Column()
								.padding(16)
								.borderRadius(8)
								.background("accent")
								.fg("background")
								.with(UI.Text(name))
								.effect(name),
						),
					),
				),

			UI.Divider(),

			// =====================================================================
			// New effects section (slide, blur)
			// =====================================================================
			UI.Text("New effects (slide, blur):").dim(),
			UI.Row()
				.wrapContent()
				.gap(8)
				.with(
					...NEW_EFFECTS.map((name) =>
						UI.Button(name)
							.value(name)
							.accent(v.bind("newVisible").bind(name))
							.onClick("ToggleNew"),
					),
				),

			// New effect preview boxes
			UI.Row()
				.wrapContent()
				.gap(8)
				.minHeight(60)
				.with(
					...NEW_EFFECTS.map((name) =>
						UI.ShowWhen(
							v.bind("newVisible").bind(name),
							UI.Column()
								.padding(16)
								.borderRadius(8)
								.background("danger")
								.fg("background")
								.with(UI.Text(name))
								.effect(name),
						),
					),
				),

			UI.Divider(),

			// =====================================================================
			// Slow variants section
			// =====================================================================
			UI.Text("Slow variants (2x duration):").dim(),
			UI.Row()
				.wrapContent()
				.gap(8)
				.with(
					...SLOW_EFFECTS.map((name) =>
						UI.Button(name)
							.value(name)
							.accent(v.bind("slowVisible").bind(name))
							.onClick("ToggleSlow"),
					),
				),

			// Slow effect preview boxes
			UI.Row()
				.wrapContent()
				.gap(8)
				.minHeight(60)
				.with(
					...SLOW_EFFECTS.map((name) =>
						UI.ShowWhen(
							v.bind("slowVisible").bind(name),
							UI.Column()
								.padding(16)
								.borderRadius(8)
								.background("text")
								.fg("background")
								.with(UI.Text(name))
								.effect(name),
						),
					),
				),

			UI.Divider(),

			// =====================================================================
			// Asymmetric effects section
			// =====================================================================
			UI.Text("Asymmetric effects (different enter/exit):").dim(),
			UI.Row()
				.wrapContent()
				.gap(8)
				.with(
					...ASYMMETRIC_COMBOS.map((combo, i) =>
						UI.Button(combo.label)
							.value(String(i))
							.accent(v.bind("asymmetricVisible").bind(String(i)))
							.onClick("ToggleAsymmetric"),
					),
				),

			// Asymmetric effect preview boxes
			UI.Row()
				.wrapContent()
				.gap(8)
				.minHeight(60)
				.with(
					...ASYMMETRIC_COMBOS.map((combo, i) =>
						UI.ShowWhen(
							v.bind("asymmetricVisible").bind(String(i)),
							UI.Column()
								.padding(16)
								.borderRadius(8)
								.background("success")
								.fg("background")
								.with(UI.Text(combo.label))
								.effect(combo.enter)
								.effect(combo.exit),
						),
					),
				),

			UI.Divider(),

			// =====================================================================
			// Container effects section
			// =====================================================================
			UI.Text("Container effects:").dim(),

			// Stagger content
			UI.Text("stagger-content:").dim(),
			UI.Row()
				.gap(8)
				.with(
					UI.Button("Add item").onClick("AddStaggerItem"),
					UI.Button("Add 5").onClick("Add5StaggerItems"),
					UI.Button("Clear").onClick("ClearStaggerItems").ghost(),
				),
			UI.List(v.bind("staggerItems"), (item: Binding<ListItem>) =>
				UI.Column()
					.padding(12)
					.borderRadius(8)
					.background("accent")
					.fg("background")
					.with(UI.Text(item.bind("label"))),
			)
				.outer(UI.Row().gap(8).minHeight(60))
				.effect("stagger-content"),

			// Stagger content slow
			UI.Text("stagger-content-slow (2x duration, 100ms delay):").dim(),
			UI.Row()
				.gap(8)
				.with(
					UI.Button("Add item").onClick("AddStaggerSlowItem"),
					UI.Button("Add 5").onClick("Add5StaggerSlowItems"),
					UI.Button("Clear").onClick("ClearStaggerSlowItems").ghost(),
				),
			UI.List(v.bind("staggerSlowItems"), (item: Binding<ListItem>) =>
				UI.Column()
					.padding(12)
					.borderRadius(8)
					.background("accent")
					.fg("background")
					.with(UI.Text(item.bind("label"))),
			)
				.outer(UI.Row().gap(8).minHeight(60))
				.effect("stagger-content-slow"),

			// FLIP animation
			UI.Text("animate-content (FLIP):").dim(),
			UI.Row()
				.gap(8)
				.with(
					UI.Button("Shuffle").onClick("ShuffleFlipItems"),
					UI.Button("Reverse").onClick("ReverseFlipItems").ghost(),
				),
			UI.List(v.bind("flipItems"), (item: Binding<ListItem>) =>
				UI.Column()
					.name(item.bind("label"))
					.padding(16)
					.borderRadius(8)
					.background("success")
					.fg("background")
					.minWidth(50)
					.with(UI.Text(item.bind("label")).larger().bold()),
			)
				.outer(UI.Row().gap(8).minHeight(60))
				.effect("animate-content"),
			UI.List(v.bind("flipItems"), (item: Binding<ListItem>) =>
				UI.Column()
					.name(item.bind("label"))
					.padding(16)
					.borderRadius(8)
					.background("success")
					.fg("background")
					.minWidth(50)
					.with(UI.Text(item.bind("label")).larger().bold()),
			)
				.outer(UI.Row().gap(8).minHeight(60))
				.effect("animate-content-slow"),

			UI.Divider(),

			// =====================================================================
			// Dialog/Menu buttons
			// =====================================================================
			UI.Text("Open dialogs with different effects:").dim(),
			UI.Row()
				.wrapContent()
				.gap(8)
				.with(
					...SYMMETRIC_EFFECTS.map((name) =>
						UI.Button(`Dialog: ${name}`)
							.value(name)
							.ghost()
							.onClick("ShowDialog"),
					),
				),

			UI.Text("Open menus with different effects:").dim(),
			UI.Row()
				.wrapContent()
				.gap(8)
				.with(
					...SYMMETRIC_EFFECTS.map((name) =>
						UI.Button(`Menu: ${name}`)
							.value(name)
							.ghost()
							.chevron("down")
							.onClick("ShowMenu"),
					),
				),
		);
}

export function EffectsDemo() {
	return EffectsDemoWidget.builder((v) => EffectsDemoView(v));
}
