import {
	Observer,
	RenderContext,
	UIButton,
	UICell,
	UIContainer,
	UIImage,
	UILabel,
	UISeparator,
	UISpacer,
	UITextField,
	UIToggle,
} from "@desk-framework/frame-core";
import { UIButtonRenderer } from "./UIButtonRenderer.js";
import { UICellRenderer } from "./UICellRenderer.js";
import { UIContainerRenderer } from "./UIContainerRenderer.js";
import { UIImageRenderer } from "./UIImageRenderer.js";
import { UILabelRenderer } from "./UILabelRenderer.js";
import { UISeparatorRenderer } from "./UISeparatorRenderer.js";
import { UISpacerRenderer } from "./UISpacerRenderer.js";
import { UITextFieldRenderer } from "./UITextFieldRenderer.js";
import { UIToggleRenderer } from "./UIToggleRenderer.js";

/** @internal */
export function makeObserver<T extends RenderContext.Renderable>(
	target: T,
): Observer<T> | undefined {
	return (
		target instanceof UICell
			? new UICellRenderer()
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
