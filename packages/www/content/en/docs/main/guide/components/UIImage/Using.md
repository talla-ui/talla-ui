---
title: Using image controls
abstract: Understand how images can be used as part of your application UI
sort: -10
nav_uplink: {@link UIImage}
applies_to:
  - UIImage
assets:
  - sample-single.js
---

## Definition {#definition}

Image components are represented by the {@link UIImage} class, which inherits functionality from the {@link UIControl} and {@link UIComponent} abstract classes.

- {@ref UIImage}
- {@ref UIControl}
- {@ref UIComponent}

## Appearance {#appearance}

An image control appears as a single image, optionally with decoration styles such as a border or dropshadow.

<!--{{iframesample js="./sample-single.js" }}-->

Like all views, image components are often defined statically, rather than being instantiated directly using the {@link UIImage} constructor.

```ts
const view = UIImage.with({
	url: "/assets/logo.png",
	decoration: { dropShadow: 0.5 },
});
```

```jsx
// or, using JSX syntax:
<img url="/assets/logo.png" decoration={{ dropShadow: 0.5 }} />
```

Decorations dimensions, and position are customizable, either using {@link UITheme} styles or using any of the style properties of the control itself.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/guide/Styles"}}-->

## Preset properties {#presets}

The following properties can be preset using `UIImage.with({ ... })` or JSX `<img ...>`.

| Property                                              | Type                                                                |
| :---------------------------------------------------- | :------------------------------------------------------------------ |
| {@link UIComponent.style style}                       | Instance of {@link UIStyle} or a theme style name starting with `@` |
| {@link UIComponent.dimensions dimensions}             | An object with {@link UIStyle.Definition.Dimensions} properties     |
| {@link UIComponent.position position}                 | An object with {@link UIStyle.Definition.Position} properties       |
| {@link UIControl.textStyle textStyle}                 | An object with {@link UIStyle.Definition.TextStyle} properties      |
| {@link UIControl.decoration decoration}               | An object with {@link UIStyle.Definition.Decoration} properties     |
| {@link UIComponent.hidden hidden}                     | Boolean, or binding                                                 |
| {@link UIComponent.accessibleRole accessibleRole}     | String, or binding                                                  |
| {@link UIComponent.accessibleLabel accessibleLabel}   | String, or binding                                                  |
| {@link UIControl.disabled disabled}                   | Boolean, or binding                                                 |
| {@link UIControl.shrinkwrap shrinkwrap}               | Boolean, or binding                                                 |
| {@link UIImage.url url}                               | String, {@link LazyString}, or binding                              |
| {@link UIImage.allowFocus allowFocus}                 | True to allow the image to receive input focus                      |
| {@link UIImage.allowKeyboardFocus allowKeyboardFocus} | True to allow the image to receive input focus using the keyboard   |
| requestFocus                                          | True to request focus immediately after first render                |

Note that {@link UIImage} also provides the following methods.

- {@ref UIImage.withUrl}

## Events {#events}

The `LoadError` event is emitted when an attempt to load the image from the provided URL has failed. This event may be handled to change the URL to another image, or show an error to the user.

The following events are emitted by UIImage objects, and can also be preset.

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
| LoadError          | Emitted when loading the image has failed                            |
