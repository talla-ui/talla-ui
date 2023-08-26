---
title: Using rows and columns
abstract: Understand how rows and columns can be used as part of your application UI
sort: -10
nav_uplink: {@link UIRow}
applies_to:
  - UIRow
  - UIColumn
assets:
  - sample-row.js
  - sample-column.js
---

## Definition {#definition}

Row and column containers are represented by the {@link UIRow} and {@link UIColumn} classes, respectively, both of which inherit functionality from the {@link UIContainer} and {@link UIComponent} abstract classes.

- {@ref UIRow}
- {@ref UIColumn}
- {@ref UIContainer}
- {@ref UIComponent}

## Appearance {#appearance}

Row containers contain other components which are arranged along the horizontal axis. By default, a row container places all components at the start of the available space (the left, for LTR text direction).

When controls such as buttons and labels are added to a row, they take up only as much horizontal space as they need if {@link UIControl.shrinkwrap} is true, otherwise expand to fill the available space.

<!--{{iframesample js="./sample-row.js" short}}-->

Column containers do the same, but arrange content vertically, starting from the top. The layout of textual controls such as buttons and labels isn't as intuitive within a column, so it may be necessary to use nested containers to lay these out horizontally.

<!--{{iframesample js="./sample-column.js"}}-->

Like all views, row and column containers are often defined statically, rather than being instantiated directly using the {@link UIRow} and {@link UIColumn} constructors. This way, both the properties of the container itself and the included content (a list of more preset view classes) can be defined.

```ts
const view = UIRow.with(
	{ padding: 8 },
	UIPrimaryButton.withLabel("UIPrimaryButton"),
	UIExpandedLabel.withText("UIExpandedLabel"),
	UILabel.withText("UILabel")
);
```

```jsx
// or, using JSX syntax:
<row padding={8}>
	<primarybutton>UIPrimaryButton</primarybutton>
	<expandedlabel>UIExpandedLabel</expandedlabel>
	<label>UILabel</label>
</row>
```

Row and column dimensions, position, and layout styles are customizable, either using {@link UITheme} styles or using any of the style properties of the container itself.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/guide/Styles"}}-->

### Dimensions {#dimensions}

Rows and columns, like other containers, are automatically stretched in the direction of the perpendicular axis of their container.

For rows within columns (or within cells with a vertical layout axis, the default), this means that their **width** is defined by the width of their container. However, by default their **height** is determined by their own contents. To set a row's height explicitly, use its height property.

- {@ref UIRow.height}

For columns within rows (or within cells with a horizontal layout axis), this means that their **height** is defined by the height of their container. However, by default their **width** is determined by their own contents. To set a column's width explicitly, use its width property.

- {@ref UIColumn.width}

### Layout and content spacing {#layout}

On row and column containers, the following properties can be used to control spacing. By default, both are set to 0, _except_ for spacing on rows. Row spacing is determined by the theme, using the value of {@link UITheme.rowSpacing}.

- {@ref UIContainer.padding}
- {@ref UIContainer.spacing}

To move components within the available space, along the primary axis of the component, use the following property.

- {@ref UIContainer.distribution}

For more options, such as for adding a separator between components or changing their default gravity (alignment along perpendicular axis), use the {@link UIContainer.layout layout} or {@link UIComponent.style style} properties to apply predefined styles.

## Preset properties {#presets}

The following properties can be preset using `UIRow.with({ ... })`, `UIColumn.with({ ... })`, or JSX `<row ...>` and `<column ...>`.

| Property                                                        | Type                                                                 |
| :-------------------------------------------------------------- | :------------------------------------------------------------------- |
| {@link UIComponent.style style}                                 | Instance of {@link UIStyle} or a theme style name starting with `@`  |
| {@link UIComponent.dimensions dimensions}                       | An object with {@link UIStyle.Definition.Dimensions} properties      |
| {@link UIComponent.position position}                           | An object with {@link UIStyle.Definition.Position} properties        |
| {@link UIContainer.layout layout}                               | An object with {@link UIStyle.Definition.ContainerLayout} properties |
| {@link UIComponent.hidden hidden}                               | Boolean, or binding                                                  |
| {@link UIComponent.accessibleRole accessibleRole}               | String, or binding                                                   |
| {@link UIComponent.accessibleLabel accessibleLabel}             | String, or binding                                                   |
| {@link UIContainer.distribution distribution}                   | String, or binding                                                   |
| {@link UIContainer.padding padding}                             | Number, string with CSS unit, {@link UIStyle.Offsets}, or binding    |
| {@link UIContainer.spacing spacing}                             | Number, string with CSS unit, or binding                             |
| {@link UIRow.height height}                                     | **UIRow only:** Number, string with CSS unit, or binding             |
| {@link UIColumn.width width}                                    | **UIColumn only:** Number, string with CSS unit, or binding          |
| {@link UIContainer.asyncContentRendering asyncContentRendering} | True if content may be rendered asynchronously                       |
| {@link UIContainer.allowFocus allowFocus}                       | True if this component may receive input focus                       |
| {@link UIContainer.allowKeyboardFocus allowKeyboardFocus}       | True if keyboard focus should be enabled                             |
| requestFocus                                                    | True to request focus immediately after first render                 |

## Events {#events}

The following events are emitted by UIRow and UIColumn objects, and can be preset.

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
