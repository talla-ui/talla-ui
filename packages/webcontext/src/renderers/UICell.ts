import { onPropertyChange, UICell } from "typescene";
import { applyElementCSS } from "../DOMStyle";

class UICellRenderer {
  constructor(public component: UICell) {}

  /** Handle additional cell style changes */
  @onPropertyChange(
    "css",
    "decoration",
    "margin",
    "background",
    "textDirection",
    "textColor",
    "borderThickness",
    "borderColor",
    "borderStyle",
    "borderRadius",
    "dropShadow",
    "opacity"
  )
  updateStyle() {
    if (this._sched) return;
    let elt = this.component.lastRenderOutput?.element;
    if (!elt) return;
    this._sched = true;
    Promise.resolve().then(() => {
      this._sched = false;
      applyElementCSS(this.component, elt);
    });
  }
  private _sched?: boolean;
}

UICell.addObserver(UICellRenderer);
