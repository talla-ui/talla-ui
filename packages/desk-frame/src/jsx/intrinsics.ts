import { Binding } from "../core/index.js";
import {
	UIAnimatedCell,
	UIAnimationController,
	UIBorderlessButton,
	UIBorderlessTextField,
	UIButton,
	UICell,
	UICenterRow,
	UICloseLabel,
	UIColumn,
	UIComponent,
	UIConditional,
	UIExpandedLabel,
	UIForm,
	UIFormController,
	UIHeading1,
	UIHeading2,
	UIHeading3,
	UIIconButton,
	UIImage,
	UILabel,
	UILinkButton,
	UIList,
	UIOppositeRow,
	UIOutlineButton,
	UIParagraph,
	UIPrimaryButton,
	UIRow,
	UIScrollContainer,
	UISelectionController,
	UISeparator,
	UISpacer,
	UIStyleController,
	UITextField,
	UIToggle,
	UIViewRenderer,
} from "../ui/index.js";

// add all intrinsics to an object so that JSX(...) can find the correct classes
/** @internal NOTE: documentation maintained on JSX function */
export const tags = {
	cell: UICell,
	form: UIForm,
	row: UIRow,
	centerrow: UICenterRow,
	oppositerow: UIOppositeRow,
	column: UIColumn,
	scrollcontainer: UIScrollContainer,
	animatedcell: UIAnimatedCell,
	button: UIButton,
	iconbutton: UIIconButton,
	linkbutton: UILinkButton,
	outlinebutton: UIOutlineButton,
	borderlessbutton: UIBorderlessButton,
	primarybutton: UIPrimaryButton,
	label: UILabel,
	closelabel: UICloseLabel,
	expandedlabel: UIExpandedLabel,
	p: UIParagraph,
	h1: UIHeading1,
	h2: UIHeading2,
	h3: UIHeading3,
	textfield: UITextField,
	borderlesstextfield: UIBorderlessTextField,
	img: UIImage,
	toggle: UIToggle,
	separator: UISeparator,
	spacer: UISpacer,
	conditional: UIConditional,
	formcontext: UIFormController,
	list: UIList,
	selection: UISelectionController,
	style: UIStyleController,
	animation: UIAnimationController,
	view: UIViewRenderer,
};

export namespace JSX {
	export namespace JSX {
		/** An interface defining all JSX intrinsic elements, refer to JSX function for details */
		export interface IntrinsicElements {
			// containers
			cell: UIComponent.ViewPreset<UICell>;
			form: UIComponent.ViewPreset<UIForm>;
			row: UIComponent.ViewPreset<UIRow>;
			centerrow: UIComponent.ViewPreset<UICenterRow>;
			oppositerow: UIComponent.ViewPreset<UIOppositeRow>;
			column: UIComponent.ViewPreset<UIColumn>;
			scrollcontainer: UIComponent.ViewPreset<UIScrollContainer>;
			animatedcell: UIComponent.ViewPreset<UIAnimatedCell>;

			// controls
			button: UIComponent.ViewPreset<UIButton>;
			iconbutton: UIComponent.ViewPreset<UIIconButton>;
			linkbutton: UIComponent.ViewPreset<UILinkButton>;
			outlinebutton: UIComponent.ViewPreset<UIOutlineButton>;
			borderlessbutton: UIComponent.ViewPreset<UIBorderlessButton>;
			primarybutton: UIComponent.ViewPreset<UIPrimaryButton>;
			label: UIComponent.ViewPreset<UILabel>;
			closelabel: UIComponent.ViewPreset<UICloseLabel>;
			expandedlabel: UIComponent.ViewPreset<UIExpandedLabel>;
			p: UIComponent.ViewPreset<UIParagraph>;
			h1: UIComponent.ViewPreset<UIHeading1>;
			h2: UIComponent.ViewPreset<UIHeading2>;
			h3: UIComponent.ViewPreset<UIHeading3>;
			textfield: UIComponent.ViewPreset<UITextField>;
			borderlesstextfield: UIComponent.ViewPreset<UIBorderlessTextField>;
			img: UIComponent.ViewPreset<UIImage>;
			toggle: UIComponent.ViewPreset<UIToggle>;
			separator: UIComponent.ViewPreset<UISeparator>;
			spacer: UIComponent.ViewPreset<UISpacer>;

			// composites
			conditional: Parameters<(typeof UIConditional)["with"]>[0];
			formcontext: { formContext?: Binding };
			list: Parameters<(typeof UIList)["with"]>[0];
			selection: {};
			style: Parameters<(typeof UIStyleController)["with"]>[0];
			animation: Parameters<(typeof UIAnimationController)["with"]>[0];
			view: Parameters<(typeof UIViewRenderer)["with"]>[0];
		}
	}
}
