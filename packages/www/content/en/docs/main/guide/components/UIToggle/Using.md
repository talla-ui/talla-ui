---
title: Using toggle controls
abstract: Understand how toggle controls can be used as part of your application UI
sort: -10
nav_uplink: {@link UIToggle}
applies_to:
  - UIToggle
assets:
  - sample-single.js
---

## Definition {#definition}

Toggle controls are represented by the {@link UIToggle} class, which inherits functionality from the {@link UIComponent} abstract class.

- {@ref UIToggle}
- {@ref UIComponent}

## Appearance {#appearance}

A toggle control appears as a checkbox by default. It can be combined with a label, which appears next to the checkbox.

<!--{{iframesample js="./sample-single.js" short}}-->

Like all views, toggle components are often defined statically, rather than being instantiated directly using the {@link UIToggle} constructor.

```ts
const view = UIToggle.with({
	label: "I accept the terms and conditions",
	state: bound.boolean("accepted"),
	onChange: "SampleToggleChange",
});
```

```jsx
// or, using JSX syntax:
<toggle value={bound.boolean("accepted")} onChange="SampleToggleChange">
	I accept the terms and conditions
</textfield>
```

Toggle control decorations, dimensions, position, and text styles can be changed using {@link UITheme} styles or any of the style properties of the control itself.

<!-- TODO: update for styles -->
<!-- The decoration style object is applied to the toggle control _itself_ (checkbox, where applicable), while other styles are applied to the entire component. -->

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/guide/Styles"}}-->

> **Note:** In a web app, the appearance of the toggle control can be changed by applying CSS styles to the `<input>` element, its `:checked` version and `::after` pseudo-element. Use regular CSS on your output page (or the `useWebContext()` call) to load these styles. The component is represented by a `span` element containing both the `input` and `label` elements.

## Preset properties {#presets}

The following properties can be preset using `UIToggle.with({ ... })` or JSX `<toggle ...>`.

| Property                                            | Type                                                    |
| :-------------------------------------------------- | :------------------------------------------------------ |
| {@link UIComponent.hidden hidden}                   | Boolean, or binding                                     |
| {@link UIComponent.position position}               | {@link UIComponent.Position}, or binding                |
| {@link UIComponent.accessibleRole accessibleRole}   | String, or binding                                      |
| {@link UIComponent.accessibleLabel accessibleLabel} | String, or binding                                      |
| {@link UIToggle.label label}                        | String, {@link LazyString}, or binding                  |
| {@link UIToggle.state state}                        | Boolean, or binding                                     |
| {@link UIToggle.formField formField}                | String                                                  |
| {@link UIToggle.disabled disabled}                  | Boolean, or binding                                     |
| {@link UIToggle.toggleStyle toggleStyle}            | {@link UIToggleStyle} class, overrides, or binding      |
| {@link UIToggle.labelStyle labelStyle}              | {@link UIToggleLabelStyle} class, overrides, or binding |
| requestFocus                                        | True to request focus immediately after first render    |

Note that {@link UIToggle} also provides the following methods.

- {@ref UIToggle.withField}

## Events {#events}

Most frequently, the Change event is preset in order to handle state changes.

```ts
const view = UICell.with(
	UIRow.with(
		UIToggle.with({
			label: "I agree",
			state: bound.string("userAgreed"),
			onChange: "SampleToggleChange",
		}),
	),
);

export class MyActivity extends ViewActivity {
	static ViewBody = view;

	// this property is bound to the toggle value (one-way)
	userAgreed = false;

	// this event handler is invoked for user input
	onSampleToggleChange(e: UIComponentEvent<UIToggle>) {
		this.userAgreed = e.source.state;
	}
}
```

Alternatively, forms and form context objects can be used to capture user input without having to handle events from different components.

- {@ref UIFormContext}
- {@ref UIForm}

The following events are emitted by UIToggle objects, and can also be preset.

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
| Change             | Emitted when the toggle state is changed                             |
