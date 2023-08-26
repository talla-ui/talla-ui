import {
  bind,
  ComponentConstructor,
  ConfirmationDialogBuilder,
  strf,
  UIStyle,
  UIBorderlessButton,
  UICell,
  UICloseRow,
  UIExpandedLabel,
  UIFlowCell,
  UILabel,
  UILinkButton,
  UIParagraph,
  UIPrimaryButton,
  UISpacer,
  ViewComponent,
  Stringable,
  UICloseColumn,
  UIRow,
} from "typescene";

export const alertDialogStyles = UIStyle.group({
  "alertDialog": {
    decoration: {
      background: "@background",
      borderRadius: 4,
      dropShadow: 0.65,
    },
    position: { gravity: "center" },
    dimensions: { maxWidth: 400, width: "95vw" },
  },
  "alertDialog-titlebar": {
    decoration: {
      background: "@primary",
      textColor: "@primary.text",
    },
    dimensions: { height: 40 },
  },
  "alertDialog-title": {},
  "alertDialog-buttonRow": {
    containerLayout: { distribution: "end" },
    decoration: { padding: 0 },
  },
  "alertDialog-cancelButton": {
    dimensions: { grow: 0 },
  },
  "alertDialog-confirmButton": {
    dimensions: { grow: 0 },
  },
});

/** Default modal message dialog UI component; emits `Confirm` and `CloseModal` events */
export class AlertDialog extends ViewComponent.with({
  defaults: () => ({
    /** Messages to be displayed */
    messages: [] as Stringable[],
    /** Dialog title */
    title: undefined as Stringable | undefined,
    /** Label for the confirmation button */
    confirmButtonLabel: strf("Dismiss") as Stringable,
    /** Label for the cancellation button; if none specified, only the confirmation button will be displayed */
    cancelButtonLabel: undefined as Stringable | undefined,
  }),
  view: UICell.with(
    {
      style: "alertDialog",
      revealTransition: "up-fast",
    },
    UIFlowCell.with(
      {
        style: "alertDialog-titlebar",
        hidden: bind("title|!"),
        onMouseDown: "+DragContainer",
      },
      UICloseRow.with(
        UISpacer.withWidth(16),
        UIExpandedLabel.withText(bind("title"), "alertDialog-title"),
        UIBorderlessButton.with({
          position: { gravity: "center" },
          icon: "close",
          onClick: "+CloseModal",
          iconSize: 18,
          iconColor: "currentColor",
          textStyle: { color: "inherit" },
          disableKeyboardFocus: true,
        })
      )
    ),
    UICell.with(
      { padding: 16 },
      UICloseColumn.with({
        content: bind("messageLabels", []),
      }),
      UISpacer.withHeight(24),
      UIRow.with(
        {
          style: "alertDialog-buttonRow",
        },
        UILinkButton.with({
          style: "alertDialog-cancelButton",
          shrinkwrap: "auto",
          hidden: bind("cancelButtonLabel|!"),
          label: bind("cancelButtonLabel"),
          onClick: "+CloseModal",
        }),
        UIPrimaryButton.with({
          style: "alertDialog-confirmButton",
          shrinkwrap: "auto",
          label: bind("confirmButtonLabel"),
          onClick: "+Confirm",
          requestFocus: true,
        })
      )
    )
  ),
}) {
  protected beforeRender() {
    let labels: UILabel[] = [];
    for (let s of this.messages!) labels.push(new UIParagraph(s));
    this.messageLabels = labels;
  }

  /** Message labels (paragraphs) */
  messageLabels?: UILabel[];
}

/** Default alert dialog builder, builds an `AlertDialog` constructor */
export class AlertDialogBuilder extends ConfirmationDialogBuilder {
  build() {
    return AlertDialog.with(this._presets);
  }
  setTitle(title: Stringable) {
    this._presets.title = title;
    return this;
  }
  setConfirmButtonLabel(label: Stringable) {
    this._presets.confirmButtonLabel = label;
    return this;
  }
  setCancelButtonLabel(label: Stringable) {
    this._presets.cancelButtonLabel = label;
    return this;
  }
  addMessage(message: Stringable) {
    this._presets.messages!.push(message);
    return this;
  }
  private readonly _presets: Partial<
    ComponentConstructor.PresetType<typeof AlertDialog>
  > = {
    messages: [],
  };
}
