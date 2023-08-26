import {
	UICell,
	UIComponentEvent,
	UIExpandedLabel,
	UILabel,
	UISeparator,
	UISpacer,
	UIStyle,
	UITheme,
	Observer,
	UIColor,
	app,
	UIComponent,
	UIContainer,
	UIRow,
	RenderContext,
	ViewComposite,
} from "desk-frame";

/** @internal Styles that should be added to the web theme to style modal menus */
export const modalMenuStyles = {
	ModalMenu: UIStyle.Cell.extend("ModalMenu", {
		position: { gravity: "overlay", top: "100%", bottom: "auto", start: 0 },
		dimensions: { width: "100%", minWidth: 200, maxWidth: 280 },
		containerLayout: { gravity: "stretch" },
		decoration: {
			background: UIColor.Background,
			borderRadius: 6,
			padding: { y: 8 },
			dropShadow: 0.8,
		},
	}),
	ModalMenu_Item: UIStyle.Row.extend(
		"ModalMenu_Item",
		{
			containerLayout: { axis: "horizontal" },
			dimensions: { grow: 1 },
			decoration: {
				padding: { x: 16 },
				css: { cursor: "pointer" },
			},
		},
		{
			hover: {
				decoration: {
					background: UIColor.PrimaryBackground,
					textColor: UIColor.PrimaryBackground.text(),
				},
			},
			focused: {
				decoration: {
					background: UIColor.PrimaryBackground,
					textColor: UIColor.PrimaryBackground.text(),
				},
			},
		}
	),
	ModalMenu_Label: UIStyle.Label.extend("ModalMenu_Label", {}),
	ModalMenu_Hint: UIStyle.Label.extend("ModalMenu_Hint", {
		textStyle: { color: UIColor.Text.alpha(0.5), fontSize: 12 },
	}),
};

/** Body view preset for the menu itself */
const MenuBody = UICell.with({
	style: "@ModalMenu",
	onRendered: "+CellRendered",
});

/** @internal Default modal menu view; shown asynchronously and resolves a promise */
export class ModalMenu extends ViewComposite implements UITheme.MenuController {
	addItemGroup(
		items: UITheme.MenuItem[],
		selectedKey?: string,
		textStyle?: UIStyle.Definition.TextStyle
	) {
		for (let item of items) {
			this.addItem({
				...item,
				icon: item.key === selectedKey ? "@Check" : "@Blank",
				textStyle,
			});
		}
		return this;
	}

	addItem(item: UITheme.MenuItem) {
		this._items.push(item);
		return this;
	}

	setWidth(width: number) {
		this._targetWidth = width;
		return this;
	}

	onCellRendered() {
		let cell = this.body as UICell;

		// make sure the menu appears within the screen bounds,
		// even if the modal wrapper bounds are at the bottom or
		// on the opposite side (place menu above, or align right/left in LTR/RTL)
		let elt = cell.lastRenderOutput?.element as HTMLElement;
		let modalWrapper = elt.parentElement!;
		let modalShader = modalWrapper.parentElement!;
		modalShader.style.overflow = "hidden";
		let bounds = modalWrapper.getBoundingClientRect();
		let isLow: boolean | undefined;
		let isRhs: boolean | undefined;
		let isLhs: boolean | undefined;
		if (bounds && bounds.height) {
			if (bounds.bottom > window.innerHeight * 0.75) isLow = true;
			if (bounds.left > window.innerWidth - 300) isRhs = true;
			if (bounds.right < 300) isLhs = true;
		}

		// fix position for menu to appear above the reference elt,
		// or to appear right-aligned
		if (isLow) {
			elt.style.top = "auto";
			elt.style.bottom = "100%";
		}
		if (isLhs) {
			elt.style.left = "0";
			elt.style.right = "auto";
		} else if (isRhs) {
			elt.style.left = "auto";
			elt.style.right = "0";
		}

		// after rendering the menu, check that it fits on the screen
		// (vertically), and move it up if needed
		if (!isLow) {
			let fixedVert = 0;
			function checkFit() {
				let menuBounds = elt.getBoundingClientRect();
				if (!fixedVert && menuBounds && menuBounds.height) {
					let roomBelow = window.innerHeight - menuBounds.bottom;
					if (roomBelow < fixedVert) {
						fixedVert = roomBelow;
						elt.style.top = roomBelow + bounds.height - 4 + "px";
					}
				}
			}
			setTimeout(checkFit, 250);
		}
	}

	override beforeRender() {
		let cell = this.body as UICell;

		// set cell dimensions if required
		if (this._targetWidth) {
			cell.dimensions = {
				width: this._targetWidth,
				minWidth: 0,
				maxWidth: "none",
			};
		}

		// add menu items with label and/or hint
		for (let item of this._items) {
			if (item.separate) {
				let sep = new UISeparator();
				sep.margin = 8;
				cell.content.add(sep);
			}
			let content: UIComponent[] = [];
			let ItemLabel = UIExpandedLabel.with({
				text: item.text,
				icon: item.icon,
				textStyle: item.textStyle,
				style: "@ModalMenu_Label",
				iconMargin: 8,
			});
			content.push(new ItemLabel());
			if (item.hint || item.hintIcon) {
				let HintLabel = UILabel.with({
					text: item.hint,
					icon: item.hintIcon,
					textStyle: item.hintStyle,
					style: "@ModalMenu_Hint",
					iconMargin: 8,
					dimensions: { shrink: 0 },
				});
				let Spacer = UISpacer.with({ width: 8 });
				content.push(new Spacer(), new HintLabel());
			}
			let ItemRow = UIRow.with({
				style: "@ModalMenu_Item",
				allowKeyboardFocus: true,
				accessibleRole: "listitem",
			});
			let row = new ItemRow();
			row.content.add(...content);
			cell.content.add(row);

			// add an observer to register clicks and keyboard input
			let self = this;
			class ItemObserver extends Observer<UIRow> {
				onClick() {
					self._resolve?.(item.key);
				}
				onEnterKeyPress() {
					self._resolve?.(item.key);
				}
				onArrowDownKeyPress() {
					row.requestFocusNext();
				}
				onArrowUpKeyPress() {
					row.requestFocusPrevious();
				}
			}
			new ItemObserver().observe(row);
		}
	}

	async showAsync(place?: Partial<RenderContext.PlacementOptions>) {
		this.body = new MenuBody();
		let rendered = app.render(this, {
			mode: "modal",
			ref: this._ref?.lastRenderOutput,
			transform: {
				show: UITheme.getAnimation("show-menu"),
				hide: UITheme.getAnimation("hide-menu"),
			},
			...place,
		});

		// return a promise that's resolved when one of the items is selected
		return new Promise<{ key?: string }>((r) => {
			this._resolve = (key) => {
				rendered.removeAsync();
				r({ key });
			};
		});
	}

	onArrowDownKeyPress(e: UIComponentEvent) {
		if (e.source !== this.body) return;
		let content = this.body && (this.body as UICell).content;
		if (content) {
			for (let item of content) {
				if (item instanceof UIContainer) {
					item.requestFocus();
					return;
				}
			}
		}
	}

	onEscapeKeyPress() {
		this._resolve?.();
	}

	onCloseModal() {
		this._resolve?.();
	}

	private _items: UITheme.MenuItem[] = [];
	private _targetWidth?: number;
	private _ref?: UIComponent;
	private _resolve?: (key?: string) => void;
}
