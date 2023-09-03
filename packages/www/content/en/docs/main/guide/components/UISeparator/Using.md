---
title: Using separators
abstract: Understand how separators can be used as part of your application UI
sort: -10
nav_uplink: {@link UISeparator}
applies_to:
  - UISeparator
assets:
  - sample-horz.js
  - sample-vert.js
---

## Definition {#definition}

Separators are represented by the {@link UISeparator} class, which inherits functionality from the {@link UIControl} and {@link UIComponent} abstract classes.

- {@ref UISeparator}
- {@ref UIControl}
- {@ref UIComponent}

## Appearance {#appearance}

A separator appears as a single line, either horizontally or vertically, with an optional margin on both sides. The thickness and color of the line are determined by the `thickness` and `color` properties.

<!--{{iframesample js="./sample-horz.js" short}}-->

Like all views, separator components are often defined statically, rather than being instantiated directly using the {@link UISeparator} constructor.

```ts
const view = UISeparator.with({
	thickness: 2,
	color: UIColor.Red,
});
```

```jsx
// or, using JSX syntax:
<separator thickness={2} color={UIColor.Red} />
```

If no preset properties are specified, the separator appears as a thin horizontal line, using the {@link UIColor.Separator} color (grey by default).

```ts
const view = UIColumn.with(
	UIRow.with(UILabel.withText("...")),
	UISeparator, // a grey line
	UIRow.with(UILabel.withText("...")),
);
```

To create a _vertical_ line, set the {@link UISeparator.vertical vertical} property to `true`. Vertical lines are usually used to separate tall components within a row

<!--{{iframesample js="./sample-vert.js"}}-->

## Preset properties {#presets}

The following properties can be preset using `UISeparator.with({ ... })` or JSX `<separator ...>`.

| Property                                            | Type                                                                |
| :-------------------------------------------------- | :------------------------------------------------------------------ |
| {@link UIComponent.style style}                     | Instance of {@link UIStyle} or a theme style name starting with `@` |
| {@link UIComponent.dimensions dimensions}           | An object with {@link UIStyle.Definition.Dimensions} properties     |
| {@link UIComponent.position position}               | An object with {@link UIStyle.Definition.Position} properties       |
| {@link UIControl.decoration decoration}             | An object with {@link UIStyle.Definition.Decoration} properties     |
| {@link UIComponent.hidden hidden}                   | Boolean, or binding                                                 |
| {@link UIComponent.accessibleRole accessibleRole}   | String, or binding                                                  |
| {@link UIComponent.accessibleLabel accessibleLabel} | String, or binding                                                  |
| {@link UIControl.shrinkwrap shrinkwrap}             | Boolean, or binding                                                 |
| {@link UISeparator.color color}                     | {@link UIColor}, string, or binding                                 |
| {@link UISeparator.thickness thickness}             | Number, string with CSS unit, or binding                            |
| {@link UISeparator.margin margin}                   | Number, string with CSS unit, or binding                            |
| {@link UISeparator.vertical vertical}               | Boolean, or binding                                                 |

## Events {#events}

Separator components do emit events just like other controls. However, since separators can't be focused for user input, most control events aren't relevant.

The following events can be preset.

| Event        | Description                                                          |
| :----------- | :------------------------------------------------------------------- |
| BeforeRender | Emitted before rendering the component the first time                |
| Rendered     | Emitted by the renderer after rendering the component                |
| Click        | Emitted when the component has been clicked or otherwise activated   |
| DoubleClick  | Emitted when the component has been double-clicked                   |
| ContextMenu  | Emitted when a context menu has been requested on the output element |
| MouseUp      | Emitted when a mouse button has been released                        |
| MouseDown    | Emitted when a mouse button has been pressed down                    |
