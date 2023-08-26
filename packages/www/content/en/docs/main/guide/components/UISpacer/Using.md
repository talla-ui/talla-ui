---
title: Using spacers
abstract: Understand how spacers can be used as part of your application UI
sort: -10
nav_uplink: {@link UISpacer}
applies_to:
  - UISpacer
assets:
  - sample-fixed.js
  - sample-noshrink.js
---

## Definition {#definition}

Spacers are represented by the {@link UISpacer} class, which inherits functionality from the {@link UIControl} and {@link UIComponent} abstract classes.

- {@ref UISpacer}
- {@ref UIControl}
- {@ref UIComponent}

## Appearance {#appearance}

A spacer doesn't render any content at all. It can be used to move _other_ components around within a container, 'pushing' them along the primary axis of the container.

Spacers can be created with fixed dimensions, creating a gap between other components.

<!--{{iframesample js="./sample-fixed.js"}}-->

Like all views, spacer components are often defined statically, rather than being instantiated directly using the {@link UISpacer} constructor. When defining spacers this way, the dimensions can be specified using the `width` and/or `height` preset properties, or using the {@link UISpacer.withWidth withWidth()} and {@link UISpacer.withHeight withHeight()} methods.

```ts
const view = UISpacer.with({ width: 8 });
// or
const view = UISpacer.withWidth(8);
```

```jsx
// or, using JSX syntax:
<spacer width={8} />
```

When used without any preset dimensions, the {@link UIControl.shrinkwrap shrinkwrap} property is set to false, and the spacer takes up as much space as possible within the container, 'pushing' other components to the ends of the container's constrained area. This works both in containers that are laid out horizontally (rows) and vertically (columns, cells by default).

<!--{{iframesample js="./sample-noshrink.js" short }}-->

```ts
const view = UIRow.with(
	UILabel.withText("A row with..."),
	UISpacer,
	UILabel.withText("...a spacer")
);
```

## Preset properties {#presets}

The following properties can be preset using `UISpacer.with({ ... })` or JSX `<spacer ...>`.

| Property                                            | Type                                                                |
| :-------------------------------------------------- | :------------------------------------------------------------------ |
| {@link UIComponent.style style}                     | Instance of {@link UIStyle} or a theme style name starting with `@` |
| {@link UIComponent.dimensions dimensions}           | An object with {@link UIStyle.Definition.Dimensions} properties     |
| {@link UIComponent.position position}               | An object with {@link UIStyle.Definition.Position} properties       |
| {@link UIComponent.hidden hidden}                   | Boolean, or binding                                                 |
| {@link UIComponent.accessibleRole accessibleRole}   | String, or binding                                                  |
| {@link UIComponent.accessibleLabel accessibleLabel} | String, or binding                                                  |
| {@link UIControl.shrinkwrap shrinkwrap}             | Boolean, or binding                                                 |
| width                                               | Number, or string with CSS units                                    |
| height                                              | Number, or string with CSS units                                    |

Note that {@link UISpacer} also provides the following methods.

- {@ref UISpacer.withWidth}
- {@ref UISpacer.withHeight}

## Events {#events}

Spacer components do emit events just like other controls. However, since spacers can't be focused for user input, most control events aren't relevant.

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
