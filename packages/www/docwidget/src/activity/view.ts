import {
  bind,
  bindf,
  UIBorderlessTextField,
  UICell,
  UIExpandedLabel,
  UIFlowCell,
  UIImage,
  UILinkButton,
  UIListCellAdapter,
  UIListController,
  UIRow,
  UISelectionController,
  UISeparator,
  UILabel,
} from "typescene";
import { Styles } from "./style";

export default UIFlowCell.with(
  {
    style: Styles.main,
    onArrowDownKeyPress: "+IgnoreArrowPress",
    onArrowUpKeyPress: "+IgnoreArrowPress",
  },

  // cell with text field input
  UICell.with(
    { padding: { x: 16, y: 8 } },
    UIRow.with(
      UIImage.with({
        url: "/assets/icons/search.svg",
        dimensions: { height: 16, width: 16 },
      }),
      UIBorderlessTextField.with({
        placeholder: bind("search.loaded|then:API search term...:Loading..."),
        onInput: "+SetSearchFilter",
        onEnterKeyPress: "+NavigateFirst",
        onArrowDownKeyPress: "+FocusFirst",
        textStyle: { lineHeight: 2 },
        requestFocus: true,
      })
    )
  ),

  // error message, if any
  UICell.with(
    {
      hidden: bind("!search.error"),
      padding: { x: 16, y: 8 },
    },
    UIRow.with(
      UILabel.withText("An error occurred, please reload", {
        color: "@text/50%",
      })
    )
  ),

  // results list
  UISelectionController.with(
    UIListController.with(
      {
        items: bind("filtered"),
        enableArrowKeyFocus: true,
      },
      UIListCellAdapter.with(
        {
          padding: { x: 16 },
          allowKeyboardFocus: true,
          selectOnFocus: true,
          style: Styles.listcell,
          onMouseEnter: "+Select",
          onClick: "+NavigateResult",
          onEnterKeyPress: "+NavigateResult",
        },
        UIRow.with(
          UIImage.with({
            dimensions: { width: 16, height: 16 },
            url: bindf("/assets/icons/spec-${object.type|or:var}.svg"),
            decoration: { css: { opacity: ".5" } },
          }),
          UIExpandedLabel.with({
            text: bind("object.id"),
            decoration: { css: { cursor: "pointer" } },
          })
        )
      )
    )
  ),

  // footer with index link
  UISeparator,
  UIRow.with(
    UILinkButton.with({
      label: "Documentation index",
      shrinkwrap: false,
      style: Styles.footer,
      onClick: "+GoIndex",
    })
  )
);
