# UIComponent:pageintro

This is the base class of all UI (view) components.

---

# UIComponent

> **Note:** This class should not be instantiated on its own. Instead, use one of the predefined UI components such as `UIButton` and `UILabel`, or create your own view component using the `ViewComponent` class.

[**See also:** Concepts &gt; Views](/docs/concepts/views){:.block_link.doc}

---

# UIBeforeRenderEvent

> **Note:** The `UIBeforeRenderEvent` is emitted only once, **before** a component is rendered the first time, and can be observed using an `onBeforeRender` preset handler property. By contrast, a plain `UIComponentEvent` is emitted **each time after** a UI component is rendered, i.e. whenever a change occurs to its display properties (or its child components'), which can be observed using an `onRendered` preset handler property.

---

# UIComponentEvent

> **Note:** To emit this event on a UI component, use the `UIComponent.propagateComponentEvent` method.

---

# UIFocusRequestEvent

> **Note:** This event is emitted by the `UIComponent.requestFocus` method, and should not be emitted directly by the application.
