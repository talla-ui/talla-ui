---
title: Using containers
abstract: Get an understanding of UI containers, layout, and content rendering
sort: -5
nav_uplink: {@link UIContainer}
applies_to:
  - UIComponent
  - UIContainer
  - UICell
  - UIRow
  - UIColumn
  - UIForm
  - UIScrollContainer
---

## Overview: UIContainer class {#class}

- {@ref UIContainer}

The {@link UIContainer} class provides common functionality for all UI container components, and it not used on its own. All common properties and events (presets) are included in the descriptions of the UI container components listed below.

### Container layout {#layout}

All container components can be used to contain other components visually. The options for laying out components within the available area of a container are based on the **CSS flexbox** model, including the following concepts (with slightly different names from the CSS model).

- **Axis** — The primary axis of a container determines whether multiple components are placed next to each other (horizontally) or on top of each other (vertically).
- **Distribution** — This determines how components are placed _along_ the primary axis, e.g. at the start, end, or spread out.
- **Gravity** — This determines how components are placed on the _perpendicular_ axis.
- **Wrapping** — This can be enabled to create layouts that wrap elements across multiple lines along the primary axis when needed (e.g. turning a row container into a grid with components laid out horizontally first, then vertically).
- **Spacing** or **separators** — Either a space or a separator line can be inserted automatically _between_ components within a container, along the primary axis, reducing the need to add padding or margin to every component in a row or column.

All layout options are contained in the {@link UIStyle.Definition.ContainerLayout ContainerLayout} object type, which is part of {@link UIStyle} objects. Additionally, the {@link UIContainer.layout}, {@link UIContainer.distribution}, and {@link UIContainer.spacing} properties can be used to override these options directly.

## Using container components {#components}

Typically, on-screen UI components are laid out using {@link UIRow} and {@link UIColumn} containers, which stack contents horizontally and vertically, respectively. In addition, for more control over the appearance of the container _itself_, {@link UICell} containers can be used, which conveniently expose several style properties.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/guide/components/UICell/Using"}}-->
- <!--{{pagerefblock path="content/en/docs/main/guide/components/UIRow/Using"}}-->
- <!--{{pagerefblock path="content/en/docs/main/guide/components/UIScrollContainer/Using"}}-->

## Grouping other content {#controllers}

To display content that'sn't static, use components that wrap lists or forms.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/guide/List views"}}-->
- <!--{{pagerefblock path="content/en/docs/main/guide/Forms"}}-->
