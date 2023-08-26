import { UITheme, UIStyle } from "typescene";
import { AlertDialogBuilder, alertDialogStyles } from "./components/AlertDialog";
import { DropdownMenuBuilder, dropdownMenuStyles } from "./components/DropdownMenu";
import { getCSSLength, setGlobalCSS } from "./DOMStyle";

const BASE_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, "Helvetica Neue", Arial, sans-serif';
const BASE_FONT_SIZE = 14;

/** Theme that includes default Web app specific styles */
export class BrowserTheme extends UITheme {
  constructor() {
    super();

    // override color set:
    this.colors = {
      ...this.colors,
      black: "#000000",
      darkerGray: "#333333",
      darkGray: "#777777",
      lightGray: "#dddddd",
      white: "#ffffff",
      slate: "#667788",
      lightSlate: "#c0c8d0",
      red: "#ee3333",
      orange: "#ee9922",
      yellow: "#ddcc33",
      lime: "#99bb33",
      green: "#44aa44",
      turquoise: "#33aaaa",
      cyan: "#33bbbb",
      blue: "#3355aa",
      violet: "#5533aa",
      purple: "#8833aa",
      magenta: "#dd4488",
      primary: "@blue",
      accent: "@purple",
      appBackground: "@background",
    };

    // set or extend global theme styles
    this.styles = UIStyle.group(this.styles, alertDialogStyles, dropdownMenuStyles, {
      // use CSS style for containers to use flexbox:
      "container": {
        decoration: {
          css: {
            display: "flex",
            textAlign: "start||left",
          },
        },
      },

      // control styles:
      "control": {
        textStyle: {
          fontFamily: BASE_FONT_FAMILY,
          fontSize: BASE_FONT_SIZE,
          fontWeight: "normal",
          lineHeight: "normal",
          italic: false,
          lineBreakMode: "pre",
        },
      },
      "spacer": {
        dimensions: { grow: 1, width: 8, height: 8 },
        position: { gravity: "stretch" },
      },
      "separator": {
        dimensions: { grow: 0, shrink: 0 },
        position: { gravity: "stretch" },
      },

      // label styles:
      "label": {
        dimensions: { maxWidth: "100%" },
        decoration: { css: { margin: "calc(1rem - .5em) 0" } },
        textStyle: { lineBreakMode: "ellipsis" },
      },
      "label_close": {
        decoration: { css: { margin: "0" } },
      },
      "heading1": {
        textStyle: { fontSize: 60, fontWeight: 200, letterSpacing: -0.5 },
      },
      "heading2": {
        textStyle: { fontSize: 24 },
      },
      "heading3": {
        textStyle: { fontSize: 18, bold: true },
      },
      "paragraph": {
        textStyle: { lineBreakMode: "pre-wrap", lineHeight: 1.4 },
        decoration: { css: { cursor: "text" } },
      },

      // button styles:
      "button": UIStyle.create({
        dimensions: { minWidth: 96 },
        textStyle: {
          align: "center",
          lineBreakMode: "ellipsis",
        },
        decoration: {
          borderThickness: 0,
          background: "@controlBase",
          textColor: "@primary",
          borderRadius: 4,
          padding: { y: 8, x: 12 },
          css: {
            cursor: "pointer",
            transition: "all .2s ease",
          },
        },
      })
        .addState("pressed", {
          decoration: { background: "@primary", textColor: "@primary:text" },
        })
        .addState("hover", {
          decoration: { background: "@primary", textColor: "@primary:text" },
        })
        .addState("disabled", {
          decoration: {
            borderThickness: 0,
            background: "@controlBase",
            textColor: "@primary",
            css: { opacity: ".5", cursor: "inherit" },
          },
        }),
      "button_primary": UIStyle.create({
        decoration: {
          background: "@primary",
          textColor: "@primary:text",
          borderThickness: 1,
          borderColor: "@primary",
        },
      }).addState("hover", {
        decoration: {
          background: "@primary^+30%",
          borderThickness: 1,
          borderColor: "@primary^+30%",
        },
      }),
      "button_borderless": UIStyle.create({
        dimensions: { minWidth: 16, minHeight: 16 },
        decoration: {
          background: "transparent",
          borderThickness: 1,
          borderColor: "transparent",
          padding: { y: 6, x: 12 },
        },
      }).addState("hover", {
        decoration: { background: "@controlBase^-50%/30%", textColor: "@primary" },
      }),
      "button_outline": UIStyle.create({
        decoration: {
          borderThickness: 1,
          borderColor: "@primary",
        },
      }),
      "button_link": UIStyle.create({
        dimensions: { minWidth: 16, minHeight: 16 },
        textStyle: { align: "start||left" },
        decoration: { background: "transparent" },
      })
        .addState("hover", {
          textStyle: { underline: true },
          decoration: { background: "transparent", textColor: "@primary" },
        })
        .addState("disabled", {
          decoration: { background: "transparent", textColor: "@primary" },
        }),
      "button_large": UIStyle.create({
        dimensions: { minWidth: 128 },
        textStyle: { fontWeight: 200, fontSize: 16 },
        decoration: {
          background: "@primary",
          textColor: "@primary:text",
          borderRadius: 32,
          padding: { y: 12, x: 16 },
        },
      }),
      "button_small": UIStyle.create({
        dimensions: { minWidth: 64 },
        textStyle: { fontSize: 12 },
        decoration: {
          borderThickness: 1,
          borderColor: "@controlBase^-20%",
          padding: { y: 4, x: 8 },
        },
      }),
      "button_icon": UIStyle.create({
        dimensions: { minWidth: 32, minHeight: 32 },
        position: { gravity: "center" },
        decoration: {
          background: "transparent",
          borderRadius: "50%",
          padding: 0,
        },
      }).addState("hover", {
        decoration: { background: "@decoration^-50%/30%", textColor: "@primary" },
      }),

      // text field styles:
      "textfield": UIStyle.create({
        decoration: {
          background: "@white",
          textColor: "@white:text",
          borderColor: "@controlBase^-20%",
          borderThickness: 1,
          borderRadius: 4,
          padding: 8,
          css: { cursor: "text" },
        },
        textStyle: {
          lineBreakMode: "pre-wrap",
        },
      }),
      "textfield_borderless": UIStyle.create({
        decoration: {
          background: "transparent",
          borderThickness: 0,
          borderRadius: 0,
          padding: 0,
        },
      }).addState("focused", {
        decoration: { css: { boxShadow: "none" } },
      }),

      // toggle style:
      "toggle": {
        decoration: { textColor: "@text", cssClassNames: ["UI__CustomToggle"] },
      },

      // image style:
      "image": {
        position: { gravity: "center" },
      },
    });
  }

  /** Confirmation/alert dialog component builder */
  ConfirmationDialogBuilder = AlertDialogBuilder;

  /** Dropdown menu component builder */
  MenuBuilder = DropdownMenuBuilder;

  /** Default icons in SVG format (base implementation adapted from Material Design icons by Google) */
  icons: UITheme["icons"] = {
    blank: `<svg viewBox="0 0 48 48"></svg>`,
    close: `<svg viewBox="0 0 48 48"><path d="M39 12l-3-3l-12 12l-12-12l-3 3l12 12l-12 12l3 3l12-12l12 12l3-3l-12-12l12-12z"/></svg>`,
    expandDown: `<svg viewBox="0 0 48 48"><path d="M32 18l-9 9l-9-9l-3 3l12 12l12-12l-3-3"/></svg>`,
    menu: `<svg viewBox="0 0 48 48"><path d="M6 36h36v-4H6v4zm0-10h36v-4H6v4zm0-14v4h36v-4H6z"/></svg>`,
    check: `<svg viewBox="0 0 48 48"><path d="M18 32L10 24l-3 3L18 38l24-24-3-3z"/></svg>`,
  };

  /** Set the global focus 'glow' outline width and blur (dp or string with unit, defaults to 2 and 0), and color (defaults to `@primary/50%`) */
  setFocusOutline(
    width: string | number = 2,
    blur: string | number = 0,
    color = "@primary/50%"
  ) {
    let boxShadow =
      "0 0 " +
      getCSSLength(blur) +
      " " +
      getCSSLength(width) +
      " " +
      UITheme.replaceColor(color);
    setGlobalCSS({
      ".UI[tabindex]:focus": { boxShadow },
      ".UI.ShowFocusWithin[tabindex]:focus-within": { boxShadow },
      ".UI>[tabindex]:focus+label>control": { boxShadow },
    });
    return this;
  }
}

/** Initialize global theme */
function initializeTheme() {
  let theme = new BrowserTheme();
  UITheme.current = theme;
  theme.setFocusOutline();
}

/** Add primary global CSS classes */
function initializeCSS() {
  setGlobalCSS({
    // add UI component base styles
    ".UI": {
      margin: "0",
      padding: "0",
      border: "0 solid transparent",
      outline: "0",
      cursor: "inherit",
      boxSizing: "border-box",
      textOverflow: "ellipsis",
      textDecoration: "none",
    },
    ".UI[hidden]": {
      display: "none !important",
    },

    // add style for fixed root component
    ".App__FixedRoot": {
      position: "fixed",
      top: "0",
      bottom: "0",
      left: "0",
      right: "0",
      display: "flex",
      flexDirection: "column",
      cursor: "default",
      overflow: "hidden",
    },

    // add modal wrapper/shader styles
    ".App__ModalShader": {
      zIndex: "1000",
      position: "fixed",
      top: "0",
      left: "0",
      bottom: "0",
      right: "0",
      outline: "0",
      overflow: "auto",
      display: "flex",
      flexDirection: "column",
      justifyContent: "stretch",
      alignContent: "stretch",
      transition: "background-color .2s ease-in-out",
      background: "transparent",
    },
    ".App__ModalWrapper": {
      flex: "1 0 auto",
      display: "flex",
    },
    ".App__ModalWrapper>.UI": {
      zIndex: "10000",
      overflow: "hidden",
    },

    // add separator styles
    ".UIRender__Separator--line": {
      flex: "0 0 auto",
      margin: "0",
      padding: "0",
      border: "0",
      borderTopStyle: "solid",
      borderWidth: "1px",
      alignSelf: "stretch",
    },
    ".UIRender__Separator--line-vertical": {
      borderTopStyle: "none",
      borderLeftStyle: "solid",
      borderWidth: "1px",
    },
    ".UIRender__Separator--spacer": {
      flex: "0 0 auto",
      width: "1px", // actual size set inline
      height: "1px",
      alignSelf: "center",
    },

    // add custom toggle styles
    ".UI__CustomToggle": {
      lineHeight: "1.5rem",
      position: "relative",
      padding: ".25rem 0",
    },
    ".UI__CustomToggle>input": {
      position: "absolute",
      top: ".25rem",
      left: "0",
      width: "1rem",
      height: "1rem",
      margin: "0",
      padding: "0",
      border: "0",
      opacity: "0",
    },
    ".UI__CustomToggle>input+label": {
      display: "inline-block",
      paddingLeft: "1rem",
    },
    ".UI__CustomToggle>input[disabled]+label": {
      opacity: ".5",
    },
    ".UI__CustomToggle>input:not([disabled])+label": {
      cursor: "pointer",
    },
    ".UI__CustomToggle>input+label>control": {
      content: "''",
      position: "absolute",
      top: ".25rem",
      left: "0",
      width: ".875rem",
      height: ".875rem",
      background: "#fff",
      border: "1px solid #aaa",
      borderRadius: ".25rem",
    },
    ".UI__CustomToggle>input:checked+label>control": {
      borderColor: "#666",
      background: "#666",
    },
    ".UI__CustomToggle>input:checked+label>control::after": {
      content: "''",
      boxSizing: "border-box",
      display: "block",
      position: "absolute",
      top: "0",
      left: ".25rem",
      height: ".75rem",
      width: ".375rem",
      transform: "rotate(45deg)",
      borderBottom: ".125rem solid #fff",
      borderRight: ".125rem solid #fff",
    },

    // fix vertical alignment of text within <a> button
    "a.UI": {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    },
  });

  // add all predefined transitions:
  const OPAQUE: [number] = [1];
  const T_UP: [number, string] = [0, "translateY(-50%)"];
  const T_DOWN: [number, string] = [0, "translateY(50%)"];
  const T_LEFT: [number, string] = [0, "translateX(-50%)"];
  const T_RIGHT: [number, string] = [0, "translateX(50%)"];
  addTransition("fade", ".5s ease-in-out", "", [[0], OPAQUE]);
  addTransition("fade-fast", ".2s ease-in-out", "", [[0], OPAQUE]);
  addTransition("down", ".5s ease-in-out", ".5s ease", [T_UP, OPAQUE, T_DOWN]);
  addTransition("down-fast", ".2s ease-in-out", ".15s ease", [T_UP, OPAQUE, T_DOWN]);
  addTransition("up", ".5s ease-in-out", ".5s ease", [T_DOWN, OPAQUE, T_UP]);
  addTransition("up-fast", ".2s ease-in-out", ".15s ease", [T_DOWN, OPAQUE, T_UP]);
  addTransition("left", ".5s ease-in-out", ".5s ease", [T_RIGHT, OPAQUE, T_LEFT]);
  addTransition("left-fast", ".2s ease-in-out", ".15s ease", [T_RIGHT, OPAQUE, T_LEFT]);
  addTransition("right", ".5s ease-in-out", ".5s ease", [T_LEFT, OPAQUE, T_RIGHT]);
  addTransition("right-fast", ".2s ease-in-out", ".15s ease", [T_LEFT, OPAQUE, T_RIGHT]);
}

/** Helper function to set CSS styles for a particular transition type (name),with transition property values for opacity and transform, and values for opacity and transform themselves (0 = revealing, 1 = revealed, 2 = exiting [optional, repeats 0 if omitted]) */
function addTransition(
  name: string,
  opacityTransition: string,
  transformTransition: string,
  values: [number?, string?][]
) {
  let transition = "";
  if (opacityTransition) transition = "opacity " + opacityTransition;
  if (transformTransition)
    transition += (transition ? ", " : "") + "transform " + transformTransition;
  setGlobalCSS({
    [`[data-transition-reveal=${name}][data-transition-t=revealing]`]: {
      opacity: values[0][0],
      transform: values[0][1],
    },
    [`[data-transition-reveal=${name}][data-transition-t=revealed]`]: {
      opacity: values[1][0],
      transform: values[1][1],
      transition,
    },
    [`[data-transition-exit=${name}][data-transition-t=exiting]`]: {
      opacity: (values[2] || values[0])[0],
      transform: (values[2] || values[0])[1],
      transition,
    },
  });
}

// apply global styles immediately
initializeCSS();
initializeTheme();
