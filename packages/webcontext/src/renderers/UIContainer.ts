import {
  ComponentEvent,
  onPropertyChange,
  UICell,
  UIColumn,
  UIComponent,
  UIComponentEvent,
  UIContainer,
  UIFocusRequestEvent,
  UIRenderEvent,
  UIRow,
  UIScrollContainer,
  UIScrollEvent,
  UIScrollTargetEvent,
  UIStyle,
} from "typescene";
import { DOMRenderContext } from "../DOMRenderContext";
import { applyElementCSS } from "../DOMStyle";
import { DOMContainerUpdater } from "./DOMContainerUpdater";
import { RendererBase } from "./RendererBase";

/** Type for containers that have a `spacing` property */
type UIContainerWithSpacing = UIRow | UIColumn;

/** Cache for separator options based on spacing and directionality; note that there is a chance of a memory leak here if there are many different combinations in use, however in real apps this should never be the case so optimize for speed here */
const _separators: { [spacingAndDir: string]: UIStyle.SeparatorOptions } = {};

/** Helper function to determine if a container needs spacing between components */
function hasComponentSpacing(container: UIContainer): container is UIContainerWithSpacing {
  return (
    typeof (container as UIContainerWithSpacing).hasComponentSpacing === "function" &&
    (container as UIContainerWithSpacing).hasComponentSpacing()
  );
}

class UIContainerRenderer extends RendererBase<UIContainer, HTMLElement> {
  constructor(component: any) {
    super(component);
    this.component = component;
    if (component instanceof UICell) {
      this.DOM_CELL_EMIT = this.DOM_EMIT;
    }
  }

  component: UIContainer;

  /** Create output element, used by base class */
  protected createElement() {
    let element = document.createElement(
      this.component.accessibleRole === "form" ? "form" : "container"
    );
    if (this.component.isKeyboardFocusable()) element.tabIndex = 0;
    else if (this.component.isFocusable()) element.tabIndex = -1;
    applyElementCSS(this.component, element, true);
    return element;
  }

  /** Called after rendering: add base event handlers */
  protected afterRender() {
    super.afterRender();
    if (!this.component.managedState) return;

    // capture scroll events on scroll containers
    if (this.component instanceof UIScrollContainer) {
      let scrollContainer = this.component;
      if (this.isRendered()) {
        let element = this.getElement()!;
        let lastTop = 0;
        let lastLeft = 0;
        let lastEventT = 0;
        let lastT = Date.now();
        let pending = false;
        let wentUp: boolean | undefined;
        let wentDown: boolean | undefined;
        let wentXStart: boolean | undefined;
        let wentXEnd: boolean | undefined;
        let checkAndEmit = () => {
          let tDiffSec = (Date.now() - lastT) / 1000;
          let vertDist = element.scrollTop - lastTop;
          let horzDist = Math.abs(element.scrollLeft) - Math.abs(lastLeft);
          if (vertDist < 0) wentDown = !(wentUp = true);
          if (vertDist > 0) wentDown = !(wentUp = false);
          if (horzDist < 0) wentXEnd = !(wentXStart = true);
          if (horzDist > 0) wentXEnd = !(wentXStart = false);
          lastTop = element.scrollTop;
          lastLeft = element.scrollLeft;
          lastT = Date.now();
          const makeEvent = (name: string) => {
            let event = new UIScrollEvent(name, scrollContainer);
            event.yOffset = lastTop;
            event.xOffset = lastLeft;
            lastLeft = Math.abs(lastLeft);
            event.scrolledDown = wentDown;
            event.scrolledUp = wentUp;
            event.scrolledHorizontalStart = wentXStart;
            event.scrolledHorizontalEnd = wentXEnd;
            event.atTop = lastTop <= scrollContainer.topThreshold;
            event.atHorizontalStart = lastLeft <= scrollContainer.horizontalThreshold;
            event.atBottom =
              lastTop + element.clientHeight >=
              element.scrollHeight - scrollContainer.bottomThreshold;
            event.atHorizontalEnd =
              lastLeft + element.clientWidth >=
              element.scrollWidth - scrollContainer.horizontalThreshold;
            event.verticalVelocity =
              Math.abs(vertDist / (window.innerHeight || 1)) / (tDiffSec || 0.1);
            event.horizontalVelocity =
              Math.abs(horzDist / (window.innerWidth || 1)) / (tDiffSec || 0.1);
            return event.freeze();
          };
          if (scrollContainer.managedState) {
            scrollContainer.emit(makeEvent("Scroll"));
            if (lastEventT < lastT - 200) {
              scrollContainer.emit(makeEvent("ScrollEnd"));
              pending = false;
            } else {
              setTimeout(checkAndEmit, 250);
              pending = true;
            }
          }
        };
        element.onscroll = (e: Event) => {
          lastEventT = Date.now();
          if (!pending) checkAndEmit();
        };
      }
    }
  }

  /** Handle render event */
  onUIRender(e: UIRenderEvent<UIContainer>) {
    this.handleRenderEvent(e);
    this._separator = this._getSeparator();
    this._refreshUpdater();
  }

  /** Handle focus requests */
  onUIFocusRequestAsync(e: UIFocusRequestEvent<UIContainer>) {
    this.handleFocusRequestEvent(e);
  }

  /** Switch tabindex on focus */
  onFocusIn(e: UIComponentEvent) {
    if (e.source !== this.component && this.component.isKeyboardFocusable()) {
      // temporarily disable keyboard focus on this parent
      // to prevent shift-tab from selecting this element
      let element = this.getElement();
      if (element) element.tabIndex = -1;
      this.lastFocused = e.source;
    }
  }

  /** Last focused component, if this container is keyboard-focusable */
  lastFocused?: UIComponent;

  /** Switch tabindex back on blur */
  onFocusOut(e: UIComponentEvent) {
    if (e.source !== this.component && this.component.isKeyboardFocusable()) {
      // make this parent focusable again
      let element = this.getElement();
      if (element) element.tabIndex = 0;
      this.lastFocused = undefined;
    }
  }

  /** Scroll to top/bottom or coordinates */
  onUIScrollTarget(e: UIScrollTargetEvent) {
    let element = this.getElement();
    if (element) {
      if (e.target === "top") element.scrollTo({ top: 0 });
      if (e.target === "bottom") element.scrollTo({ top: element.scrollHeight });
      if (e.yOffset !== undefined) element.scrollTo({ top: e.yOffset });
      if (e.xOffset !== undefined) element.scrollTo({ left: e.xOffset });
    }
  }

  /** Handle content changes asynchronously */
  async onContentChangeAsync() {
    if (!this.component.content) {
      if (this._updater) {
        this._updater.stop();
        this._updater = undefined;
      }
      return;
    }
    if (this._updater) {
      // update container content
      this._updater.update(this.component.content);
    }

    // reset tabindex if needed
    if (
      this.component.isKeyboardFocusable() &&
      this.lastFocused &&
      !this.component.content.includes(this.lastFocused)
    ) {
      let element = this.getElement();
      if (element) element.tabIndex = 0;
      this.lastFocused = undefined;
    }
  }

  /** Handle async on/off */
  onAsyncContentRenderingChange() {
    if (this._updater) {
      this._updater.setAsyncCreate(this.component.asyncContentRendering);
    }
  }

  /** Handle animation time changes */
  onAnimatedContentRenderingDurationChange() {
    if (this._updater) {
      this._updater.setAnimationTimeMs(
        this.component.animatedContentRenderingDuration || 0
      );
    }
  }

  /** Handle animation speed changes */
  onAnimatedContentRenderingVelocityChange() {
    if (this._updater) {
      this._updater.setAnimationSpeed(this.component.animatedContentRenderingVelocity || 0);
    }
  }

  /** Handle style changes */
  @onPropertyChange(
    "hidden",
    "style",
    "layout",
    "spacing",
    "dimensions",
    "position",
    "padding",
    "height",
    "width",
    "verticalScrollEnabled",
    "horizontalScrollEnabled"
  )
  updateStyle() {
    this.scheduleStyleUpdate();

    // check if need to refresh updater with different separator
    let separator = this._getSeparator();
    if (this._separator !== separator) {
      this._separator = separator;
      this._refreshUpdater();
    }
  }

  /** Handle scroll snapping */
  onScrollEnd(e: UIComponentEvent) {
    let element = this.getElement();
    if (element && this.component instanceof UIScrollContainer) {
      let container = this.component;
      let rect = element.getBoundingClientRect();
      let focused = document.activeElement;
      let rects: ClientRect[] = [];
      let focusedRect: ClientRect | undefined;
      let cur = element.firstChild;
      while (cur) {
        if ((cur as any).getBoundingClientRect) {
          let r = (cur as HTMLElement).getBoundingClientRect();
          if (r.bottom > rect.top && r.top < rect.bottom) {
            if (cur === focused) focusedRect = r;
            rects.push(r);
          }
        }
        cur = cur.nextSibling;
      }
      if (
        e.name === "ScrollEnd" ||
        e.name === "ScrollSnapUp" ||
        e.name === "ScrollSnapDown"
      ) {
        // snap vertically
        let targetTop: number | undefined;
        let furthest = rect.height;
        let skew = e.name === "ScrollEnd" ? 0 : e.name === "ScrollSnapUp" ? 0.25 : -0.25;
        switch (container.verticalSnap) {
          case "start":
            for (let r of rects) {
              let top = r.top + skew * r.height;
              let dist = Math.abs(top - rect.top);
              if (r === focusedRect) dist = dist - r.height / 2;
              if (dist < furthest) {
                targetTop = r.top;
                furthest = dist;
              }
            }
            break;
          case "end":
            for (let r of rects) {
              let bottom = r.bottom + skew * r.height;
              let dist = Math.abs(bottom - rect.bottom);
              if (r === focusedRect) dist = dist - r.height / 2;
              if (dist < furthest) {
                targetTop = r.bottom - rect.height;
                furthest = dist;
              }
            }
            break;
          case "center":
            let rectMid = rect.top + rect.height / 2;
            for (let r of rects) {
              let mid = r.top + r.height / 2 + skew * r.height;
              let dist = Math.abs(mid - rectMid);
              if (r === focusedRect) dist = dist - r.height / 2;
              if (dist < furthest) {
                targetTop = mid - rect.height / 2;
                furthest = dist;
              }
            }
            break;
        }
        if (targetTop != undefined) {
          let top = element.scrollTop + (targetTop! - rect.top);
          element.scrollTo({ behavior: "smooth", top });
        }
      }
      if (
        e.name === "ScrollEnd" ||
        e.name === "ScrollSnapStart" ||
        e.name === "ScrollSnapEnd"
      ) {
        // snap horizontally (TODO: this probably doesn't work with RTL yet)
        let targetLeft: number | undefined;
        let furthest = rect.width;
        let skew = e.name === "ScrollEnd" ? 0 : e.name === "ScrollSnapStart" ? 0.25 : -0.25;
        switch (container.horizontalSnap) {
          case "start":
            for (let r of rects) {
              let left = r.left + skew * r.width;
              let dist = Math.abs(left - rect.left);
              if (r === focusedRect) dist = dist - r.width / 2;
              if (dist < furthest) {
                targetLeft = r.left;
                furthest = dist;
              }
            }
            break;
          case "end":
            for (let r of rects) {
              let right = r.right + skew * r.width;
              let dist = Math.abs(right - rect.right);
              if (r === focusedRect) dist = dist - r.width / 2;
              if (dist < furthest) {
                targetLeft = r.right - rect.width;
                furthest = dist;
              }
            }
            break;
          case "center":
            let rectMid = rect.left + rect.width / 2;
            for (let r of rects) {
              let mid = r.left + r.width / 2 + skew * r.width;
              let dist = Math.abs(mid - rectMid);
              if (r === focusedRect) dist = dist - r.width / 2;
              if (dist < furthest) {
                targetLeft = mid - rect.width / 2;
                furthest = dist;
              }
            }
            break;
        }
        if (targetLeft! != undefined) {
          let left = element.scrollLeft + (targetLeft! - rect.left);
          element.scrollTo({ behavior: "smooth", left });
        }
      }
    }
  }
  onScrollSnapUp(e: UIComponentEvent) {
    if ((this.component as UIScrollContainer).verticalSnap === "start") {
      this.onScrollEnd(e);
    }
  }
  onScrollSnapDown(e: UIComponentEvent) {
    if ((this.component as UIScrollContainer).verticalSnap === "end") {
      this.onScrollEnd(e);
    }
  }
  onScrollSnapStart(e: UIComponentEvent) {
    if ((this.component as UIScrollContainer).horizontalSnap === "start") {
      this.onScrollEnd(e);
    }
  }
  onScrollSnapEnd(e: UIComponentEvent) {
    if ((this.component as UIScrollContainer).horizontalSnap === "end") {
      this.onScrollEnd(e);
    }
  }

  /** Handle selection */
  onSelect(e: UIComponentEvent) {
    if (e.source !== this.component) return;
    let element = this.getElement();
    if (element) element.dataset.selected = "selected";
  }

  /** Handle deselection */
  onDeselect(e: UIComponentEvent) {
    if (e.source !== this.component) return;
    let element = this.getElement();
    if (element) delete element.dataset.selected;
  }

  /** Create a new updater and update its contents */
  private _refreshUpdater() {
    let element = this.getElement();
    if (element) {
      if (this._updater) this._updater.stop();
      this._updater = new DOMContainerUpdater(element, this._separator);
      if (this.component.asyncContentRendering) this._updater.setAsyncCreate(true);
      if (this.component.animatedContentRenderingDuration! >= 0) {
        this._updater.setAnimationTimeMs(this.component.animatedContentRenderingDuration!);
      }
      if (this.component.animatedContentRenderingVelocity! >= 0) {
        this._updater.setAnimationSpeed(this.component.animatedContentRenderingVelocity!);
      }
      this._updater!.update(this.component.content);
    }
  }

  /** Create or reuse a separator object for the current component */
  private _getSeparator() {
    if (!this.component.layout) return;
    let separator = this.component.layout.separator;
    if (!separator && hasComponentSpacing(this.component)) {
      let spacing = this.component.spacing;
      let axis = this.component.layout.axis;
      let id = spacing! + "|" + axis!;
      separator =
        _separators[id] ||
        (_separators[id] = { space: spacing, vertical: axis === "horizontal" });
    }
    return separator;
  }

  private _updater?: DOMContainerUpdater;
  private _separator?: UIStyle.SeparatorOptions;
}

// debounce container drag operations using a timestamp:
let _dragStart: any;

// make root containers draggable using the "DragContainer" event
(UIContainer as typeof UIContainer & { new (): UIContainer }).addEventHandler(function (e) {
  if (e.name === "DragContainer") {
    if (_dragStart > Date.now() - 40 || this.getParentComponent() instanceof UIComponent)
      return;
    let element: HTMLElement = this.lastRenderOutput && this.lastRenderOutput.element;
    if (!element) return;
    let event: MouseEvent | TouchEvent | undefined;
    while (e && !event) {
      if (e instanceof UIComponentEvent && e.event) event = e.event;
      else if (e instanceof ComponentEvent && e.inner) e = e.inner;
      else break;
    }
    if (!event || (event as MouseEvent).button) return;

    // check starting coordinates
    let startX =
      ((event as TouchEvent).touches && (event as TouchEvent).touches[0].screenX) ||
      (event as MouseEvent).screenX;
    let startY =
      ((event as TouchEvent).touches && (event as TouchEvent).touches[0].screenY) ||
      (event as MouseEvent).screenY;
    if (startX === undefined || startY === undefined) return;

    // found the element and coordinates, start dragging now
    _dragStart = Date.now();
    let moved = false;
    let rect = element.getBoundingClientRect();

    /** Handler that is invoked when the mouse/touch input is moved */
    const moveHandler = (e: MouseEvent | TouchEvent) => {
      let screenX =
        ((e as TouchEvent).touches && (e as TouchEvent).touches[0].screenX) ||
        (e as MouseEvent).screenX;
      let screenY =
        ((e as TouchEvent).touches && (e as TouchEvent).touches[0].screenY) ||
        (e as MouseEvent).screenY;
      let diffX = screenX - startX;
      let diffY = screenY - startY;
      if (!moved) {
        if (Math.abs(diffX) < 2 && Math.abs(diffY) < 2) return;
        moved = true;
        let parentNode = element.parentNode as HTMLElement;
        if (parentNode && parentNode.className === "App__ModalWrapper") {
          // make sure the modal wrapper is based at 0, 0
          // (not the case for menu, popover etc.)
          parentNode.style.top = "0";
          parentNode.style.left = "0";
        }
        element.style.position = "absolute";
        element.style.bottom = "auto";
        element.style.right = "auto";
      }
      e.preventDefault();
      e.stopPropagation();
      let y = Math.max(0, rect.top + diffY);
      element.style.top = Math.min(y, window.innerHeight - 40) + "px";
      let x = Math.max(-element.clientWidth + 40, rect.left + diffX);
      element.style.left = Math.min(x, window.innerWidth - 64) + "px";
    };

    /** Handler that is invoked when the mouse button/touch input is released */
    const upHandler = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
      _dragStart = 0;
      DOMRenderContext.scheduleRender(() => {
        window.removeEventListener("touchmove", moveHandler, {
          passive: false,
          capture: true,
        } as any);
        window.removeEventListener("mousemove", moveHandler, true);
        window.removeEventListener("touchend", upHandler as any, true);
        window.removeEventListener("mouseup", upHandler, true);
        window.removeEventListener("click", upHandler, true);
      });
    };

    // add all handlers
    window.addEventListener("touchmove", moveHandler, { passive: false, capture: true });
    window.addEventListener("mousemove", moveHandler, true);
    window.addEventListener("touchend", upHandler as any, true);
    window.addEventListener("mouseup", upHandler, true);
    window.addEventListener("click", upHandler, true);
  }
});

// observe *all* containers (cast `UIContainer` because it is an abstract class)
(UIContainer as any).addObserver(UIContainerRenderer);
