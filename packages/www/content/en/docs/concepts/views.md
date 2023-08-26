---
template: doc_article
title: Views
description: Detailed description of views and UI components
pageintro: |
  Views represent the user interface of a Typescene application.
---

## Creating views {#create}

Views are _renderable_ components that represent (parts of) the user interface of an application.

Typescene views are *platform independent:* the code that’s responsible for drawing elements on the screen, or inserting them into a document such as a Web page, is separate from the view component classes themselves.

As such, views don’t necessarily correspond 1-to-1 with the generated output. Creating views for a Typescene application is certainly not the same as writing HTML code — even if the output gets inserted into the DOM (document object model) of a Web page.

### Preset constructors

View rendering is initiated by the application’s [Activities](/docs/concepts/activities). Typically, each activity encapsulates exactly one view component, which is created and destroyed as the activity transitions between active and inactive states.

Even though views are created as [Component](/docs/concepts/components) classes, you don’t need to instantiate any of them yourself. Each activity takes care of instantiating its own view — as long as the activity itself is _preset_ with a view constructor.

For more details on how components are ‘preset’ to create new component constructors, refer to the following page.

[**See also:** Concepts &gt; Components](/docs/concepts/components){:.block_link.doc}

```typescript
// UIButton is a view class in itself:
const simplestView = UIButton;

// Preset constructors provide property values,
// bindings, and event handlers:
const boundView = UIButton.with({
  label: bind("buttonLabel"),
  icon: "warning",
  onClick: "sayHi()"
});

// Nested views can also be preset
// (result is still a class, not an object) --
const cellView = UICell.with(
  UICenterRow.with(
    { height: 48 },
    UILabel.withText("Hello, world!"),
    UIButton.with({
      label: bind("buttonLabel"),
      onClick: "sayHi()"
    })
  )
);

// Activities are also preset, and then extended:
class MyActivity extends ViewActivity.with(cellView) {
  path = "/";
  buttonLabel = "Say hi";
  sayHi() { alert("Hello, world!") }
}
```

In the above example, when an instance of `MyActivity` is activated, it immediately creates an instance of `cellView`, and assigns it to the `view` property of the activity object.

### View objects

You can interact with the instantiated view objects after they are created, for example from an event handler.

```typescript
class MyActivity extends ViewActivity.with(cellView) {
  // ...
  sayHi(e: UIComponentEvent<UIButton>) {
    let button = e.source;  // <= button instance
    console.log(button.label);  // => "Say hi"
  }
}
```

You can even create view components on the fly, and add them to containers, although this is largely unnecessary. Also keep in mind that bindings do not work if the view was never preset on its bound parent component.

```typescript
class MyActivity extends ViewActivity.with(cellView) {
  // ...
  sayHi(e: UIComponentEvent) {
    let row = e.source.getParentComponent(UIRow)!;
    row.content.add(new UILabel("More hello"));
  }
}
```

## JSX syntax {#jsx}

In addition to the regular JavaScript/TypeScript syntax that includes method calls to the static `.with()` method (as illustrated above), Typescene supports ‘JSX’ syntax. This syntax was originally created for the _React_ framework, but is now officially supported by non-React tools — importantly, TypeScript and Babel transpilers.

Conversion from JSX syntax to plain JavaScript/TypeScript is done at build time, by inserting calls to a single function at runtime (exported by the Typescene library as [`JSX`](/docs/ref/JSX)). This function simply calls the static `with` method on a component class, making the following code snippets equivalent:

```jsx
// JSX syntax:
const view = (
  <cell onBeforeRender="doSomething()">
    <centerrow height={40}>
      <label>Hello, {bind("name")}</label>
    </centerrow>
  </cell>
);
```

```typescript
// JavaScript syntax without JSX:
const view = UICell.with(
  { onBeforeRender: "doSomething()" },
  UICenterRow.with(
    { height: 40 },
    UILabel.withText(bindf("Hello, ${name}"))
  )
);
```

> **Note:** Unlike with other frameworks (including React itself), Typescene JSX tags do *not* result in an object. The ‘value’ of a JSX tag such as `<label>...</label>` is still a _constructor_. You cannot refer to variable values within JSX blocks, since preset values would never change afterwards. However, JSX views may include bindings — just wrap the call to `bind` in a pair of curly braces as in the example above.

Certain components, such as labels and buttons, can be declared with text within their opening and closing brackets. If there are any bindings within this text (such as in the above example), the surrounding text gets wrapped in a call to `bindf`.

[**bindf()**<br>Create a new binding using a format string](/docs/ref/bindf){:.block_link.function}

## UI components {#ui-components}

Typescene defines a number of ‘primitive’ components — those that can be rendered using as native controls. A basic user interface can be created using these components alone, and more complex elements can be creates as [custom views](#custom) (see below).

Where several variants of the same type of component are available, a base component class is extended with additional [styles](#styles) that change how a UI element looks, but not its behavior.

### Labels

Label components display plain text or HTML-formatted text, either in a single line, with hard line breaks, or wrapped automatically based on the width of the component.

[**UILabel**<br>Represents a UI component that contains a piece of text](/docs/ref/UILabel){:.block_link.class}
[**UICloseLabel**<br>A label with reduced vertical spacing](/docs/ref/UICloseLabel){:.block_link.class}
[**UIExpandedLabel**<br>A label that occupies as much space as possible](/docs/ref/UIExpandedLabel){:.block_link.class}
[**UIHeading1**<br>A heading label, level 1](/docs/ref/UIHeading1){:.block_link.class}
[**UIHeading2**<br>A heading label, level 2](/docs/ref/UIHeading2){:.block_link.class}
[**UIHeading3**<br>A heading label, level 3](/docs/ref/UIHeading3){:.block_link.class}
[**UIParagraph**<br>An expanded label with text that is wrapped across multiple lines when needed](/docs/ref/UIParagraph){:.block_link.class}

### Buttons

Button components are styled to appear interactive, in a number of different ways. The predefined styles used by each of these variants are customizable using [styles or themes](#styles).

[**UIButton**<br>Represents a button that can be clicked/tapped to perform an action](/docs/ref/UIButton){:.block_link.class}
[**UIBorderlessButton**<br>A button without a border or space around its label text](/docs/ref/UIBorderlessButton){:.block_link.class}
[**UIIconButton**<br>A button that contains a single icon](/docs/ref/UIIconButton){:.block_link.class}
[**UILargeButton**<br>A prominent button that is larger in size](/docs/ref/UILargeButton){:.block_link.class}
[**UILinkButton**<br>A button that is displayed as a hyperlink](/docs/ref/UILinkButton){:.block_link.class}
[**UIOutlineButton**<br>A button that has a colored outline](/docs/ref/UIOutlineButton){:.block_link.class}
[**UIPrimaryButton**<br>A prominent button that represents the primary action](/docs/ref/UIPrimaryButton){:.block_link.class}
[**UISmallButton**<br>A button that is smaller in size](/docs/ref/UISmallButton){:.block_link.class}

### Input elements

These components interact with a bound _form context_ component (a [`UIFormContext`](/docs/ref/UIFormContext) instance) to get and set input values dynamically. The initial value is taken either from a preset property or from the form context. Events are emitted when the user changes the current value, and changes are updated back to the form context instance.

[**UITextField**<br>Represents a text input field or multiline text area](/docs/ref/UITextField){:.block_link.class}
[**UIBorderlessTextField**<br>A text field without a border or space around its input text](/docs/ref/UIBorderlessTextField){:.block_link.class}
[**UIToggle**<br>Represents a check box or toggle switch](/docs/ref/UIToggle){:.block_link.class}

### Visual elements

[**UIImage**<br>Represents an image element](/docs/ref/UIImage){:.block_link.class}
[**UISeparator**<br>Represents a horizontal or vertical line separator](/docs/ref/UISeparator){:.block_link.class}
[**UISpacer**<br>A blank element, occupying as much space as possible, or a space of specific dimensions](/docs/ref/UISpacer){:.block_link.class}

## Layout and control {#layout-control}

UI elements such as buttons and labels can be laid out in two different ways:

- Positioned at a specific position determined by at least two coordinates (similar to CSS absolute positioning), or
- Positioned together with other components along the primary axis of a _container_, e.g. in a row or a column.

You can nest different types of containers to build more complex layouts. In addition, you can use [styles](#styles) (see below) to specify dimensions and other properties of a container.

### Cells

Cells are containers that allow for decoration of the space they occupy, using e.g. background colors, borders, and drop shadows.

By default, cells occupy as much space as possible (except for `UIFlowCell`), with content arranged top-to-bottom.

[**UICell**<br>Cell base class](/docs/ref/UICell){:.block_link.class}
[**UICoverCell**<br>Cell that is positioned to cover the exact dimensions of its parent container](/docs/ref/UICoverCell){:.block_link.class}
[**UIFlowCell**<br>Cell that does _not_ expand within its parent container; allows content to ‘flow’ vertically](/docs/ref/UIFlowCell){:.block_link.class}
[**UIScrollContainer**<br>Container that occupies a scrolling area, and emits scroll-related events](/docs/ref/UIScrollContainer){:.block_link.class}

### Rows and columns

Rows and columns are containers that arrange their content along a horizontal and vertical axis, respectively.

Content may be separated using fixed-width/height spacers (an 8-pixel gap is used by default, which is customizable as part of the [theme](#styles)), or separated using vertical/horizontal lines. 

By default, rows and columns occupy as little space in the cross-axis direction as possible (i.e. row height, and column width), although a specific height or width can be set.

[**UIRow**<br>Represents a horizontal line of UI elements](/docs/ref/UIRow){:.block_link.class}
[**UICenterRow**<br>A row that positions components in the center, horizontally](/docs/ref/UICenterRow){:.block_link.class}
[**UICloseRow**<br>A row without spacing between components](/docs/ref/UICloseRow){:.block_link.class}
[**UIOppositeRow**<br>A row that positions components at the end  (the right hand side, for left-to-right languages)](/docs/ref/UIOppositeRow){:.block_link.class}

[**UIColumn**<br>Represents a vertical line of UI elements](/docs/ref/UIColumn){:.block_link.class}
[**UICloseColumn**<br>A column without spacing between components](/docs/ref/UICloseColumn){:.block_link.class}

### Controller views

These elements don’t output their own elements on screen directly, but contain other elements that are _controlled_ by these components in different ways.

[**UIConditional**<br>Controls the display of a child component depending on the state of a boolean property](/docs/ref/UIConditional){:.block_link.class}
[**UIForm**<br>Encapsulates a `UICell` with child components, bound to a specific `UIFormContext` instance](/docs/ref/UIForm){:.block_link.class}
[**UIFormContextController**<br>Controls child components, bound to a specific `UIFormContext` instance](/docs/ref/UIFormContextController){:.block_link.class}
[**UIListCellAdapter**<br>Encapsulates a `UICell` with child components, bound to a specific list item](/docs/ref/UIListCellAdapter){:.block_link.class}
[**UIListController**<br>Controls a list of components, generated dynamically based on elements in another list](/docs/ref/UIListController){:.block_link.class}
[**UIMenu**<br>Generates a dropdown menu based on a list of options](/docs/ref/UIMenu){:.block_link.class}
[**UISelectionController**<br>Controls selection state among child components](/docs/ref/UISelectionController){:.block_link.class}
[**UIStyleController**<br>Applies a style to its child component depending on the state/value of a property](/docs/ref/UIStyleController){:.block_link.class}
[**UIViewRenderer**<br>Renders a referenced view component that is _not_ a direct child component](/docs/ref/UIViewRenderer){:.block_link.class}

## Styles and themes {#styles}

View components have a number of properties that can be used to change the appearance of the rendered output element; these can be either preset (using `with`) or changed dynamically on an existing component instance.

1. `style` property — an instance of [`UIStyle`](/docs/ref/UIStyle)
    * When preset, the styles from a given `UIStyle` object are _mixed into_ the current style of the preset component.
    * When preset as a _string_, styles from a named style in the current _theme_ (see below) are mixed in.
    * When set on an existing view component, the current `UIStyle` instance is replaced entirely, removing its existing styles.
2. Style overrides — objects with individual properties that _override_ the styles defined in the current `UIStyle` instance.
    * When preset _or_ set on an existing view component, the given properties are applied on top of the styles from the current `UIStyle` instance.

Note that the `style` property always refers to a `UIStyle` instance, whereas style overrides are (read-only) plain objects that expose individual settings — whether taken from the current `UIStyle` instance, or overridden by assigning a _new_ object to these properties.

Updating any of the individual properties of a style override object on an existing view component has no immediate effect, since only the override properties themselves are _observed_ by the component renderer.

[**UIStyle**<br>Encapsulates a set of style objects with properties that alter the appearance of a UI element](/docs/ref/UIStyle){:.block_link.class}

```jsx
// define a custom style (name is optional)
const myStyle = UIStyle.create("MyStyle", {
  textStyle: { bold: true },
});
const view = (
  <row>
    <button
      style={myStyle}
      decoration={{ background: "@yellow" }}
      onBeforeRender="setButtonStyle()"
    >
      Click me
    </button>
  </row>
);

class MyActivity extends ViewActivity.with(view) {
  // ...
  
  setButtonStyle(e: UIComponentEvent<UIButton>) {
    let btn = e.source;  // <= the button
    console.log(btn.textStyle.bold); // => true
    btn.dimensions = { minWidth: 200 };
  }
}
```

In this example:

1. The `myStyle` variable is set to a `UIStyle` instance, which only contains the ‘bold’ text style flag.
2. This style is preset on the `UIButton` constructor (i.e. the `<button>` JSX tag) — which means the bold flag is _mixed in_ with the regular styles for a button.
3. The `decoration` property is also preset, which means that these settings will be applied _on top of_ the `UIStyle` settings from `style` by the button renderer.
4. An event handler is added, which gets called right before the button is rendered. The event handler method of the activity is able to find a reference to the `UIButton` instance (_not_ constructor) and manipulate its properties.
5. The value of `btn.textStyle.bold` is true, because the `textStyle` object is directly taken from the button’s combined styles (after mixing in `myStyle`).
6. When the `dimensions` property is set to a new object, its style settings also get applied _on top of_ the `UIStyle` settings from `style` by the button renderer.
7. As a result, the button becomes yellow, 200px wide, with bold text.

### Style settings

Refer to the following interface definitions for a list of settings that are available on both `UIStyle` instances and overrides.

[**UIStyle.Dimensions**<br>Options for the dimensions of a view component](/docs/ref/UIStyle#UIStyle:Dimensions){:.block_link.interface}
[**UIStyle.Position**<br>Options for component positioning within parent component(s)](/docs/ref/UIStyle#UIStyle:Position){:.block_link.interface}
[**UIStyle.TextStyle**<br>Options for text styles](/docs/ref/UIStyle#UIStyle:TextStyle){:.block_link.interface}
[**UIStyle.Decoration**<br>Options for the appearance of UI elements and cell containers](/docs/ref/UIStyle#UIStyle:Decoration){:.block_link.interface}
[**UIStyle.ContainerLayout**<br>Options for layout of UI elements within a container](/docs/ref/UIStyle#UIStyle:ContainerLayout){:.block_link.interface}

### Measurements

All measurements may either be specified using ‘CSS units’ (i.e. strings that conform with one of the formats allowed by the CSS specification) _or_ using numbers that designate a length in ‘device-dependent pixels’ (dp). These are equivalent to physical pixels on a screen when not zoomed in or out, and may be scaled automatically on high-density displays.

```typescript
const view = UICell.with(
  { dimensions: { maxHeight: "50%" } },  // CSS units
  UIRow.with(
    { height: 48 },  // value in dp
    UIButton.with({
      label: "Click me",
      dimensions: { minWidth: 200 }  // value in dp
    })
  )
)
```

> **Note:** In Web applications, 1dp is defined as the equivalent of 1/16th of a `rem` unit. This value can be changed at runtime using the `BrowserApplication.setGlobalDpSize()` method, which scales all measurements up or down according to a given factor (defaults to 1), or by redefining the `font-size` CSS property of the `html` element.

### Colors

Color values may be specified in one of the following formats:

- A CSS value, e.g. `"blue"`, `"#1122AA"`, or `"rgba(0,0,0,0.5)"`.
- The name of a color that is defined in the current _theme_ (see below), preceded with an `@` sign — e.g. `"@blue"`, `"@yellow"`, or `"@slate"`; or one of the symbolic colors such as `"@primary"` `"@background"`, or `"@text"`.
- A theme color followed by an optional caret sign and a percentage, to darken or brighten the theme color by the given percentage — e.g. `"@green-20%"` (darken), `"@green+20%"` (lighten), `"@green^-20%"` (darken light colors, lighten dark colors), `"@green^+20%"` (lighten dark colors, darken light colors).
- A theme color followed by a slash and a percentage, to set the opacity of the resulting color — e.g. `"@green/80%"` for a green color with a transparency level of 20% (i.e. 80% opaque).
- A theme color followed by `.text`, which is replaced with a suitable text color (nearly black or nearly white) depending on the brightness of the theme color — e.g. `"@primary.text"`, or `"@green-10%.text"`.

```typescript
const greenBgStyle = UIStyle.create({
  decoration: {
    background: "@green",
    textColor: "@green.text"
    // ^ same as textStyle.color
  }
});
const view = UICell.with(
  { background: "@background" },
  UIRow.with(
    UIButton.with({
      label: "Click me",
      style: greenBgStyle
    })
  )
)
```

> **Note:** All default colors for UI elements are defined using combinations of `"@background"` and `"@text"` (which is itself defined as `"@background.text"`). This makes it possible to implement ‘dark mode’ by simply changing the `background` color value to a dark color, and a primary color that is relatively bright. Afterwards, call [`app.renderContext.emitRenderChange()`](/docs/ref/UIRenderContext#UIRenderContext:emitRenderChange) to re-render all visible view components using the new color values.

### Conditional styles (state)

You can include style settings that change the appearance of a UI element based on its current state without having to add event handlers. Use the [`addState`](/docs/ref/UIStyle#UIStyle:addState) method on a UIStyle` object to add _conditional_ styles.

[**UIStyle.addState()**<br>Add conditional styles to a `UIStyle` instance](/docs/ref/UIStyle#UIStyle:addState){:.block_link.method}

```typescript
const myStyle = UIStyle.create({
  textStyle: { bold: true },
}).addState("hover", {
  decoration: { background: "@primary" },
  textStyle: { italic: true, color: "@primary.text" }
});
```

The following states are available:

- `pressed` — used for buttons that are in ‘pressed’ state (while held down)
- `hover` — used for UI elements and cells that are current under the user’s mouse cursor
- `focused` — used for input elements and buttons (or any other focusable element) that currently has input focus
- `disabled` – used for input elements and buttons for which input has been disabled
- `selected` — used for UI elements and cells that have emitted a `Select` event, and have not yet emitted a `Deselect` event (often used together with the `UISelectionController` class, which emits `Deselect` events on the currently selected component as soon as another element emits a `Select` event).

### Style groups

You can avoid creating separate variables for each `UIStyle` instance by creating _style groups_. These are sets of related styles, that are defined using a call to [`UIStyle.group`](/docs/ref/UIStyle#UIStyle:group).

This method accepts an object with style names as properties, and `UIStyle` instances _or_ plain objects as values. Additionally, existing groups can be _extended_ by including them as an argument as well.

[**UIStyle.group()**<br>Create a style group with a given set of styles and/or other groups](/docs/ref/UIStyle#UIStyle:group){:.block_link.method}

```typescript
// create a style group
const bannerStyles = UIStyle.group({
  banner: {
    decoration: { background: "@primary" }
  },
  bannerButton: UIStyle.create({
    decoration: { background: "@primary^-20%" }
  }).addState("hover", {
    decoration: { background: "@primary^-30%" }
  })
});

// extend this style group
const fancyBannerStyles = UIStyle.group(
  bannerStyles,
  {
    bannerButton: {
      textStyle: { fontFamily: "serif" }
    }
  }
);

// use styles from this group
const view = UIRow.with(
  { style: fancyBannerStyles.banner },
  UIButton.with({
    label: "Foo",
    style: fancyBannerStyles.bannerButton
  })
)
```

### Themes

A _theme_ is an instance of the [`UITheme`](/docs/ref/UITheme) class. The current theme is referenced by the static [`UITheme.current`](/docs/ref/UITheme#UITheme:current) property.

To change the default appearance of all components, colors, icons, and other style defaults, set the `current` property to a new `UITheme` instance. You can copy the current theme using the [`clone()`](/docs/ref/UITheme#UITheme:clone) method.

[**UITheme**<br>Represents a set of default styles and component presets](/docs/ref/UITheme){:.block_link.class}

```typescript
const defaultTheme = UITheme.current.clone();
const darkTheme = UITheme.current.clone();
darkTheme.colors["background"] = "#222";
darkTheme.colors["primary"] = "@green";

let dark = false;
function switchTheme() {
  if (dark) UITheme.current = defaultTheme;
  else UITheme.current = darkTheme;
  dark = !dark;
  
  // trigger re-rendering of all components:
  Application.active.first()?.renderContext?.emitRenderChange();
}
```

## Custom views {#custom}

There are a few different approaches for creating views that can be reused throughout an application.

### Using a preset constructor

The simplest approach to creating reusable views is to define a preset constructor, and use it as-is.

```typescript
// create a special button constructor that can be reused
const MyButton = UIButton.with({
  style: UIStyle.create("FancyButton", {
    textStyle: { fontFamily: "serif" }
  })
});

// ...elsewhere:
const view = UIRow.with(
  MyButton.withLabel("Click me")
); 
```

You can also extend the preset constructor into a class, if needed.

```typescript
class MyButton extends UIButton.with({ style: myStyle }) {
  label = "Click to show the time";
  updateLabel() { this.label = String(new Date()) }
}
MyButton.addObserver(class {
  constructor (public button: MyButton) { }
  onClick() { this.button.updateLabel() }
});

// ...elsewhere:
const view = UIRow.with(
  MyButton
);
```

### Using a view activity

Sometimes it may be appropriate to define a new _activity_ class to encapsulate a reusable view. For example, a modal dialog can be displayed independently of other views — in this case, the [`DialogViewActivity`](/docs/ref/DialogViewActivity) class provides all of the required functionality.

```jsx
const dialogView = (
  <flowcell
    background="@background"
    textColor="@text"
    padding={16}
    position={{ gravity: "center" }}
  >
    <centerrow>
      <label>Hello, {bind("name")}!</label>
    </centerrow>
  </flowcell>
);

class MyDialogActivity extends DialogViewActivity.with(dialogView) {
  public name?: string;
}

let dialog = new MyDialogActivity();
dialog.name = "world";
setTimeout(() => {
  Application.active.first()?.showViewActivityAsync(dialog);
}, 100);
```

### Using a `ViewComponent` class

In most other cases, whenever you need custom binding properties but not an entire activity, reusable views can be implemented as a preset [`ViewComponent`](/docs/ref/ViewComponent) constructor.

This has the added advantage of enabling code completion for preset properties, and allowing for nested content — for code in both JSX and native JavaScript syntax.

[**ViewComponent**<br>Represents a custom view component](/docs/ref/ViewComponent){:.block_link.class}

```jsx
class MyView extends ViewComponent.with({
  view: (
    <flowcell padding={16} onClick="cellClicked()">
      <centerrow>
        <label>Hello, {bind("name")}!</label>
      </centerrow>
      <separator />
      <viewcontent />
    </flowcell>
  ),
  defaults: {
    name: ""  // this becomes a property
  }
}) {
  cellClicked() {
    this.name = "Clicked";
  }
}

// ...elsewhere:
const view = (
  <cell>
    <MyView name="World">
      <row>
        <label>Content goes here</label>
      </row>
    </MyView>
  </cell>
);
```

---
### Next steps

Learn more about the other parts of a Typescene application:

* [`Activities`](/docs/concepts/activities) encapsulate views and display them when activated.
* [`Services`](/docs/concepts/services) encapsulate global state (data), made available to all other components.

