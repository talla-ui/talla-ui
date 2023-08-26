# Component:pageintro

Components are the building blocks of a Typescene application.

---

# Component

[**See also:** Concepts &gt; Components](/docs/concepts/components){:.block_link.doc}

---

# ComponentConstructor

This type is used to define parameters of `Component.preset`.

#### Example

```typescript
export class Application extends Component {
  static preset(
    presets: Application.Presets,
    ...activities: Array<ComponentConstructor | undefined>
  ): Function {
    // ... use preset activities here
  }
  // ...
}
```

---

# ComponentEventHandler

> **Note:** This type is used to declare event handlers on preset types, in places where both a string (e.g. `"+MyEvent"`) or a function is allowed.

---

# bind

#### See Also

`bindf`, `Binding.addFilter` (includes a list of available filters)

---

# bindf

#### See Also

`bind`, `Binding.addFilter` (includes a list of available filters)
