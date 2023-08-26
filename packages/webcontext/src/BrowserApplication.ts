import { Application } from "typescene";
import { DOMRenderContext } from "./DOMRenderContext";
import { importStylesheet, clearGlobalCSSState, setGlobalDpSize } from "./DOMStyle";
import { autoUpdateHandler } from "./HMR";
import { BrowserHashActivationContext } from "./BrowserHashActivationContext";
import { BrowserHistoryActivationContext } from "./BrowserHistoryActivationContext";

let _transitionsDisabled = false;

// Use HMR as auto-update mechanism
Application.setAutoUpdateHandler(autoUpdateHandler);

/** Represents an application that runs in a browser using the available DOM APIs. Automatically creates a renderer that renders all UI components in the browser. */
export class BrowserApplication extends Application {
  /** Set global (page-wide) relative size of DP units in nominal pixels, defaults to 1 */
  static setGlobalDpSize(size = 1) {
    setGlobalDpSize(size);
  }

  /** Import an external stylesheet from given URL (asynchronously) */
  static importStylesheet(url: string) {
    importStylesheet(url);
  }

  /** Set global (page-wide) setting to disable all transition animations in rendered components */
  static disableTransitions() {
    _transitionsDisabled = true;
  }

  /** True if transitions have been disabled using `disableTransitions()` */
  static get transitionsDisabled() {
    return _transitionsDisabled;
  }

  /** Create a browser application to be rendered within given DOM element (or to a wrapper that covers the entire window if no element is provided). */
  constructor(rootDOMElement?: HTMLElement) {
    super();
    this._root = rootDOMElement;
  }

  /** Activate the application by creating a new render context and activation context if needed */
  async onManagedStateActivatingAsync() {
    await super.onManagedStateActivatingAsync();
    if (!this.renderContext) {
      // clear the rest of the page if not mounted to a DOM element
      if (!this._root) document.body.innerHTML = "";

      // create the render context
      this.renderContext = new DOMRenderContext(this._root);
    }
    if (!this.activationContext) {
      // create the activation context (hash/history based API)
      this.activationContext = this._useHistoryAPI
        ? new BrowserHistoryActivationContext()
        : new BrowserHashActivationContext();
    }
  }

  /** Deactivate the application by removing the render context and activation context */
  async onManagedStateInactiveAsync() {
    await super.onManagedStateInactiveAsync();
    this.renderContext = undefined;
    this.activationContext = undefined;
  }

  /**
   * Use given DOM element to contain the application output, by creating a new renderer instance that is mounted to given element. Optionally, the element will be removed when the application and/or renderer is destroyed.
   * @note By default, `BrowserApplication` occupies the entire page and clears everything else from the same page. Use this method _immediately_ after creating the application to prevent clearing the page, or supply a DOM element as a constructor argument if instantiating the application manually.
   */
  mount(element: HTMLElement, removeOnDestroy?: boolean) {
    this._root = element;
    if (this.renderContext) {
      this.renderContext = new DOMRenderContext(element, removeOnDestroy);
    }
    return this;
  }

  /** Remove the application output from the screen by destroying the renderer instance */
  unmount() {
    this._root = undefined;
    this.renderContext = undefined;
    return this;
  }

  /** Use the browser History API intead of hash-URLs */
  useHistoryAPI() {
    this._useHistoryAPI = true;
    if (this.activationContext) {
      this.activationContext = new BrowserHistoryActivationContext();
    }
    return this;
  }

  private _root?: HTMLElement;
  private _useHistoryAPI?: boolean;
}
BrowserApplication.addObserver(
  class {
    onRenderContextChange() {
      // when render context changes, make sure all CSS classes are redefined
      clearGlobalCSSState();
    }
  }
);
