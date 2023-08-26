import {
  UICell,
  UIComponent,
  UIComponentEvent,
  UIExpandedLabel,
  UILabel,
  UIMenuBuilder,
  UIMenuItemSelectedEvent,
  UIRenderableConstructor,
  UISeparator,
  UISpacer,
  UIStyle,
  Stringable,
} from "typescene";

export const dropdownMenuStyles = UIStyle.group({
  "dropdownMenu": {
    dimensions: { minWidth: 50, maxWidth: 280 },
    decoration: {
      background: "@background",
      borderRadius: 4,
      dropShadow: 0.8,
    },
  },
  "dropdownMenu-item": UIStyle.create({
    containerLayout: { axis: "horizontal" },
    decoration: {
      padding: { x: 16 },
      css: { cursor: "pointer" },
    },
  })
    .addState("hover", {
      decoration: {
        background: "@primary",
        textColor: "@primary.text",
      },
    })
    .addState("focused", {
      decoration: {
        background: "@primary",
        textColor: "@primary.text",
      },
    }),
  "dropdownMenu-label": {},
  "dropdownMenu-hint": {
    textStyle: { color: "@text/50%", fontSize: 12 },
  },
});

/** Encapsulates a menu; items are mixed in by `DropdownMenuBuilder` */
class DropdownMenu extends UICell.with({
  style: "dropdownMenu",
  onArrowDownKeyPress(e: UIComponentEvent) {
    if (!(e.source instanceof DropdownMenu)) return;
    for (let item of (this as UICell).content) {
      if (item instanceof UICell) {
        item.requestFocus();
        return;
      }
    }
  },
}) {
  /** Emit an event with given key */
  emitMenuItemSelectedEvent(key: string) {
    this.emit(UIMenuItemSelectedEvent, "SelectMenuItem", this, key);
  }
}

/** Default dropdown menu builder, used by `UIMenu` */
export class DropdownMenuBuilder extends UIMenuBuilder {
  clear() {
    this._items.length = 0;
    return this;
  }

  addOption(
    key: string,
    text: Stringable,
    icon?: string,
    hint?: Stringable,
    hintIcon?: string,
    textStyle?: Partial<UIStyle.TextStyle>,
    hintStyle?: Partial<UIStyle.TextStyle>
  ) {
    function onClick(this: UIComponent) {
      let menu = this.getParentComponent(DropdownMenu);
      if (menu) menu.emitMenuItemSelectedEvent(key);
      this.emitAction("CloseModal");
    }
    this._items.push(
      UICell.with(
        {
          style: "dropdownMenu-item",
          allowKeyboardFocus: true,
          onClick,
          onEnterKeyPress: onClick,
          onArrowDownKeyPress: function () {
            this.requestFocusNext();
          },
          onArrowUpKeyPress: function () {
            this.requestFocusPrevious();
          },
        },
        UIExpandedLabel.with({
          text,
          icon,
          iconMargin: 8,
          style: "dropdownMenu-label",
          textStyle,
        }),
        hint ? UISpacer.withWidth(8) : undefined,
        hint
          ? UILabel.with({
              text: hint,
              icon: hintIcon,
              style: "dropdownMenu-hint",
              textStyle: hintStyle,
            })
          : undefined
      )
    );
    return this;
  }

  addSelectionGroup(
    options: Array<{ key: string; text: Stringable }>,
    selectedKey?: string,
    textStyle?: Partial<UIStyle.TextStyle>
  ) {
    for (let option of options) {
      this.addOption(
        option.key,
        option.text,
        option.key === selectedKey ? "check" : "blank",
        undefined,
        undefined,
        textStyle
      );
    }
    return this;
  }

  addSeparator() {
    this._items.push(UISeparator.with({ margin: 8 }));
    return this;
  }

  setGravity(gravity: "start" | "stretch" | "end") {
    this._gravity = gravity;
    return this;
  }

  setRevealTransition(transition: string) {
    this._revealTransition = transition;
    return this;
  }

  setExitTransition(transition: string) {
    this._exitTransition = transition;
    return this;
  }

  build() {
    return DropdownMenu.with({
      position: { gravity: this._gravity },
      revealTransition: this._revealTransition,
      exitTransition: this._exitTransition,
      content: [new UISpacer(8, 8), ...this._items.map(C => new C()), new UISpacer(8, 8)],
    });
  }

  /** List of items currently built up */
  private readonly _items: UIRenderableConstructor[] = [];
  private _gravity: "start" | "stretch" | "end" = "end";
  private _revealTransition?: string;
  private _exitTransition?: string;
}
