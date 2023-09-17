---
title: Using text field controls
abstract: Understand how text fields can be used as part of your application UI
sort: -10
nav_uplink: {@link UITextField}
applies_to:
  - UITextField
  - UIBorderlessTextField
assets:
  - sample-single.js
  - sample-borderless.js
---

## Definition {#definition}

Text fields are represented by the {@link UITextField} class, which inherits functionality from the {@link UIComponent} abstract class.

- {@ref UITextField}
- {@ref UIComponent}

## Appearance {#appearance}

A text field appears as a text input element, with an optional placeholder that's displayed when the input text is blank.

<!--{{iframesample js="./sample-single.js" short}}-->

Like all views, text field components are often defined statically, rather than being instantiated directly using the {@link UITextField} constructor.

```ts
const view = UITextField.with({
	placeholder: "Enter text",
	value: bound.string("someField"),
	onInput: "SomeFieldInput",
});
```

```jsx
// or, using JSX syntax:
<textfield value={bound.string("someField")} onInput="SomeFieldInput">
	Enter text
</textfield>
```

Text field decorations, dimensions, position, and text styles are highly customizable, either using {@link UITheme} styles or using any of the style properties of the control itself.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/guide/Styles"}}-->

## Preset properties {#presets}

The following properties can be preset using `UITextField.with({ ... })` or JSX `<textfield ...>`.

| Property                                                | Type                                                         |
| :------------------------------------------------------ | :----------------------------------------------------------- |
| {@link UIComponent.hidden hidden}                       | Boolean, or binding                                          |
| {@link UIComponent.position position}                   | {@link UIComponent.Position}, or binding                     |
| {@link UIComponent.accessibleRole accessibleRole}       | String, or binding                                           |
| {@link UIComponent.accessibleLabel accessibleLabel}     | String, or binding                                           |
| {@link UITextField.placeholder placeholder}             | String, {@link LazyString}, or binding                       |
| {@link UITextField.value value}                         | String, {@link LazyString}, or binding                       |
| {@link UITextField.type type}                           | String, or {@link UITextField.InputType}                     |
| {@link UITextField.multiline multiline}                 | True if this text field should receive multi-line text input |
| {@link UITextField.formField formField}                 | String                                                       |
| {@link UITextField.enterKeyHint enterKeyHint}           | String, or {@link UITextField.EnterKeyHintType}              |
| {@link UITextField.disableSpellCheck disableSpellCheck} | True if spell checking should be disabled by default         |
| {@link UITextField.disabled disabled}                   | Boolean, or binding                                          |
| {@link UITextField.readOnly readOnly}                   | Boolean, or binding                                          |
| {@link UITextField.width width}                         | Number, string with CSS unit, or binding                     |
| {@link UITextField.textFieldStyle textFieldStyle}       | {@link UITextFieldStyle} class, overrides, or binding        |
| requestFocus                                            | True to request focus immediately after first render         |

Note that {@link UITextField} also provides the following methods.

- {@ref UITextField.withField}

## Events {#events}

Most frequently, the Change or Input events are preset in order to handle value changes (after leaving the text field, or immediately after changing it, respectively).

```ts
const view = UICell.with(
	UIRow.with(
		UITextField.with({
			placeholder: "Enter text",
			value: bound.string("textValue"),
			onInput: "SampleTextInput",
		}),
	),
);

export class MyActivity extends ViewActivity {
	static ViewBody = view;

	// this property is bound to the text field value (one-way)
	textValue = "";

	// this event handler is invoked for user input
	onSampleTextInput(e: UIComponentEvent<UITextField>) {
		let currentText = e.source.value || "";
		this.textValue = currentText;
	}
}
```

Alternatively, forms and form context objects can be used to capture user input without having to handle events from different input fields.

- {@ref UIFormContext}
- {@ref UIForm}

The following events are emitted by UITextField objects, and can also be preset.

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
| Change             | Emitted when the input text is changed (on blur)                     |
| Input              | Emitted when the input text is changed (immediately)                 |
| Copy               | Emitted when the user invokes a clipboard Copy action                |
| Cut                | Emitted when the user invokes a clipboard Cut action                 |
| Paste              | Emitted when the user invokes a clipboard Paste action               |
