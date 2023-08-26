import { onPropertyChange, UIRenderEvent, UISeparator } from "typescene";
import { applyElementCSS, getCSSLength } from "../DOMStyle";
import { RendererBase } from "./RendererBase";

class UISeparatorRenderer extends RendererBase<UISeparator, HTMLElement> {
  constructor(public component: UISeparator) {
    super(component);
  }

  /** Create output element, used by base class */
  protected createElement() {
    let element = document.createElement("hr");
    let addClass =
      "UIRender__Separator--line" +
      (this.component.vertical ? " UIRender__Separator--line-vertical" : "");
    applyElementCSS(this.component, element, true, addClass);
    if (this.component.margin) {
      let margin = getCSSLength(this.component.margin);
      element.style.margin = this.component.vertical ? "0 " + margin : margin + " 0";
    }
    return element;
  }

  /** Handle render event */
  onUIRender(e: UIRenderEvent<UISeparator>) {
    this.handleRenderEvent(e);
  }

  /** Handle style changes */
  @onPropertyChange(
    "hidden",
    "style",
    "vertical",
    "dimensions",
    "color",
    "thickness",
    "margin",
    "position"
  )
  updateStyle() {
    this.scheduleStyleUpdate(
      "UIRender__Separator--line" +
        (this.component.vertical ? " UIRender__Separator--line-vertical" : "")
    );
  }
}

UISeparator.addObserver(UISeparatorRenderer);
