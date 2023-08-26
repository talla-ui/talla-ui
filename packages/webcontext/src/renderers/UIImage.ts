import {
  onPropertyChange,
  UIComponentEvent,
  UIFocusRequestEvent,
  UIImage,
  UIRenderEvent,
} from "typescene";
import { applyElementCSS } from "../DOMStyle";
import { RendererBase } from "./RendererBase";

class UIImageRenderer extends RendererBase<UIImage, HTMLImageElement> {
  constructor(public component: UIImage) {
    super(component);
    this.DOM_CONTROL_EMIT = this.DOM_EMIT;
  }

  /** Create output element, used by base class */
  protected createElement() {
    let element = document.createElement("img");
    element.onerror = e => {
      if (this.component.managedState) {
        this.component.emit(UIComponentEvent, "LoadError", this.component, undefined, e);
      }
    };
    if (this.component.isKeyboardFocusable()) element.tabIndex = 0;
    else if (this.component.isFocusable()) element.tabIndex = -1;
    applyElementCSS(this.component, element, true);
    element.src = String(this.component.url || "");
    return element;
  }

  /** Handle render event */
  onUIRender(e: UIRenderEvent<UIImage>) {
    this.handleRenderEvent(e);
  }

  /** Handle focus requests */
  onUIFocusRequestAsync(e: UIFocusRequestEvent<UIImage>) {
    this.handleFocusRequestEvent(e);
  }

  /** Handle URL change */
  onUrlChange() {
    let element = this.getElement();
    if (element) element.src = String(this.component.url || "");
  }

  /** Handle style changes */
  @onPropertyChange(
    "hidden",
    "style",
    "shrinkwrap",
    "disabled",
    "textStyle",
    "decoration",
    "dimensions",
    "position"
  )
  updateStyle() {
    this.scheduleStyleUpdate();
  }
}

UIImage.addObserver(UIImageRenderer);
