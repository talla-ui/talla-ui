import {
  ManagedEvent,
  UICell,
  UIComponent,
  UIComponentEvent,
  UIFocusRequestEvent,
  UIFocusRequestType,
  UIRenderContext,
  UIRenderEvent,
} from "typescene";
import { BrowserApplication } from "../BrowserApplication";
import {
  DOMRenderCallback,
  DOMRenderContext,
  DOMRenderOutput,
  RENDER_PROP_ID,
} from "../DOMRenderContext";
import { applyElementCSS } from "../DOMStyle";

/** `Rendered` event that is emitted on all rendered components */
const _renderedEvent = new ManagedEvent("Rendered").freeze();

/** Helper function to transform DOM event types to UI event names */
function domEventToUIEventName(e: Event) {
  return _names[e.type];
}
const _names: { [type: string]: string } = {
  "click": "Click",
  "dblclick": "DoubleClick",
  "contextmenu": "ContextMenu",
  "mouseup": "MouseUp",
  "mousedown": "MouseDown",
  "mouseenter": "MouseEnter",
  "mouseleave": "MouseLeave",
  "touchstart": "TouchStart",
  "touchend": "TouchEnd",
  "keydown": "KeyDown",
  "keyup": "KeyUp",
  "keypress": "KeyPress",
  "focusin": "FocusIn",
  "focusout": "FocusOut",
  "change": "Change",
  "input": "Input",
  "copy": "Copy",
  "cut": "Cut",
  "paste": "Paste",
  "submit": "Submit",
};

/** Event key names for `keydown` event key name (some aliases for IE) */
const _keyUIEvents: { [keyName: string]: string } = {
  "Enter": "EnterKey",
  "Spacebar": "Spacebar",
  " ": "Spacebar",
  "Backspace": "BackspaceKey",
  "Delete": "DeleteKey",
  "Del": "DeleteKey",
  "Escape": "EscapeKey",
  "Esc": "EscapeKey",
  "ArrowLeft": "ArrowLeftKey",
  "Left": "ArrowLeftKey",
  "ArrowUp": "ArrowUpKey",
  "Up": "ArrowUpKey",
  "ArrowRight": "ArrowRightKey",
  "Right": "ArrowRightKey",
  "ArrowDown": "ArrowDownKey",
  "Down": "ArrowDownKey",
};

/** Keys for which OS actions should be prevented if used on lists and list items */
const _listKeysPreventDefault: { [keyName: string]: boolean } = {
  ArrowLeftKey: true,
  ArrowRightKey: true,
  ArrowUpKey: true,
  ArrowDownKey: true,
};

/** Last renderer where a touchstart occurred */
let _lastTouched: any;

/** Current touch-move handler on the window, if any */
let _touchMoveHandler: any;

export abstract class RendererBase<
  TComponent extends UIComponent,
  TElement extends HTMLElement
> {
  constructor(component: TComponent) {
    this.component = component;
  }

  /** Target component */
  public component: TComponent;

  /** Method used by the root event handler to propagate base events (always set) */
  DOM_EMIT: Function = this.emitComponentEvent;

  /** Method used by the root event handler to propagate control events (should be set on controls) */
  DOM_CONTROL_EMIT?: Function;

  /** Method used by the root event handler to propagate cell events (should be set on cells) */
  DOM_CELL_EMIT?: Function;

  /** Method that is called asynchronously after every time the component is rendered, can be overridden */
  protected afterRender(_out?: DOMRenderOutput) {
    if (this.component.managedState) {
      this.component.emit(_renderedEvent);
    }
    let elt = this._renderedElement;
    if (elt && elt.dataset.transitionT === "revealing") {
      setTimeout(() => {
        if (elt!.dataset.transitionT === "revealing") {
          elt!.dataset.transitionT = "revealed";
        }
      }, 0);
    }
  }

  /** Propagate a DOM event to the UI component and stop its propagation in the DOM; can be overridden e.g. to read the latest value of an input element before emitting the event. */
  protected emitComponentEvent(e: Event, name?: string) {
    if (e.type === "click" || e.type === "mousedown" || e.type === "mouseup") {
      if (DOMRenderContext.$touchData.last > Date.now() - 1000) return;
    }
    if (e.type === "submit") {
      e.preventDefault();
    }

    // find event name and propagate event to component itself
    let uiEventName = name || domEventToUIEventName(e);
    this._emitUIEvent(uiEventName, e);

    // set time of last touch event, and watch for moves
    if (uiEventName === "TouchStart") {
      DOMRenderContext.$touchData.last = Date.now();
      _lastTouched = this;
      if (!_touchMoveHandler) {
        window.addEventListener(
          "touchmove",
          (_touchMoveHandler = () => {
            window.removeEventListener("touchmove", _touchMoveHandler);
            _touchMoveHandler = undefined;
            _lastTouched = undefined;
          })
        );
      }
      this._emitUIEvent("MouseDown", e);
    }

    // simulate mouse up and click on touch (if not moved)
    if (uiEventName === "TouchEnd") {
      DOMRenderContext.$touchData.last = Date.now();
      if (_lastTouched === this) {
        this._emitUIEvent("MouseUp", e);
        this._emitUIEvent("Click", e);
      }
    }

    // handle various key press aliases
    if (uiEventName === "KeyDown") {
      let key = (e as KeyboardEvent).key;
      let keyName = key ? _keyUIEvents[key] : "";
      let ignore = false;
      if (keyName === "EnterKey") {
        let target: HTMLElement = e.target as any;
        let nodeName = String(target.nodeName).toLowerCase();
        ignore = nodeName === "button" || nodeName === "textarea";
      }
      if (
        _listKeysPreventDefault[keyName] &&
        (this.component.accessibleRole === "list" ||
          this.component.accessibleRole === "listitem")
      ) {
        e.preventDefault();
      }
      if (!ignore && keyName) {
        setTimeout(() => {
          this._emitUIEvent(keyName + "Press", e);
        }, 0);
      }
    }
    e.stopPropagation();
  }

  private _emitUIEvent(name: string, e: Event) {
    if (this.component && this.component.managedState) {
      this.component.emit(UIComponentEvent, name, this.component, undefined, e);
    }
  }

  /** Handle given render event by creating an element using the (overridden) `createElement` method if necessary, and storing the last render callback to enable the `updateElement` method */
  protected handleRenderEvent(e: UIRenderEvent<TComponent>) {
    if (e.source !== this.component) return;
    let firstRender = !this._renderedElement;
    let element = this._renderedElement || (this._renderedElement = this.createElement());
    (element as any)[RENDER_PROP_ID] = this;
    let component = this.component;
    if (component.accessibleRole) {
      element.setAttribute("role", component.accessibleRole);
    }
    if (component.accessibleLabel) {
      element.setAttribute("aria-label", component.accessibleLabel);
    }
    if (!BrowserApplication.transitionsDisabled && component instanceof UICell) {
      if (firstRender && component.revealTransition) {
        element.dataset.transitionReveal = component.revealTransition;
        element.dataset.transitionT = "revealing";
      }
      if (component.exitTransition) {
        element.dataset.transitionExit = component.exitTransition;
        element.dataset.transitionT = "revealing";
      }
    }
    let output =
      component.lastRenderOutput && component.lastRenderOutput.element === element
        ? component.lastRenderOutput
        : (component.lastRenderOutput = new UIRenderContext.Output(component, element));
    this._lastRenderCallback = e.renderCallback(output, this.afterRender.bind(this));
  }

  /** Handle given focus request event by focusing the current output element, or previous/next focusable siblings within the same parent component */
  protected handleFocusRequestEvent(e: UIFocusRequestEvent<TComponent>) {
    if (e.source !== this.component) return;
    if (this.component.lastRenderOutput) {
      // focus element itself if focus type is `Self`
      let element: HTMLElement = this.component.lastRenderOutput.element;
      if (e.direction === UIFocusRequestType.SELF) {
        element.focus();
        return;
      }

      // check for parent element to find previous/next element to focus
      let parent = this.component.getParentComponent(UIComponent as any);
      let parentElement: HTMLElement | undefined =
        parent &&
        parent instanceof UIComponent &&
        parent.lastRenderOutput &&
        parent.lastRenderOutput.element;
      if (!parentElement) return;

      // find focusable elements and focus closest before/after
      let focusable: HTMLElement[] = parentElement.querySelectorAll("[tabIndex]") as any;
      if (e.direction === UIFocusRequestType.REVERSE) {
        for (let i = focusable.length - 1; i >= 0; i--) {
          let pos = element.compareDocumentPosition(focusable[i]);
          if (pos & Node.DOCUMENT_POSITION_PRECEDING) {
            let j = 0;
            while (j < i) {
              pos = focusable[j].compareDocumentPosition(focusable[i]);
              if (pos & Node.DOCUMENT_POSITION_CONTAINED_BY) break;
              j++;
            }
            focusable[j].focus();
            return;
          }
        }
      } else {
        for (let i = 0; i < focusable.length; i++) {
          let pos = element.compareDocumentPosition(focusable[i]);
          if (
            pos & Node.DOCUMENT_POSITION_FOLLOWING &&
            !(pos & Node.DOCUMENT_POSITION_CONTAINED_BY)
          ) {
            focusable[i].focus();
            return;
          }
        }
      }
    }
  }

  /** Update the element that is rendered for the component. Updates rendered output after a first call to `handleRenderEvent`, otherwise does nothing except store given element for rendering later. */
  protected updateElement(element: TElement) {
    this._renderedElement = element;
    if (this._lastRenderCallback) {
      let output = new UIRenderContext.Output(this.component, element);
      this.component.lastRenderOutput = output as any;
      this._lastRenderCallback = this._lastRenderCallback.call(
        undefined,
        output,
        this.afterRender.bind(this)
      );
    }
  }

  /** Update CSS styles asynchronously, if an element has already been rendered */
  protected scheduleStyleUpdate(addClass?: string) {
    this._addClass = addClass;
    if (!this._renderedElement || this._sched) return;
    this._sched = true;
    Promise.resolve().then(() => {
      this._sched = false;
      if (this._renderedElement) {
        applyElementCSS(this.component, this._renderedElement, false, this._addClass);
      }
    });
  }
  private _sched?: boolean;
  private _addClass?: string;

  /** Returns the last rendered element, if any */
  protected getElement() {
    return this._renderedElement;
  }

  /** Returns true if the component has been rendered, and a HTML element exists */
  isRendered() {
    return !!this._lastRenderCallback && !!this._renderedElement;
  }

  /** Must be overridden with a method that creates an HTML element for the rendered component, with initial styles and properties */
  protected abstract createElement(): TElement;

  private _lastRenderCallback?: DOMRenderCallback;
  private _renderedElement?: TElement;
}
