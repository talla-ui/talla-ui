import {
  onPropertyChange,
  UIFocusRequestEvent,
  UIRenderEvent,
  UITextField,
} from "typescene";
import { applyElementCSS } from "../DOMStyle";
import { RendererBase } from "./RendererBase";

class UITextFieldRenderer extends RendererBase<
  UITextField,
  HTMLInputElement | HTMLTextAreaElement
> {
  constructor(public component: UITextField) {
    super(component);
    this.DOM_CONTROL_EMIT = this.DOM_EMIT;
  }

  /** Create output element, used by base class */
  protected createElement() {
    let element = document.createElement(this.component.multiline ? "textarea" : "input");
    element.tabIndex = this.component.isKeyboardFocusable() ? 0 : -1;
    if (!this.component.multiline) {
      (element as HTMLInputElement).type = this.component.type;
    }
    element.placeholder = String(this.component.placeholder || " "); // layout workaround
    let value = this.component.value;
    element.value = value == null ? "" : String(value);
    if (this.component.name) element.name = this.component.name;
    if (this.component.disabled) element.disabled = true;
    if (this.component.enterKeyHint) element.enterKeyHint = this.component.enterKeyHint;
    applyElementCSS(this.component, element, true);
    return element;
  }

  /** Called when emitting a UI event: update component value first */
  emitComponentEvent(e: Event) {
    let element = this.getElement();
    if (element) {
      this.component.value = element.value;
    }
    super.emitComponentEvent(e);
  }

  /** Handle render event */
  onUIRender(e: UIRenderEvent<UITextField>) {
    this.handleRenderEvent(e);
  }

  /** Handle focus requests */
  onUIFocusRequestAsync(e: UIFocusRequestEvent<UITextField>) {
    this.handleFocusRequestEvent(e);
  }

  /** Handle multiline/single line changes */
  onMultilineChange() {
    if (this.isRendered()) {
      this.updateElement(this.createElement());
    }
  }

  /** Handle control changes */
  @onPropertyChange("name", "value", "type", "placeholder", "enterKeyHint")
  updateControl() {
    let element = this.getElement();
    if (element) {
      let placeholder = String(this.component.placeholder || " "); // layout workaround
      if (element.placeholder !== placeholder) {
        element.placeholder = placeholder;
      }
      if (!this.component.multiline && element.type !== this.component.type) {
        (element as HTMLInputElement).type = this.component.type;
      }
      if (this.component.name) element.name = this.component.name;
      if (this.component.enterKeyHint) element.enterKeyHint = this.component.enterKeyHint;

      // update value asynchronously if it was set programmatically
      let value = this.component.value;
      value = value == null ? "" : String(value);
      if (element.value != value) element!.value = value;
    }
  }

  /** Handle disabled state */
  onDisabledChange() {
    let element = this.getElement();
    if (element) element.disabled = !!this.component.disabled;
  }

  /** Handle style changes */
  @onPropertyChange(
    "hidden",
    "style",
    "shrinkwrap",
    "textStyle",
    "decoration",
    "dimensions",
    "position"
  )
  updateStyle() {
    this.scheduleStyleUpdate();
  }
}

UITextField.addObserver(UITextFieldRenderer);
