import {
	UIButton,
	UICell,
	UIContainer,
	UIImage,
	UILabel,
	UIDivider,
	UISpacer,
	UITextField,
	UIToggle,
	View,
} from "@talla-ui/core";
import { UIButtonRenderer } from "./UIButtonRenderer.js";
import { UICellRenderer } from "./UICellRenderer.js";
import { UIContainerRenderer } from "./UIContainerRenderer.js";
import { UIImageRenderer } from "./UIImageRenderer.js";
import { UILabelRenderer } from "./UILabelRenderer.js";
import { UIDividerRenderer } from "./UIDividerRenderer.js";
import { UISpacerRenderer } from "./UISpacerRenderer.js";
import { UITextFieldRenderer } from "./UITextFieldRenderer.js";
import { UIToggleRenderer } from "./UIToggleRenderer.js";
import { TestBaseObserver } from "./TestBaseObserver.js";

/** @internal */
export function makeObserver(target: View): TestBaseObserver<any> | undefined {
	return (
		target instanceof UICell
			? new UICellRenderer(target)
			: target instanceof UIContainer
				? new UIContainerRenderer(target)
				: target instanceof UILabel
					? new UILabelRenderer(target)
					: target instanceof UIButton
						? new UIButtonRenderer(target)
						: target instanceof UIImage
							? new UIImageRenderer(target)
							: target instanceof UIDivider
								? new UIDividerRenderer(target)
								: target instanceof UISpacer
									? new UISpacerRenderer(target)
									: target instanceof UITextField
										? new UITextFieldRenderer(target)
										: target instanceof UIToggle
											? new UIToggleRenderer(target)
											: undefined
	) as any;
}
