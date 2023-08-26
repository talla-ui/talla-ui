---
template: doc_guide
output: docs/guides/ui-text-labels.html
parent: content/en/docs/guides/ui/index
title: Displaying text using label components
description: |
  Static text can be displayed using label components
pageintro: |
  The UILabel component can be used to display text.
---

<section>

**Step 1**<br>
Make sure your activity references the correct view component.

</section>

```typescript
import { view } from "./view";

class MainActivity extends PageViewComponent.with(view) {
  // ... activity methods
}
```

---

<section>

**Step 2 (JSX)**<br>
Add a label somewhere in your view, and add the text between the `<label>` and `</label>` tags.

</section>

```jsx
// view.tsx
export default (
  <cell>
    <centerrow>
      <label>Text goes here</label>
    </centerrow>
  </cell>
);
```

---

<section>

**Alternative (without JSX)**<br>
Use the static `UILabel.withText()` method to create a component factory for a label that contains given text.

</section>

```typescript
// view.ts
export default UICell.with(
  UICenterRow.with(UILabel.withText("Text goes here"))
);
```

---

<footer>

### Next

{{guides:content/en/docs/guides/ui/text-labels/text-bindings}}

## See also

- [`UILabel`](/docs/ref/UILabel) class reference documentation.
- Other types of label components.

</footer>
