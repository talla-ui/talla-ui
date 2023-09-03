import {
	Observer,
	RenderContext,
	UIButton,
	UICell,
	UIColumn,
	UIImage,
	UILabel,
	UIRow,
	UIScrollContainer,
	UISeparator,
	UISpacer,
	UITextField,
	UIToggle,
} from "desk-frame";
import { UIContainerRenderer } from "./UIContainerRenderer.js";
import { UIRowRenderer } from "./UIRowRenderer.js";
import { UIColumnRenderer } from "./UIColumnRenderer.js";
import { UICellRenderer } from "./UICellRenderer.js";
import { UILabelRenderer } from "./UILabelRenderer.js";
import { UIButtonRenderer } from "./UIButtonRenderer.js";
import { UIImageRenderer } from "./UIImageRenderer.js";
import { UISeparatorRenderer } from "./UISeparatorRenderer.js";
import { UISpacerRenderer } from "./UISpacerRenderer.js";
import { UITextFieldRenderer } from "./UITextFieldRenderer.js";
import { UIToggleRenderer } from "./UIToggleRenderer.js";

/** @internal */
export function makeObserver<T extends RenderContext.Renderable>(
	target: T,
): Observer<T> | undefined {
	return (
		target instanceof UIRow
			? new UIRowRenderer()
			: target instanceof UIColumn
			? new UIColumnRenderer()
			: target instanceof UICell
			? new UICellRenderer()
			: target instanceof UIScrollContainer
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
