import {
	Observer,
	UIButton,
	UICell,
	UIContainer,
	UIImage,
	UILabel,
	UIScrollContainer,
	UISeparator,
	UISpacer,
	UITextField,
	UIToggle,
	View,
} from "@desk-framework/frame-core";
import { UIButtonRenderer } from "./UIButtonRenderer.js";
import { UICellRenderer } from "./UICellRenderer.js";
import { UIContainerRenderer } from "./UIContainerRenderer.js";
import { UIImageRenderer } from "./UIImageRenderer.js";
import { UILabelRenderer } from "./UILabelRenderer.js";
import { UIScrollContainerRenderer } from "./UIScrollContainerRenderer.js";
import { UISeparatorRenderer } from "./UISeparatorRenderer.js";
import { UISpacerRenderer } from "./UISpacerRenderer.js";
import { UITextFieldRenderer } from "./UITextFieldRenderer.js";
import { UIToggleRenderer } from "./UIToggleRenderer.js";

/** @internal Helper function to create the appropriate renderer for given object */
export function makeObserver<T extends View>(
	target: T,
): Observer<T> | undefined {
	return (
		target instanceof UICell
			? new UICellRenderer()
			: target instanceof UIScrollContainer
			? new UIScrollContainerRenderer()
			: target instanceof UIContainer
			? new UIContainerRenderer()
			: target instanceof UILabel
			? new UILabelRenderer()
			: target instanceof UIButton
			? new UIButtonRenderer()
			: target instanceof UIImage
			? new UIImageRenderer()
			: target instanceof UISeparator
			? new UISeparatorRenderer()
			: target instanceof UISpacer
			? new UISpacerRenderer()
			: target instanceof UITextField
			? new UITextFieldRenderer()
			: target instanceof UIToggle
			? new UIToggleRenderer()
			: undefined
	) as any;
}
