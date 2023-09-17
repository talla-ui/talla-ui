---
title: Using button controls
abstract: Understand how buttons can be used as part of your application UI
sort: -10
nav_uplink: {@link UIButton}
applies_to:
  - UIButton
  - UIPrimaryButton
  - UIPlainButton
  - UIIconButton
assets:
  - sample-single.js
  - sample-types.js
  - sample-style.js
  - sample-theme.js
  - sample-select.js
---

## Definition {#definition}

Buttons are represented by the {@link UIButton} class, which inherits functionality from the {@link UIComponent} abstract class.

- {@ref UIButton}
- {@ref UIComponent}

## Appearance {#appearance}

A button appears as a clickable element containing a text label and/or icon.

<!--{{iframesample js="./sample-single.js" short}}-->

Like all views, button components are often defined statically, rather than being instantiated directly using the {@link UIButton} constructor.

```ts
const view = UIButton.with({
	label: "Button",
	icon: UIIconResource["@plus"],
});
```

```jsx
// or, using JSX syntax:
<button icon={UIIconResource["@plus"]}>Button</button>
```

Button decorations, dimensions, position, and text styles are highly customizable, either using {@link UITheme} styles or using any of the style properties of the button itself.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/guide/Styles"}}-->

The default appearance of these button types is shown below.

<!--{{iframesample js="./sample-types.js"}}-->

Buttons are best customized using style classes, since most button styles include hover and click states. For example, a red button may turn a slightly different shade of red when hovered and clicked with the mouse.

<!-- TODO: explain style classes -->

<!--{{iframesample js="./sample-style.js" short}}-->

```ts
// TODO: Update this example
const styles = {
	dangerousButton: UIStyle.PrimaryButton.extend(
		{
			decoration: {
				background: UIColor["@red"],
				borderColor: UIColor["@red"],
			},
		},
		{
			hover: {
				decoration: {
					background: UIColor["@red"].brighten(-0.2),
					borderColor: UIColor["@red"].brighten(-0.2),
				},
			},
			pressed: {
				decoration: {
					background: UIColor["@red"].brighten(0.2),
					borderColor: UIColor["@red"].brighten(0.2),
				},
			},
		},
	),
};

const view = UIPrimaryButton.with({
	label: "Delete",
	style: styles.dangerousButton,
});
```

To customize the appearance of a predefined button type _everywhere_ in your app, you can update the corresponding {@link UITheme} style. For example, the code below changes the default primary button style.

<!--{{iframesample js="./sample-theme.js" short}}-->

```ts
app.theme.styles = {
	...app.theme.styles,
	PrimaryButton: app.theme.styles.PrimaryButton.extend({
		textStyle: {
			bold: true,
			uppercase: true,
			fontSize: 12,
		},
		decoration: {
			padding: { x: 32, y: 8 },
			borderRadius: 0,
			dropShadow: 0.5,
		},
	}),
};
```

Finally, you can add a property such as `DangerousButton` to the `app.theme.styles` object (at the start of your application), and reference it by setting the `style` property to a string starting with `@`.

```ts
const view = UIPrimaryButton.with({
	label: "Delete",
	style: "@DangerousButton",
});
```

## Selection state {#selection}

Button controls automatically keep track of `Select` and `Deselect` events, and set the {@link UIButton.selected selected} property accordingly. These events aren't emitted automatically — use an event preset and/or a {@link UISelectionController} to manage selection state. You can also use the selected state for extended style classes as illustrated below.

<!--{{iframesample js="./sample-select.js" short}}-->

```ts
// TODO: Update this example
const buttonStyle = UIStyle.OutlineButton.extend(
	{},
	{
		// use the selected state to switch styles automatically:
		selected: {
			decoration: {
				background: UIColor["@primaryBackground"],
				textColor: UIColor["@primaryBackground"].text(),
			},
		},
	},
);

const myButton = UIButton.with({
	// emit Select events when clicked:
	onClick: "+Select",
	style: buttonStyle,
	label: "Selectable",
});

// use a UISelectionController to emit Deselect events too
const view = UISelectionController.with(
	UIRow.with({ padding: 8, spacing: 8 }, myButton, myButton, myButton),
);
```

## Preset properties {#presets}

The following properties can be preset using `UIButton.with({ ... })` or JSX `<button ...>`.

| Property                                            | Type                                                                          |
| :-------------------------------------------------- | :---------------------------------------------------------------------------- |
| {@link UIComponent.hidden hidden}                   | Boolean, or binding                                                           |
| {@link UIComponent.position position}               | {@link UIComponent.Position}, or binding                                      |
| {@link UIComponent.accessibleRole accessibleRole}   | String, or binding                                                            |
| {@link UIComponent.accessibleLabel accessibleLabel} | String, or binding                                                            |
| {@link UIButton.label label}                        | String, {@link LazyString}, or binding                                        |
| {@link UIButton.icon icon}                          | String, {@link UIIconResource}, theme icon name starting with `@`, or binding |
| {@link UIButton.iconSize iconSize}                  | Number, or binding                                                            |
| {@link UIButton.iconMargin iconMargin}              | Number, or binding                                                            |
| {@link UIButton.iconColor iconColor}                | String, {@link UIColor} instance, or binding                                  |
| {@link UIButton.chevron chevron}                    | String, or binding                                                            |
| {@link UIButton.chevronSize chevronSize}            | Number, or binding                                                            |
| {@link UIButton.navigateTo navigateTo}              | String, or binding                                                            |
| {@link UIButton.disabled disabled}                  | Boolean, or binding                                                           |
| {@link UIButton.width width}                        | Number, string with CSS unit, or binding                                      |
| {@link UIButton.buttonStyle buttonStyle}            | {@link UIButtonStyle} class, overrides, or binding                            |
| disableKeyboardFocus                                | True if keyboard focus should be disabled                                     |
| requestFocus                                        | True to request focus immediately after first render                          |

Note that {@link UIButton} also provides the following methods.

- {@ref UIButton.withLabel}
- {@ref UIButton.withIcon}

## Events {#events}

Most frequently, the Click event is preset in order to handle specific button clicks in an activity or view composite class.

```ts
const view = UICell.with(
	UIButton.withLabel("Button", "SampleClick"),
	// ... same as:
	UIButton.with({
		label: "Button",
		onClick: "SampleClick",
	}),
);

export class MyActivity extends ViewActivity {
	static ViewBody = view;

	onSampleClick() {
		// handle the button click here
	}
}
```

The following events are emitted by UIButton objects, and can also be preset.

| Event              | Description                                                          |
| :----------------- | :------------------------------------------------------------------- |
| BeforeRender       | Emitted before rendering the component the first time                |
| Rendered           | Emitted by the renderer after rendering the component                |
| FocusIn            | Emitted when the component gained input focus                        |
| FocusOut           | Emitted when the component lost input focus                          |
| Click              | Emitted when the component has been clicked or otherwise activated   |
| DoubleClick        | Emitted when the component has been double-clicked                   |
| ContextMenu        | Emitted when a context menu has been requested on the output element |
| MouseUp            | Emitted when a mouse button has been released                        |
| MouseDown          | Emitted when a mouse button has been pressed down                    |
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
