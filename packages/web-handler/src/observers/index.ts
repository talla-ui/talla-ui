import {
	UIButton,
	UIContainer,
	UIDivider,
	UIImage,
	UIScrollView,
	UISpacer,
	UIText,
	UITextField,
	UIToggle,
	View,
} from "@talla-ui/core";
import { BaseObserver } from "./BaseObserver.js";
import { UIButtonRenderer } from "./UIButtonRenderer.js";
import { UIContainerRenderer } from "./UIContainerRenderer.js";
import { UIDividerRenderer } from "./UIDividerRenderer.js";
import { UIImageRenderer } from "./UIImageRenderer.js";
import { UIScrollViewRenderer } from "./UIScrollViewRenderer.js";
import { UISpacerRenderer } from "./UISpacerRenderer.js";
import { UITextFieldRenderer } from "./UITextFieldRenderer.js";
import { UITextRenderer } from "./UITextRenderer.js";
import { UIToggleRenderer } from "./UIToggleRenderer.js";

/** @internal Helper function to create the appropriate renderer for given object */
export function makeObserver(target: View): BaseObserver<any> | undefined {
	return (
		target instanceof UIScrollView
			? new UIScrollViewRenderer(target)
			: target instanceof UIContainer
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
