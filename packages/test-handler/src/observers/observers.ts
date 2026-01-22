import {
	UIButton,
	UIContainer,
	UIDivider,
	UIImage,
	UISpacer,
	UIText,
	UITextField,
	UIToggle,
	View,
} from "@talla-ui/core";
import { TestBaseObserver } from "./TestBaseObserver.js";
import { UIButtonRenderer } from "./UIButtonRenderer.js";
import { UIContainerRenderer } from "./UIContainerRenderer.js";
import { UIDividerRenderer } from "./UIDividerRenderer.js";
import { UIImageRenderer } from "./UIImageRenderer.js";
import { UISpacerRenderer } from "./UISpacerRenderer.js";
import { UITextFieldRenderer } from "./UITextFieldRenderer.js";
import { UITextRenderer } from "./UITextRenderer.js";
import { UIToggleRenderer } from "./UIToggleRenderer.js";

/** @internal */
export function makeObserver(target: View): TestBaseObserver<any> | undefined {
	return (
		target instanceof UIContainer
			? new UIContainerRenderer(target)
			: target instanceof UIText
				? new UITextRenderer(target)
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
