---
title: Using scroll containers
abstract: Understand how scroll containers can be used as part of your application UI
sort: -10
nav_uplink: {@link UIScrollContainer}
applies_to:
  - UIScrollContainer
assets:
  - sample-single.js
---

## Definition {#definition}

Scroll containers are represented by the {@link UIScrollContainer} class, which inherits functionality from the {@link UIContainer} and {@link UIComponent} abstract classes.

- {@ref UIScrollContainer}
- {@ref UIContainer}
- {@ref UIComponent}

## Appearance {#appearance}

A scroll container contains other components which are arranged along a vertical (or horizontal) axis. When the space taken up by the content components is larger than the space taken up by the container itself, the user is allowed to scroll the content within the container.

Note that this means that the container's dimensions must be limited in the direction of scroll — otherwise the container itself will simply grow to accommodate its contents. To do this, set the `width`, `height`, `maxWidth`, or `maxHeight` properties of the {@link UIStyle.Definition.Dimensions dimensions} style object, and make sure `grow` is set to 0 to avoid expanding in the direction of the _parent_ container's primary axis.

Alternatively, wrap the scroll container inside of a non-scrolling container (such as a {@link UICell}) that has fixed dimensions, or has its `gravity` style property (in the {@link UIComponent.position position} object or {@link UIComponent.style style} instance) set to `cover`.

<!--{{iframesample js="./sample-single.js"}}-->

Like all views, scroll containers are often defined statically, rather than being instantiated directly using the {@link UIScrollContainer} constructor. This way, both the properties of the container itself and the included content (a list of more preset view classes) can be defined.

```ts
const months = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];
const view = UIScrollContainer.with(
		{ dimensions: { width: 300, height: 180, grow: 0 } },
		UIList.with(
			{ items: months },
			UIRow.with(UILabel.withText(bound.string("item")))
		)
	)
);
```

```jsx
// or, using JSX syntax:
<scrollcontainer dimensions={{ width: 300, height: 180, grow: 0 }}>
	<list items={months}>
		<row>
			<label>%[item]</label>
		</row>
	</list>
</scrollcontainer>
```

Scroll container dimensions, position, and layout styles are customizable, either using {@link UITheme} styles or using any of the style properties of the container itself.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/guide/Styles"}}-->

## Scroll events and methods {#scroll}

When the user interacts with a scroll container, scroll events are emitted to indicate the current scroll position. The position can be used in calls to {@link UIScrollContainer.scrollTo()} later, or interpreted using boolean properties (at top, bottom, left, or right).

Scroll events (Scroll and ScrollEnd) include a `data` object property with the following type.

- {@ref UIScrollContainer.ScrollEventData}

The included `xOffset` and `yOffset` values are platform dependent (i.e. pixels, or some other unit relative to the viewport), but can be saved in order to scroll back to the same position later.

The included boolean properties are platform independent. These are affected by the threshold values set on the UI container itself, if any:

- {@ref UIScrollContainer.topThreshold}
- {@ref UIScrollContainer.bottomThreshold}
- {@ref UIScrollContainer.horizontalThreshold}

To scroll to the very top or bottom of a container, use the following methods:

- {@ref UIScrollContainer.scrollToTop}
- {@ref UIScrollContainer.scrollToBottom}

## Preset properties {#presets}

The following properties can be preset using `UIScrollContainer.with({ ... })` or JSX `<scrollcontainer ...>`.

| Property                                                                  | Type                                                                 |
| :------------------------------------------------------------------------ | :------------------------------------------------------------------- |
| {@link UIComponent.style style}                                           | Instance of {@link UIStyle} or a theme style name starting with `@`  |
| {@link UIComponent.dimensions dimensions}                                 | An object with {@link UIStyle.Definition.Dimensions} properties      |
| {@link UIComponent.position position}                                     | An object with {@link UIStyle.Definition.Position} properties        |
| {@link UIContainer.layout layout}                                         | An object with {@link UIStyle.Definition.ContainerLayout} properties |
| {@link UIComponent.hidden hidden}                                         | Boolean, or binding                                                  |
| {@link UIComponent.accessibleRole accessibleRole}                         | String, or binding                                                   |
| {@link UIComponent.accessibleLabel accessibleLabel}                       | String, or binding                                                   |
| {@link UIContainer.distribution distribution}                             | String, or binding                                                   |
| {@link UIContainer.padding padding}                                       | Number, string with CSS unit, {@link UIStyle.Offsets}, or binding    |
| {@link UIContainer.spacing spacing}                                       | Number, string with CSS unit, or binding                             |
| {@link UIContainer.asyncContentRendering asyncContentRendering}           | True if content may be rendered asynchronously                       |
| {@link UIScrollContainer.topThreshold topThreshold}                       | Number, string with CSS unit, or binding                             |
| {@link UIScrollContainer.bottomThreshold bottomThreshold}                 | Number, string with CSS unit, or binding                             |
| {@link UIScrollContainer.horizontalThreshold horizontalThreshold}         | Number, string with CSS unit, or binding                             |
| {@link UIScrollContainer.verticalScrollEnabled verticalScrollEnabled}     | Boolean                                                              |
| {@link UIScrollContainer.horizontalScrollEnabled horizontalScrollEnabled} | Boolean                                                              |

## Events {#events}

The following events are emitted by UIScrollContainer objects, and can be preset.

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
| Scroll             | Emitted periodically while scrolling, see above                      |
| ScrollEnd          | Emitted after a scroll gesture has completed, see above              |
