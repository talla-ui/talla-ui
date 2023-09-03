---
title: Using label controls
abstract: Understand how labels can be used as part of your application UI
sort: -10
nav_uplink: {@link UILabel}
applies_to:
  - UILabel
  - UIParagraph
  - UIExpandedLabel
  - UICloseLabel
  - UIHeading1
  - UIHeading2
  - UIHeading3
assets:
  - sample-single.js
  - sample-paragraph.js
  - sample-close.js
  - sample-expanded.js
  - sample-headings.js
---

## Definition {#definition}

Labels are represented by the {@link UILabel} class, which inherits functionality from the {@link UIControl} and {@link UIComponent} abstract classes.

- {@ref UILabel}
- {@ref UIControl}
- {@ref UIComponent}

## Appearance {#appearance}

A label appears as a single piece of text and/or an icon. Labels are usually not interactive, but they do emit events just like other control components.

<!--{{iframesample js="./sample-single.js" short}}-->

Like all views, label components are often defined statically, rather than being instantiated directly using the {@link UILabel} constructor.

```ts
const view = UILabel.with({
	text: "This is a label",
	icon: UIIcon.ExpandRight,
});
```

```jsx
// or, using JSX syntax:
<label icon={UIIcon.ExpandRight}>This is a label</label>
```

Label decorations, dimensions, position, and text styles are customizable, either using {@link UITheme} styles or using any of the style properties of the control itself.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/guide/Styles"}}-->

Several predefined label variants are available. The base class {@link UILabel} should be used in all other cases.

## Paragraph labels {#UIParagraph}

The {@link UIParagraph} class can be used to add a _paragraph_ label view.

Paragraph labels apply the {@link UIStyle.Paragraph} style, which enables text wrapping across multiple lines.

<!--{{iframesample js="./sample-paragraph.js"}}-->

```ts
const view = UIParagraph.withText("This is a paragraph. ...");
```

```jsx
// or, using JSX syntax:
<p>This is a paragraph. ...</p>
```

## Closely spaced labels {#UICloseLabel}

The {@link UICloseLabel} class can be used to add a label view that has less (vertical) spacing applied to it. This component can be used when text is placed in vertical arrangements (i.e., a column of labels).

<!--{{iframesample js="./sample-close.js" short}}-->

```ts
const view = UIColumn.with(
	UICloseLabel.withText("Label one"),
	UICloseLabel.withText("Label two"),
);
```

```jsx
// or, using JSX syntax:
<column>
	<closelabel>Label one</closelabel>
	<closelabel>Label two</closelabel>
</column>
```

## Expanded labels {#UIExpandedLabel}

While regular labels take up as little (horizontal) space as they need, the {@link UIExpandedLabel} class can be used to add a label that stretches to the full size of its containing component.

Note that expanded labels should _only_ be used in row layout containers, since they would only stretch vertically in column (e.g. cell) containers.

<!--{{iframesample js="./sample-expanded.js" short}}-->

```ts
const view = UIRow.with(
	UIExpandedLabel.withText("Expanded label"),
	UIOutlineButton.withLabel("Button"),
);
```

```jsx
// or, using JSX syntax:
<row>
	<expandedlabel>Expanded label</expandedlabel>
	<outlinebutton>Button</outlinebutton>
</row>
```

## Heading labels {#UIHeading1}

The {@link UIHeading1}, {@link UIHeading2}, and {@link UIHeading3} classes can be used to add labels that contain heading text. These classes set the {@link UILabel.headingLevel} value to their corresponding values, and automatically apply styles such as {@link UIStyle.Heading1}.

Since these styles are very dependent on the overall look of your application, it's usually a good idea to set appropriate heading styles on {@link UITheme.styles app.theme.styles}.

<!--{{iframesample js="./sample-headings.js"}}-->

```ts
const view = UIColumn.with(
	UIHeading1.withText("Heading 1"),
	UIHeading2.withText("Heading 2"),
	UIParagraph.withText("Regular text"),
);
```

```jsx
// or, using JSX syntax:
<column>
	<h1>Heading 1</h1>
	<h2>Heading 2</h2>
	<p>Regular text</p>
</column>
```

## Bindings within label text {#bindings}

One of the primary use cases of a label control is to display _dynamic_ text, that reflects the internal state of the application — i.e., some variable or property, or even a combination of predefined text with placeholders for dynamic values.

Since the on-screen text displayed by the label component is determined by the {@link UILabel.text} property, this property can be _bound_ to set the text to a dynamic value, and even update it while the label is displayed.

- {@ref bound.string}

```ts
const myView = UICell.with(
	// Use a binding for the 'text' property:
	UILabel.withText(bound.string("myValue")),
);

export class MyActivity extends PageViewActivity {
	static override ViewBody = myView;

	// The label view displays this property:
	myValue = "Hello, world!";
}
```

> **Note:** The `.withText(...)` method used above is simply an alias for `.with({ text: ... })`, which should be used instead if any other properties are preset on the same label component.

To embed dynamic values in a predefined message, use the {@link bound.strf()} method instead.

- {@ref bound.strf}
- {@ref StringFormatBinding}

```ts
const myView = UICell.with(
	// Use a binding for the 'text' property:
	UILabel.withText(bound.string("I say: %s", "myValue")),
);
```

Note that JSX view definitions may include text bindings using the `%[...]` syntax. These are automatically converted to (embedded) bindings where necessary.

- {@ref JSX}

```jsx
export default (
	<cell>
		<label>I say: %[myValue]</label>
	</cell>
);
```

## Preset properties {#presets}

The following properties can be preset using `UILabel.with({ ... })` or JSX `<label ...>`.

| Property                                            | Type                                                                  |
| :-------------------------------------------------- | :-------------------------------------------------------------------- |
| {@link UIComponent.style style}                     | Instance of {@link UIStyle} or a theme style name starting with `@`   |
| {@link UIComponent.dimensions dimensions}           | An object with {@link UIStyle.Definition.Dimensions} properties       |
| {@link UIComponent.position position}               | An object with {@link UIStyle.Definition.Position} properties         |
| {@link UIControl.textStyle textStyle}               | An object with {@link UIStyle.Definition.TextStyle} properties        |
| {@link UIControl.decoration decoration}             | An object with {@link UIStyle.Definition.Decoration} properties       |
| {@link UIComponent.hidden hidden}                   | Boolean, or binding                                                   |
| {@link UIComponent.accessibleRole accessibleRole}   | String, or binding                                                    |
| {@link UIComponent.accessibleLabel accessibleLabel} | String, or binding                                                    |
| {@link UIControl.disabled disabled}                 | Boolean, or binding                                                   |
| {@link UIControl.shrinkwrap shrinkwrap}             | Boolean, or binding                                                   |
| {@link UILabel.text text}                           | String, {@link LazyString}, or binding                                |
| {@link UILabel.htmlFormat htmlFormat}               | Boolean, or binding                                                   |
| {@link UILabel.headingLevel headingLevel}           | Number, or binding                                                    |
| {@link UILabel.icon icon}                           | String, {@link UIIcon}, theme icon name starting with `@`, or binding |
| {@link UILabel.iconSize iconSize}                   | Number, or binding                                                    |
| {@link UILabel.iconMargin iconMargin}               | Number, or binding                                                    |
| {@link UILabel.iconColor iconColor}                 | String, {@link UIColor} instance, or binding                          |
| {@link UILabel.iconAfter iconAfter}                 | Boolean, or binding                                                   |
| allowFocus                                          | True if this component may receive input focus                        |
| allowKeyboardFocus                                  | True if keyboard focus should be enabled                              |
| requestFocus                                        | True to request focus immediately after first render                  |

Note that {@link UILabel} also provides the following methods.

- {@ref UILabel.withText}
- {@ref UILabel.withIcon}

## Events {#events}

The following events are emitted by UIlabel objects, and can also be preset.

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
