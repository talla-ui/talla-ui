# ViewComponent

#### Example

```typescript
class MyView extends ViewComponent.with({
  // view declaration goes here, JSX is allowed too:
  view: UICell.with(
    UIRow.with(UIButton.withLabel("Click me", "+ButtonClicked")),
    // include content like so:
    UIViewRenderer.withBoundContent()
  ),

  // optional list of properties that can be preset, and default values:
  defaults: {
    foo: "bar",
  },

  // optional list of properties that will contain preset content
  // in the order in which they can be preset (default is 'content')
  content: ["content"],

  // optional event handler (useful if not using a class)
  event(e) {
    // ... handle events here
  },
}) {
  onButtonClicked(e: UIComponentEvent<UIButton>) {
    // ... or handle events individually here
  }

  // any other class methods, constructor etc. can go here ...
}

// use the above class as follows (or use JSX syntax) --
const view = UICell.with(
  // ...
  MyView.with({ foo: "xyz" }, UIRow.with(/* ... */))
);
```

---

# ViewComponent.with

> **Note:** The `ViewComponent` class overrides the standard `Component.with` method to be able to return a type that is compatible with JSX syntax, while remaining compatible with the original type. Common usage is more straightforward than the type definition suggests -- refer to the example above.
