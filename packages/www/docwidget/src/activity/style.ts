import { UIStyle } from "typescene";

export const Styles = UIStyle.group({
  main: {
    position: { gravity: "start" },
    dimensions: { width: "90%", maxWidth: 384 },
    decoration: {
      css: { margin: "0 5% 0 auto" },
      background: "@background",
      borderColor: "@primary",
      borderThickness: { top: 4 },
      borderRadius: 4,
      dropShadow: 0.5,
    },
  },
  listcell: UIStyle.create()
    .addState("selected", {
      decoration: {
        background: "@background^-10%",
        textColor: "@text",
      },
    })
    .addState("focused", {
      decoration: {
        background: "@primary",
        textColor: "@primary.text",
      },
    }),
  footer: {
    textStyle: { lineHeight: 1.8 },
  },
});
