import {
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
} from "talla-ui";
import { BaseObserver } from "./BaseObserver.js";
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
export function makeObserver(target: View): BaseObserver<any> | undefined {
	return (
		target instanceof UICell
			? new UICellRenderer(target)
			: target instanceof UIScrollContainer
				? new UIScrollContainerRenderer(target)
				: target instanceof UIContainer
					? new UIContainerRenderer(target)
					: target instanceof UILabel
						? new UILabelRenderer(target)
						: target instanceof UIButton
							? new UIButtonRenderer(target)
							: target instanceof UIImage
								? new UIImageRenderer(target)
								: target instanceof UISeparator
									? new UISeparatorRenderer(target)
									: target instanceof UISpacer
										? new UISpacerRenderer(target)
										: target instanceof UITextField
											? new UITextFieldRenderer(target)
											: target instanceof UIToggle
												? new UIToggleRenderer(target)
												: undefined
	) as any;
}
