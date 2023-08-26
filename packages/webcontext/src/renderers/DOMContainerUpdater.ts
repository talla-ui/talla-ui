import {
  logUnhandledException,
  UIRenderable,
  UIRenderContext,
  UIStyle,
  UITheme,
} from "typescene";
import {
  DOMRenderCallback,
  DOMRenderContext,
  DOMRenderOutput,
  removeElement,
} from "../DOMRenderContext";
import { getCSSLength } from "../DOMStyle";

/** Running ID used for animation data property */
let _animatedElementId = 16;

/** Updater for inner content of a container element */
export class DOMContainerUpdater {
  constructor(element: HTMLElement, separator?: UIStyle.SeparatorOptions) {
    this.element = element;
    if (separator) this.separator = { ...separator };
  }

  /** Set flag to add components synchronously or asynchronously */
  setAsyncCreate(makeAsync?: boolean) {
    this._asyncChildren = !!makeAsync;
  }

  /** Set animated transition duration in ms */
  setAnimationTimeMs(duration: number) {
    this._animationTimeMs = duration;
  }

  /** Set animated transition velocity in screens per second */
  setAnimationSpeed(speed: number) {
    this._animationSpeed = speed;

    // set duration if none set yet
    if (!(speed > 0)) this._animationTimeMs = 0;
    else if (!this._animationTimeMs) this._animationTimeMs = 5000;
  }

  /** Stop asynchronous component updates from being handled by this updater */
  stop() {
    this._stopped = true;
  }

  /** Container element (read-only) */
  readonly element: HTMLElement;

  /** List separator options (read-only) */
  readonly separator?: UIStyle.SeparatorOptions;

  update(renderable: Iterable<UIRenderable>) {
    if (!this.element) return;
    if (this._updatePending) {
      this._updatePending = renderable;
      return;
    }

    // schedule rendering of updated content
    this._updatePending = renderable;
    let p = DOMRenderContext.scheduleRender(() => {
      if (this._stopped || !this._updatePending) return undefined;
      renderable = this._updatePending;
      this._updatePending = undefined;
      if (!this._rendered) {
        this._rendered = true;
        this.element.innerHTML = "";
      }

      // get all current positions, if going to animate
      let doAnimation = !!this._animationTimeMs;
      if (doAnimation) {
        this._animatePositions = {};
        let rects = this._animatePositions;
        let cur: HTMLElement | null = this.element.firstChild as any;
        while (cur) {
          if (cur.getBoundingClientRect && !cur.dataset.uiRemoved) {
            let id =
              cur.dataset.uiAnimateId ||
              (cur.dataset.uiAnimateId = "anim_" + _animatedElementId++);
            rects[id] = cur.getBoundingClientRect();
          }
          cur = cur.nextSibling as any;
        }
      }

      // check for additions and keep track of existing content
      let elements: HTMLElement[] = [];
      let content: { [componentId: number]: DOMRenderOutput } = {};
      for (let c of renderable) {
        let id = c.managedId;
        let out = this._content[id] || this._addChildComponent(c, p);
        content[id] = out;
        elements.push(out.element);

        // detach from previous parent if needed
        if (
          out.element &&
          out.element.parentNode &&
          out.element.parentNode !== this.element
        ) {
          out.detach && out.detach();
          if (out.element.parentNode) {
            out.element.parentNode.removeChild(out.element);
          }
        }

        // add own detach method
        out.detach = () => {
          if (out.element && out.element.parentNode === this.element) {
            let plh = (this._content[id] = this._getPlaceholder(c));
            out.element.parentNode.replaceChild(plh.element, out.element);
          }
        };
      }

      // remove old components
      let removed: { [componentId: number]: DOMRenderOutput } = {};
      for (let oldId in this._content) {
        if (!content[oldId]) removed[oldId] = this._content[oldId];
      }
      this._content = content;

      // remove old elements first (asynchronously)
      for (let oldId in removed) {
        let elt = removed[oldId]!.element;
        if (elt.parentNode === this.element) {
          let separator: HTMLElement | undefined;
          if (this.separator) {
            separator = elt.previousSibling as HTMLElement;
            if (!separator || separator.dataset.uiRemoved) {
              separator = elt.nextSibling as HTMLElement;
            }
          }

          // remove element and separator asynchronously
          removeElement(elt);
          if (separator) removeElement(separator);
        }
      }

      // move existing content if needed
      let last = this.element.lastChild;
      while (
        last &&
        (last as HTMLElement).dataset &&
        (last as HTMLElement).dataset.uiRemoved
      ) {
        last = last.previousSibling as ChildNode;
      }
      let nextSibling = last && last.nextSibling;
      for (let i = elements.length - 1; i >= 0; i--) {
        let cur = elements[i];
        if (!cur.parentNode || cur.nextSibling !== nextSibling) {
          let separator = this.separator && (cur.previousSibling || this._makeSeparator());
          this.element.insertBefore(cur, nextSibling);
          if (separator) {
            let previousSibling: any = cur.previousSibling;
            if (
              previousSibling &&
              !(previousSibling.dataset && previousSibling.dataset.uiRemoved)
            ) {
              this.element.insertBefore(separator, cur);
            } else if (cur.nextSibling) {
              this.element.insertBefore(separator, cur.nextSibling);
            }
          }
        }
        nextSibling = cur;
        if (
          this.separator &&
          cur.previousSibling &&
          !(cur.previousSibling as HTMLElement).dataset.uiRemoved
        ) {
          // move element before separator, not before element itself
          nextSibling = cur.previousSibling as HTMLElement;
        }

        // skip over removed elements
        while (
          nextSibling.previousSibling &&
          (nextSibling.previousSibling as HTMLElement).dataset &&
          (nextSibling.previousSibling as HTMLElement).dataset.uiRemoved
        ) {
          nextSibling = nextSibling.previousSibling as HTMLElement;
        }
      }

      // animate elements from their stored position to the current one
      if (doAnimation) this._animateElements();
    });
  }

  /** Create a separator element */
  private _makeSeparator() {
    if (!this.separator) throw Error;
    let result: HTMLElement;
    if (this.separator.lineThickness) {
      let thickness = getCSSLength(this.separator.lineThickness, "");
      let margin = getCSSLength(this.separator.lineMargin, "");
      result = document.createElement("hr");
      result.className =
        "UIRender__Separator--line" +
        (this.separator.vertical ? " UIRender__Separator--line-vertical" : "");
      result.style.borderWidth = thickness;
      result.style.margin = margin
        ? this.separator.vertical
          ? "0 " + margin
          : margin + " 0"
        : "";
      result.style.borderColor = UITheme.replaceColor(
        this.separator.lineColor || "@separator"
      );
    } else {
      let thickness = getCSSLength(this.separator.space, "0");
      result = document.createElement("spacer");
      result.className = "UIRender__Separator--spacer";
      if (this.separator.vertical !== false) {
        result.style.width = thickness;
      }
      if (!this.separator.vertical) {
        result.style.height = thickness;
      }
    }
    return result;
  }

  /** Render a child object and add its DOM element as a child of the container element */
  private _addChildComponent(component: UIRenderable, afterP: Promise<undefined>) {
    let id = component.managedId;
    let hasReturned = false;
    let lastOutput: DOMRenderOutput | undefined;

    // run `render` on component with update callback
    let update: DOMRenderCallback = (output, afterRender) => {
      if (!lastOutput && output && !hasReturned) {
        this._content[id] = lastOutput = output;
        afterP.then(() => afterRender && afterRender(output)).catch(logUnhandledException);
      } else {
        DOMRenderContext.scheduleRender(() => {
          if (this._stopped || !component.managedState) return output;
          if (
            lastOutput &&
            lastOutput !== output &&
            lastOutput.element.parentNode === this.element
          ) {
            if (!output || !output.element) {
              // use placeholder for components that have no output
              output = this._getPlaceholder(component);
            } else {
              // if new output is already a child element somewhere,
              // don't just remove it but replace with a placeholder
              if (output.element.parentNode) {
                let swap = this._getPlaceholder(component);
                let elt = output.element;
                elt.parentNode!.replaceChild(swap.element, elt);
                output.element = swap.element;
                swap.element = elt;
                output = swap;
              }
            }

            // update existing element
            this.element.replaceChild(output.element, lastOutput.element);
            this._content[id] = lastOutput = output;
          }
          return output;
        })
          .then(afterRender)
          .catch(logUnhandledException);
      }
      return update;
    };

    // call render method (a)synchronously
    if (this._asyncChildren) {
      DOMRenderContext.scheduleRender(() => {
        component.render(update);
      }, true);
    } else {
      component.render(update);
    }

    // use placeholder first if content has not been rendered yet
    if (!lastOutput) {
      lastOutput = this._content[id] = this._getPlaceholder(component);
    }
    hasReturned = true;
    return lastOutput;
  }

  /** Returns an empty placeholder for given component */
  private _getPlaceholder(component: UIRenderable) {
    let elt = document.createElement("placeholder");
    elt.id = "placeholder:" + component.managedId;
    elt.hidden = true;
    return new UIRenderContext.Output(component, elt);
  }

  /** Animate elements based on their stored (old) position */
  private _animateElements(checkZeroSized = true) {
    if (!this._animatePositions) return;
    let animateTimeMs = this._animationTimeMs!;
    let pixelsPerMs = this._animationSpeed
      ? (this._animationSpeed * (window.innerHeight + window.innerWidth)) / 2000
      : 1;
    let animated: HTMLElement[] = [];
    let timing: number[] = [];
    let checkZero: HTMLElement[] = [];

    // reset everything to target situation first
    let hideTemp: Array<() => void> = [];
    let unhideTemp: Array<() => void> = [];
    let cur: HTMLElement | null = this.element.firstChild as any;
    while (cur) {
      if (cur.dataset) {
        if (cur.dataset.uiAnimateId && !cur.dataset.uiRemoved) {
          cur.style.transition = "transform 0s";
          cur.style.transform = "";
        } else if (cur.dataset.uiRemoved) {
          // hide removed elements for now
          let elt = cur;
          if (cur.dataset.transitionExit) {
            // completely remove transitioning elements from flow
            let rect = cur.getBoundingClientRect();
            hideTemp.push(() => {
              elt.style.position = "fixed";
              elt.style.top = rect.top + "px";
              elt.style.left = rect.left + "px";
              elt.style.width = rect.width + "px";
              elt.style.height = rect.height + "px";
            });
          } else {
            hideTemp.push(() => {
              elt.style.display = "none";
            });
            unhideTemp.push(() => {
              elt.style.display = "";
            });
          }
        }
      }
      cur = cur.nextSibling as any;
    }
    hideTemp.forEach(f => f());

    // update transforms and prepare transition
    cur = this.element.firstChild as any;
    while (cur) {
      if (!cur.dataset.uiRemoved) {
        if (
          cur.dataset &&
          cur.dataset.uiAnimateId &&
          this._animatePositions[cur.dataset.uiAnimateId]
        ) {
          // animate this element from its previous position
          let newRect = cur.getBoundingClientRect();
          let oldRect = this._animatePositions[cur.dataset.uiAnimateId];
          let diffX = Math.floor(oldRect.left - newRect.left);
          let diffY = Math.floor(oldRect.top - newRect.top);
          animated.push(cur);
          let t = Math.floor(
            Math.min(animateTimeMs, Math.abs(diffX + diffY) / pixelsPerMs)
          );
          timing.push(t);
          cur.style.transform =
            "translateX(" + diffX + "px)" + " translateY(" + diffY + "px)";
        } else if (checkZeroSized && cur.getBoundingClientRect) {
          // check for 0-width/height elements
          let rect = cur.getBoundingClientRect();
          if (rect.height < 1 || rect.width < 1) {
            checkZero.push(cur);
          }
        }
      }
      cur = cur.nextSibling as any;
    }

    // after a while, start transition(s) and check 0-width/height
    setTimeout(() => {
      for (let i = animated.length - 1; i >= 0; i--) {
        animated[i].style.transition = "transform " + timing[i] + "ms ease-in-out";
        animated[i].style.transform = "";
      }
      for (let elt of checkZero) {
        let rect = elt.getBoundingClientRect();
        if (rect.width >= 1 && rect.height >= 1) {
          setTimeout(() => {
            this._animateElements(false);
          }, 0);
          return;
        }
      }
      // clear transition to re-enable other transitions in CSS
      setTimeout(() => {
        for (let elt of animated) {
          elt.style.transform = "";
          elt.style.transition = "";
        }
      }, 100);
    }, 0);

    // unhide temporarily hidden elements
    unhideTemp.forEach(f => f());
  }

  private _rendered?: boolean;
  private _stopped?: boolean;
  private _asyncChildren?: boolean;
  private _animationTimeMs?: number;
  private _animationSpeed?: number;
  private _updatePending?: Iterable<UIRenderable>;
  private _content: { [componentId: number]: DOMRenderOutput } = {};
  private _animatePositions?: { [uid: string]: { top: number; left: number } };
}
