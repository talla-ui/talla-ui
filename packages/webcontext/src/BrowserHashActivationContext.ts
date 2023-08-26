import { AppActivationContext } from "typescene";
import { ApplicationNavigationMode } from "../../typescene/dist";

/** Activation context that is used by the `BrowserApplication` type, which takes the target path from the browser window location 'hash' (e.g. `...#/foo/bar`) */
export class BrowserHashActivationContext extends AppActivationContext {
  constructor() {
    super();
    this._handler = () => {
      this._setPath();
    };
    window.addEventListener("hashchange", this._handler);
    this._setPath();
  }

  /** Convert given path into a valid href (also used by UIButton renderer) */
  getPathHref(path?: string) {
    let target = "";
    if (!path || path[0] === ":") return "";
    if (path[0] === "#") path = path.slice(1);
    if (path[0] === "/") {
      target = path;
    } else {
      let current = this.target;
      if (current.slice(-1) !== "/") current += "/";
      target = "/" + current + path;
    }
    target = target.replace(/\/+/g, "/");
    let i = 0;
    while (/\/\.\.?\//.test(target)) {
      if (i++ > 100) break;
      target = target
        .replace(/\/\.\//g, "/")
        .replace(/\/[^\/]+\/\.\.\//g, "/")
        .replace(/^\/?\.\.\//, "/");
    }
    return "#/" + target.replace(/^\/+/, "");
  }

  navigate(path: string, mode?: ApplicationNavigationMode) {
    path = String(path);
    if (mode && mode.back) {
      // go back, then continue
      window.history.back();
      if (path) {
        // after going back, navigate to given path
        setTimeout(() => this.navigate(path, { ...mode, back: false }), 1);
      }
    } else if (path === ":back") {
      // go back once
      window.history.back();
    } else if (mode && mode.replace && typeof window.history.replaceState === "function") {
      // replace path if possible
      if (path) {
        window.history.replaceState({}, document.title, this.getPathHref(path));
        this._setPath(); // above does not trigger hash change
      }
    } else {
      // just navigate to given path (as hash)
      if (path) window.location.hash = this.getPathHref(path);
    }
  }

  async onManagedStateDestroyingAsync() {
    window.removeEventListener("hashchange", this._handler);
  }

  private _setPath() {
    let hash = String(window.location.hash || "").replace(/^\#\/?/, "");
    this.target = hash;
  }

  private _handler: () => void;
}
