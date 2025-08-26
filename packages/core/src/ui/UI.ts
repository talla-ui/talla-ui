import { UIListView } from "./wrappers/UIListView.js";
import { UIShowView } from "./wrappers/UIShowView.js";
import { UICell } from "./containers/UICell.js";
import { UIColumn } from "./containers/UIColumn.js";
import { UIRow } from "./containers/UIRow.js";
import { UIButton } from "./controls/UIButton.js";
import { UIDivider } from "./controls/UIDivider.js";
import { UIImage } from "./controls/UIImage.js";
import { UILabel } from "./controls/UILabel.js";
import { UISpacer } from "./controls/UISpacer.js";
import { UITextField } from "./controls/UITextField.js";
import { UIToggle } from "./controls/UIToggle.js";
import { UIAnimation } from "./style/UIAnimation.js";
import { UIColor } from "./style/UIColor.js";
import { UIIconResource } from "./style/UIIconResource.js";
import { UIStyle } from "./style/UIStyle.js";

/** A namespace that contains functions for building a declarative UI using view builders */
export namespace UI {
	/** Alias for {@link UICell.cellBuilder} */
	export const Cell = UICell.cellBuilder;

	/** Alias for {@link UIColumn.columnBuilder} */
	export const Column = UIColumn.columnBuilder;

	/** Alias for {@link UIRow.rowBuilder} */
	export const Row = UIRow.rowBuilder;

	/** Alias for {@link UIButton.buttonBuilder} */
	export const Button = UIButton.buttonBuilder;

	/** Alias for {@link UIDivider.dividerBuilder} */
	export const Divider = UIDivider.dividerBuilder;

	/** Alias for {@link UIImage.imageBuilder} */
	export const Image = UIImage.imageBuilder;

	/** Alias for {@link UILabel.labelBuilder} */
	export const Label = UILabel.labelBuilder;

	/** Alias for {@link UISpacer.spacerBuilder} */
	export const Spacer = UISpacer.spacerBuilder;

	/** Alias for {@link UITextField.textFieldBuilder} */
	export const TextField = UITextField.textFieldBuilder;

	/** Alias for {@link UIToggle.toggleBuilder} */
	export const Toggle = UIToggle.toggleBuilder;

	/** Alias for {@link UIListView.listBuilder} */
	export const List = UIListView.listBuilder;

	/** Alias for {@link UIShowView.showBuilder} */
	export const Show = UIShowView.showBuilder;

	/** Alias for {@link UIShowView.showWhenBuilder} */
	export const ShowWhen = UIShowView.showWhenBuilder;

	/** Alias for {@link UIShowView.showUnlessBuilder} */
	export const ShowUnless = UIShowView.showUnlessBuilder;

	/** Object containing all available theme color references */
	export const colors = UIColor.theme.refs();

	/** Type definition for theme color names */
	export type ColorName = keyof typeof colors;

	/** Object containing all available theme icon references */
	export const icons = UIIconResource.theme.refs();

	/** Type definition for theme icon names */
	export type IconName = keyof typeof icons;

	/** Object containing all available theme animation references */
	export const animations = UIAnimation.theme.refs();

	/** Type definition for theme animation names */
	export type AnimationName = keyof typeof animations;

	/** Object containing all available theme style references */
	export namespace styles {
		/** Object containing all available theme label style references */
		export const label = UIStyle.theme.label.refs();

		/** Type definition for theme label style names */
		export type LabelStyleName = keyof typeof label;

		/** Object containing all available theme button style references */
		export const button = UIStyle.theme.button.refs();

		/** Type definition for theme button style names */
		export type ButtonStyleName = keyof typeof button;

		/** Object containing all available theme text field style references */
		export const textfield = UIStyle.theme.textfield.refs();

		/** Type definition for theme text field style names */
		export type TextfieldStyleName = keyof typeof textfield;

		/** Object containing all available theme toggle style references */
		export const toggle = UIStyle.theme.toggle.refs();

		/** Type definition for theme toggle style names */
		export type ToggleStyleName = keyof typeof toggle;

		/** Object containing all available theme image style references */
		export const image = UIStyle.theme.image.refs();

		/** Type definition for theme image style names */
		export type ImageStyleName = keyof typeof image;

		/** Object containing all available theme divider style references */
		export const divider = UIStyle.theme.divider.refs();

		/** Type definition for theme divider style names */
		export type DividerStyleName = keyof typeof divider;
	}
}
