import {
  logUnhandledException,
  onPropertyChange,
  Stringable,
  UIFocusRequestEvent,
  UILabel,
  UIRenderEvent,
  UITheme,
  UIColor,
} from "typescene";
import { applyElementCSS, getCSSLength } from "../DOMStyle";
import { RendererBase } from "./RendererBase";

class UILabelRenderer extends RendererBase<UILabel, HTMLElement> {
  constructor(public component: UILabel) {
    super(component);
    this.DOM_CONTROL_EMIT = this.DOM_EMIT;
  }

  /** Create output element, used by base class */
  protected createElement() {
    let element = document.createElement(
      this.component.headingLevel ? "h" + this.component.headingLevel : "span"
    );
    if (this.component.isKeyboardFocusable()) element.tabIndex = 0;
    else if (this.component.isFocusable()) element.tabIndex = -1;
    applyElementCSS(this.component, element, true);
    setTextOrHtmlContent(element, {
      text: this.component.text,
      htmlFormat: this.component.htmlFormat,
      icon: this.component.icon,
      iconColor: this.component.iconColor || this.component.textStyle.color,
      iconSize: this.component.iconSize,
      iconMargin: this.component.iconMargin,
      iconAfter: this.component.iconAfter,
    });
    return element;
  }

  /** Handle render event */
  onUIRender(e: UIRenderEvent<UILabel>) {
    this.handleRenderEvent(e);
  }

  /** Handle focus requests */
  onUIFocusRequestAsync(e: UIFocusRequestEvent<UILabel>) {
    this.handleFocusRequestEvent(e);
  }

  /** Handle content changes */
  @onPropertyChange(
    "text",
    "htmlFormat",
    "icon",
    "iconColor",
    "iconSize",
    "iconMargin",
    "iconAfter"
  )
  setText() {
    let element = this.getElement();
    if (element) {
      setTextOrHtmlContent(element, {
        text: this.component.text,
        htmlFormat: this.component.htmlFormat,
        icon: this.component.icon,
        iconColor: this.component.iconColor || this.component.textStyle.color,
        iconSize: this.component.iconSize,
        iconMargin: this.component.iconMargin,
        iconAfter: this.component.iconAfter,
      });
    }
  }

  /** Handle heading level changes (update element) */
  onHeadingLevelChange() {
    if (this.isRendered()) {
      this.updateElement(this.createElement());
    }
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

/** Helper function to set the (text or html) content for given element */
export function setTextOrHtmlContent(element: HTMLElement, content: TextContentProperties) {
  let text = content.text == null ? "" : String(content.text);
  if (!content.icon) {
    // just set text/html content
    if (content.htmlFormat) element.innerHTML = text;
    else element.textContent = text;
    return;
  }

  // use a wrapper to contain both the icon and the text
  let contentWrapper = document.createElement("span");
  contentWrapper.style.display = "flex";
  contentWrapper.style.flexDirection = "row";
  contentWrapper.style.alignItems = "center";
  contentWrapper.style.justifyContent = "space-around";
  contentWrapper.style.textOverflow = "inherit";
  try {
    // add icon element
    let icon = getIconElt(content);
    icon.style.order = content.iconAfter ? "2" : "0";
    contentWrapper.appendChild(icon);
  } catch (err: any) {
    if (!_failedIconNotified[content.icon]) {
      _failedIconNotified[content.icon] = true;
      logUnhandledException(err);
    }
  }
  if (text) {
    // add margin element
    let margin = getCSSLength(content.iconMargin, ".5rem");
    let marginWrapper = document.createElement("span");
    marginWrapper.style.flex = "0 0 " + margin;
    marginWrapper.style.width = margin;
    marginWrapper.style.order = "1";
    contentWrapper.appendChild(marginWrapper);

    // add text element
    let textWrapper = document.createElement("span");
    textWrapper.style.flex = "1 0 0";
    textWrapper.style.order = content.iconAfter ? "0" : "2";
    textWrapper.style.textOverflow = "inherit";
    textWrapper.style.overflow = "hidden";
    if (content.htmlFormat) textWrapper.innerHTML = text;
    else textWrapper.textContent = text;
    contentWrapper.appendChild(textWrapper);

    // align icon to the left (ltr) if there is text next to it
    contentWrapper.style.justifyContent = "start";
  }
  element.innerHTML = "";
  element.appendChild(contentWrapper);
}
let _failedIconNotified: { [name: string]: true } = {};

interface TextContentProperties {
  text?: Stringable;
  htmlFormat?: boolean;
  icon?: string;
  iconSize?: string | number;
  iconMargin?: string | number;
  iconColor?: UIColor | string;
  iconAfter?: boolean;
}

const _memoizedIcons: { [memo: string]: HTMLElement } = {};

/** Memoized function to create an icon element for given icon name/content, size, and color */
function getIconElt(content: TextContentProperties) {
  let size = getCSSLength(content.iconSize, "1rem");
  let color = content.iconColor ? UITheme.replaceColor(content.iconColor) : "";
  let memo = content.icon + ":" + size + ":" + color;
  if (_memoizedIcons[memo]) {
    return _memoizedIcons[memo].cloneNode(true) as HTMLElement;
  }

  // not memoized yet, get HTML content and create element
  let temp = document.createElement("div");
  temp.innerHTML = UITheme.current.icons[content.icon!] || content.icon!;
  let result: HTMLElement;
  let icon = temp.firstChild;
  if (!icon) icon = document.createTextNode("");
  if (String(icon.nodeName).toLowerCase() === "svg") {
    result = icon as HTMLElement;
    if (result.hasAttribute("stroke")) {
      result.style.stroke = color || "currentColor";
    } else {
      result.style.fill = color || "currentColor";
    }
    result.style.display = "inline-block";
    result.style.width = size;
    result.style.height = "auto";
  } else {
    let iconWrapper = document.createElement("icon");
    iconWrapper.style.display = "inline-block";
    iconWrapper.appendChild(icon);
    if (content.iconSize) iconWrapper.style.fontSize = size;
    if (color) iconWrapper.style.color = color;
    result = iconWrapper;
  }
  result.style.flex = "0 0 " + size;
  result.style.width = size;
  _memoizedIcons[memo] = result.cloneNode(true) as HTMLElement;
  return result;
}

UILabel.addObserver(UILabelRenderer);
