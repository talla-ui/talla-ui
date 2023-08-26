---
title: Themes, styles, icons, and colors
abstract: Use themes, styles, icons, and colors to change the look of your UI components
sort: -10
breadcrumb_name: Guide
nav_parent: using
applies_to:
  - UIStyle
  - UITheme
  - UITheme.styles
  - UITheme.icons
  - UITheme.colors
  - UIColor
  - UIIcon
  - UIComponent
  - UIStyleController
---

## Style sets (style property) {#style}

All container and control view components, such as {@link UICell}, {@link UIRow}, {@link UILabel}, and {@link UITextField}, include a {@link UIComponent.style style} property. This property references an instance of {@link UIStyle}, which determines all aspects of the UI component's appearance.

Each UI component comes with default styles, which are referenced by the `style` property as soon as the component object is constructed.

```ts
let l = new UILabel("foo");
l.style; // => an instance of UIStyle
```

However, the styles in a {@link UIStyle} instance can't be changed. To apply a different set of styles, you'll need to create a new instance of {@link UIStyle} — which is most easily done with the {@link UIStyle.extend extend()} method.

- {@ref UIStyle}
- {@ref UIStyle.extend}

A new {@link UIStyle} object can be applied dynamically to each UI component, but mostly styles are defined in a separate file and then referenced as a _preset_ property when defining your view.

```ts
// styles.ts
export default {
	brandedButton: UIStyle.OutlineButton.extend({
		decoration: { background: UIColor.Yellow },
		// ... other styles
	}),
	boldLabel: UIStyle.Label.extend({ textStyle: { bold: true } }),
};
```

```ts
// view.ts
export default UICell.with(
	// ...
	UIRow.with(
		UIButton.with({
			style: styles.brandedButton,
			label: "Click me",
		})
	)
);
```

> **Note:** This method of defining and applying styles is closest to how styles could work in pure HTML and CSS. You may prefer this method, or use other methods explained below. Since the performance impact of each of these methods should be minimal in most cases, the choice of method for styling your application should be based on personal preference.

Individual style properties are grouped into style objects (each of which can also be overridden separately, see below). Not all objects are relevant for all types of UI components.

- {@ref UIStyle.Definition.Dimensions}
- {@ref UIStyle.Definition.Position}
- {@ref UIStyle.Definition.TextStyle}
- {@ref UIStyle.Definition.Decoration}
- {@ref UIStyle.Definition.ContainerLayout}

```ts
// UIStyle instance with full set of style objects
const myStyle = UIStyle.Cell.extend({
	dimensions: {}, // ... e.g. width, height
	position: {}, // ... e.g. top, gravity
	textStyle: {}, // ... e.g. color, align
	decoration: {}, // ... e.g. background
	containerLayout: {}, // ... e.g. axis, clip
});
```

## Basic style objects (overrides) {#overrides}

All style objects defined by the {@link UIStyle} instance, referenced by the {@link UIComponent.style} property, are also individually referenced by properties of the component object itself. These references are updated automatically when the `style` property is set.

For example, the `textStyle` object from a {@link UIStyle} instance is also referenced by the {@link UIControl.textStyle} property on a label control (i.e. {@link UILabel}) as soon as the label's `style` property is initialized.

Setting the {@link UIControl.textStyle} property directly _overrides_ the styles from the {@link UIStyle} object.

```ts
let l = new Label("foo");
l.textStyle.bold; // => false

// remember to copy all other properties, too
l.textStyle = { ...l.textStyle, bold: true };
l.textStyle.bold; // => true
```

Note that setting style override objects directly requires copying all existing properties as well; however this is **not** required when applying overrides through a preset property.

Overriding styles using preset style objects is often the most convenient way to change the appearance of a UI component.

```ts
const view = UICell.with(
	{ dimensions: { maxWidth: 320 } },
	UIRow.with(
		UIOutlineButton.with({
			label: "Large button",
			textStyle: { fontSize: 32 },
			dimensions: { height: 60, width: "50%" },
		})
	)
);
```

The following override object properties are available.

- {@ref UIComponent.dimensions}
- {@ref UIComponent.position}
- {@ref UIControl.textStyle}
- {@ref UIControl.decoration}
- {@ref UIContainer.layout}

## Cell styles (properties) {#cell}

The {@link UICell} view component exposes many styles conveniently as properties of the view object itself. This allows for styles such as background colors to be preset directly on the call to `.with(...)` or the corresponding `<cell>` JSX tag.

- {@ref UICell}

```ts
const view = UICell.with(
	{ background: UIColor.Green }
	// ... cell contents ...
);
```

```jsx
export default (
	<cell background={UIColor.Green}>
		{/*
       ... cell contents ...
    */}
	</cell>
);
```

## Themes {#themes}

The concept of _themes_ presents another level at which the appearance of UI components can be controlled.

Each application has a single 'current' theme, available as {@link GlobalContext.theme app.theme} — an instance of {@link UITheme}.

- {@ref UITheme}.

The current theme primarily provides a set of default styles, which are applied automatically to newly created UI components. This allows your application to change the default look without having to modify each component separately.

- {@ref UITheme.styles}

Additionally, application-specific styles may be added to this object using different property names. These can be referenced using special {@link UIStyle} instances constructed with a string parameter that starts with the `@` character, e.g. `new UIStyle("@MyStyle")` **or** using a preset `style` property that also starts with the `@` character.

```ts
// create a new theme, set a default and custom style
let myTheme = app.theme!.clone();
myTheme.style = {
	...myTheme.styles,
	Heading2: myTheme.styles.Heading2!.extend({
		textStyle: { color: UIColor.Red },
	}),
	FadedLabel: myTheme.styles.Label!.extend({
		textStyle: { color: UIColor.Text.alpha(0.35) },
	}),
};

// the custom style can be preset as "@FadedLabel"
const view = UICell.with(
	// as a property...
	UILabel.with({ text: "foo", style: "@FadedLabel" }),

	// or even using withText
	UILabel.withText("foo", "@FadedLabel")
);
```

Themes also include a variety of other settings, such as the default row spacing. Refer to the properties of the {@link UITheme} class for details.

Specifically, themes also include a set of colors and icons that can be referenced elsewhere in the application.

- {@ref UITheme.colors}
- {@ref UITheme.icons}

## Colors {#colors}

Colors can be defined and used in several different ways. Each of these result in an instance of {@link UIColor} being interpreted by the platform-specific renderer.

- Using colors through static properties of {@link UIColor}, such as `UIColor.Primary`, `UIColor.Green` and `UIColor.Red`. Each of these properties dynamically refers to a {@link UIColor} object defined by {@link UITheme.colors}.
- Using named custom colors — similar to custom styles, these can be accessed using the {@link UIColor} constructor with a string that starts with the `@` character, e.g. `new UIColor("@Brand1")` **or** as strings passed to many of the style properties. Note that the property name on {@link UITheme.colors} should not include the `@` character.
- Using CSS color values, passed to the {@link UIColor} constructor, e.g. `new UIColor("#f00")`.
- Using a combination of filters, on top of a base color instance. Filters are available as methods of the {@link UIColor} class, e.g. `UIColor.Primary.alpha(0.5)`.

```ts
const view = UICell.with(
	// make sure text-on-green is readable
	{
		background: UIColor.Green,
		textColor: UIColor.Green.text(),
	},
	UILabel.withText("Text")
);
```

Refer to the {@link UIColor} class for more details.

- {@ref UIColor}
- {@ref UIColor.alpha}
- {@ref UIColor.brighten}
- {@ref UIColor.contrast}
- {@ref UIColor.text}
- {@ref UIColor.mix}

## Icons {#icons}

Icons can be used with label and button UI controls, next to (or intead of) the control's text.

When referencing an icon through the `icon` property of a label or button, you can either use an instance of the {@link UIIcon} class or reference a theme icon using its name, prepended with the `@` character.

A set of default icons is made available using static properties of the {@link UIIcon} class itself.

- {@ref UIIcon}

```ts
const view = UICell.with(
	// a button that includes an icon
	UIPrimaryButton.with({
		label: "Close",
		icon: UIIcon.Close, // a UIIcon instance
	})
);
```

Instances of {@link UIIcon} can be created using SVG or emojis, or (in the future) perhaps using platform specific formats.

```ts
let myHappyIcon = new UIIcon("🙂");
let mySvgIcon = new UIIcon(`<svg xmlns="...">...</svg>`);
```

Custom icons can be added to a theme by setting additional properties of {@UITheme.icons} to instances of {@link UIIcon}. The property names of this object should **not** start with the `@` character themselves.

- {@ref UITheme.icons}

> **Note:** As with styles, whether to use the theme to store custom icons (and reference them using the `@` string syntax) **or** export UIIcon instances from a separate module (and use them directly on control view presets) is a personal preference and depends mostly on the other requirements of your application project.

## Dynamic styles (UIStyleController) {#controller}

The {@link UIStyleController} view component can be used to update styles of a contained UI component dynamically. This may be useful in cases where the view _content_ should stay the same, but some conditions should trigger style updates — such as the user's mouse cursor hovering over a particular area, or a list element being selected.

- {@ref UIStyleController}

The {@link UIStyleController} view component allows for styles to be updated in a number of different ways:

- By manipulating the {@link UIStyleController.state} property, enabling and disabling the effect of the {@link UIStyleController} component. This property could be bound to an activity property, for example. By default, the {@link UIStyleController.state} property is set to `true`.
- By manipulating the {@link UIStyleController.style} property. This property can be set to an instance of {@link UIStyle} **or** a string (referencing a theme style, prefixed with the `@` character). The property can also be updated using a binding.
- By manipulating the style override objects directly on the {@link UIStyleController} instance, such as {@link UIStyleController.dimensions} and {@link UIStyleController.decoration}. These properties can be preset, but may also be bound (e.g. to activity properties that are set to plain object references).

```ts
const view = UICell.with(
	// use a UIStyleController to switch between styles
	UIStyleController.with(
		{
			state: bound.boolean("someValue"),
			style:
				// this could be an import, const, or theme style:
				UIStyle.Label.extend({ textStyle: { color: UIColor.Red } }),
		},
		UILabel.withText("Hello, world!")
	)
);

const view = UICell.with(
	// same, but with direct override
	UIStyleController.with(
		{
			textStyle: bound.boolean("someValue").select({ color: UIColor.Red }),
		},
		UILabel.withText("Hello, world!")
	)
);
```

In a view using JSX syntax, a {@link UIStyleController} can be added with the `<style>` tag. Of course, this shouldn't be confused with the HTML tag to embed CSS styles. The content of the `<style>` tag should be a single component that should be affected by dynamic styles.

```jsx
// use a UIStyleController to switch between styles
// (see notes above)
export default (
	<cell>
		<style
			state={bound.boolean("someValue")}
			textStyle={{ color: UIColor.Red }}
		>
			<label>Hello, world!</label>
		</style>
	</cell>
);
```
