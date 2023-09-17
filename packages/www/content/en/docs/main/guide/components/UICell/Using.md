---
title: Using cell components
abstract: Understand how cells can be used as part of your application UI
sort: -10
nav_uplink: {@link UICell}
applies_to:
  - UICell
  - UIAnimatedCell
assets:
  - sample-single.js
  - sample-select.js
---

## Definition {#definition}

Cell containers are represented by the {@link UICell} class, which inherits functionality from the {@link UIContainer} and {@link UIComponent} abstract classes.

- {@ref UICell}
- {@ref UIContainer}
- {@ref UIComponent}

## Appearance {#appearance}

A cell container contains other components which are arranged along a vertical (or horizontal) axis. The cell itself can be decorated using a background color, borders, and a drop shadow. By default, a cell takes up as much space as it can within its own parent container, and places all components in the center of the available space.

<!--{{iframesample js="./sample-single.js"}}-->

Like all views, cell containers are often defined statically, rather than being instantiated directly using the {@link UICell} constructor. This way, both the properties of the cell itself and the included content (a list of more preset view classes) can be defined.

```ts
const view = UICell.with(
	{
		margin: 16,
		padding: 8,
		background: UIColor["@blue"].alpha(0.1),
		borderColor: UIColor["@red"],
		borderThickness: 2,
		dropShadow: 1,
	},
	UILabel.withText("Hello, world!"),
);
```

```jsx
// or, using JSX syntax:
<cell
	margin={16}
	padding={8}
	background={UIColor["@blue"].alpha(0.1)}
	borderColor={UIColor["@red"]}
	borderThickness={2}
	dropShadow={1}
>
	<label>Hello, world!</label>
</cell>
```

Cell decorations, dimensions, position, and layout styles are highly customizable, either using {@link UITheme} styles or using any of the style properties of the container itself.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/guide/Styles"}}-->

### Layout and content spacing {#layout}

Like all containers, cells can add space around and between contained components. The following properties can be used to control spacing. By default, both are set to 0 for cell containers.

- {@ref UIContainer.padding}
- {@ref UIContainer.spacing}

To move components within the available space, or changing the primary axis, use the following property.

- {@ref UIContainer.layout}

### Style overrides {#overrides}

Cell containers allow you to change the appearance of the rendered cell by setting simple properties on the instance or preset object itself. The following properties are available.

- {@ref UICell.margin}
- {@ref UICell.background}
- {@ref UICell.textColor}
- {@ref UICell.borderRadius}
- {@ref UICell.dropShadow}
- {@ref UICell.opacity}

## Selection state {#selection}

Cell containers automatically keep track of `Select` and `Deselect` events, and set the {@link UICell.selected selected} property accordingly. These events aren't emitted automatically — use an event preset and/or a {@link UISelectionController} to manage selection state. You can also use the selected state for extended style classes as illustrated below.

<!--{{iframesample js="./sample-select.js"}}-->

```ts
// TODO: Update this example
const cellStyle = UIStyle.Cell.extend(
	{
		decoration: {
			borderThickness: 1,
			borderColor: UIColor["@separator"],
		},
	},
	{
		// use the selected state to switch styles automatically:
		selected: {
			decoration: { dropShadow: 0.5 },
		},
	},
);

const myCell = UICell.with(
	{
		// emit Select events when clicked:
		onClick: "+Select",
		style: cellStyle,
	},
	UILabel.withText(
		// bind to `selected` property of the surrounding cell:
		bound.boolean("selected").select("Selected", "Not selected"),
	),
);

// use a UISelectionController to emit Deselect events too
const view = desk.UISelectionController.with(
	desk.UIColumn.with({ padding: 8, spacing: 8 }, myCell, myCell, myCell),
);
```

## Preset properties {#presets}

The following properties can be preset using `UICell.with({ ... })` or JSX `<cell ...>`.

| Property                                                        | Type                                                                  |
| :-------------------------------------------------------------- | :-------------------------------------------------------------------- |
| {@link UIComponent.hidden hidden}                               | Boolean, or binding                                                   |
| {@link UIComponent.position position}                           | {@link UIComponent.Position}, or binding                              |
| {@link UIComponent.accessibleRole accessibleRole}               | String, or binding                                                    |
| {@link UIComponent.accessibleLabel accessibleLabel}             | String, or binding                                                    |
| {@link UIContainer.padding padding}                             | Number, string with CSS unit, {@link UIComponent.Offsets}, or binding |
| {@link UIContainer.spacing spacing}                             | Number, string with CSS unit, or binding                              |
| {@link UIComponent.layout layout}                               | {@link UIContainer.Layout}, or binding                                |
| {@link UICell.margin margin}                                    | Number, string with CSS unit, {@link UIComponent.Offsets}, or binding |
| {@link UICell.background background}                            | {@link UIColor}, string, or binding                                   |
| {@link UICell.textDirection textDirection}                      | String (`"rtl"` or `"ltr"`)                                           |
| {@link UICell.textColor textColor}                              | {@link UIColor}, string, or binding                                   |
| {@link UICell.borderRadius borderRadius}                        | Number, string with CSS unit, or binding                              |
| {@link UICell.dropShadow dropShadow}                            | Number (0-1), or binding                                              |
| {@link UICell.opacity opacity}                                  | Number (0-1), or binding                                              |
| {@link UICell.cellStyle cellStyle}                              | {@link UICellStyle} class, overrides, or binding                      |
| {@link UIContainer.asyncContentRendering asyncContentRendering} | True if content may be rendered asynchronously                        |
| {@link UIContainer.allowFocus allowFocus}                       | True if this component may receive input focus                        |
| {@link UIContainer.allowKeyboardFocus allowKeyboardFocus}       | True if keyboard focus should be enabled                              |
| requestFocus                                                    | True to request focus immediately after first render                  |

## Events {#events}

The following events are emitted by UICell objects, and can be preset.

| Event              | Description                                                          |
| :----------------- | :------------------------------------------------------------------- |
| BeforeRender       | Emitted before rendering the component the first time                |
| Rendered           | Emitted by the renderer after rendering the component                |
| ContentRendering   | Emitted when content is being rendered                               |
| FocusIn            | Emitted when the component gained input focus                        |
| FocusOut           | Emitted when the component lost input focus                          |
| Click              | Emitted when the component has been clicked or otherwise activated   |
| DoubleClick        | Emitted when the component has been double-clicked                   |
| ContextMenu        | Emitted when a context menu has been requested on the output element |
| MouseUp            | Emitted when a mouse button has been released                        |
| MouseDown          | Emitted when a mouse button has been pressed down                    |
| MouseEnter         | Emitted when the mouse cursor has entered the cell area              |
| MouseLeave         | Emitted when the mouse cursor has left the cell area                 |
| KeyUp              | Emitted when a key has been released                                 |
| KeyDown            | Emitted when a key has been pressed down                             |
| KeyPress           | Emitted when a key has been pressed                                  |
| EnterKeyPress      | Emitted when the Enter key has been pressed                          |
| SpacebarPress      | Emitted when the space bar has been pressed                          |
| BackspaceKeyPress  | Emitted when the Backspace key has been pressed                      |
| DeleteKeyPress     | Emitted when the Delete key has been pressed                         |
| EscapeKeyPress     | Emitted when the Escape key has been pressed                         |
| ArrowLeftKeyPress  | Emitted when the left arrow key has been pressed                     |
| ArrowRightKeyPress | Emitted when the right arrow key has been pressed                    |
| ArrowUpKeyPress    | Emitted when the up arrow key has been pressed                       |
| ArrowDownKeyPress  | Emitted when the down arrow key has been pressed                     |
| Select             | Emitted when the component is selected                               |
| Deselect           | Emitted when the component is deselected                             |
