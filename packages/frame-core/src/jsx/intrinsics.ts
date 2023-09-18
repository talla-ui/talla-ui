import { Binding } from "../base/index.js";
import {
	UIAnimatedCell,
	UIAnimationController,
	UIButton,
	UICell,
	UICloseLabel,
	UIColumn,
	UIComponent,
	UIConditional,
	UIForm,
	UIFormController,
	UIHeading1Label,
	UIHeading2Label,
	UIHeading3Label,
	UIIconButton,
	UIImage,
	UILabel,
	UIList,
	UIParagraphLabel,
	UIPlainButton,
	UIPrimaryButton,
	UIRow,
	UIScrollContainer,
	UISeparator,
	UISpacer,
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
	column: UIColumn,
	scrollcontainer: UIScrollContainer,
	animatedcell: UIAnimatedCell,
	button: UIButton,
	primarybutton: UIPrimaryButton,
	plainbutton: UIPlainButton,
	iconbutton: UIIconButton,
	label: UILabel,
	closelabel: UICloseLabel,
	p: UIParagraphLabel,
	h1: UIHeading1Label,
	h2: UIHeading2Label,
	h3: UIHeading3Label,
	textfield: UITextField,
	img: UIImage,
	toggle: UIToggle,
	separator: UISeparator,
	spacer: UISpacer,
	conditional: UIConditional,
	formcontext: UIFormController,
	list: UIList,
	animation: UIAnimationController,
	render: UIViewRenderer,
};

export namespace JSX {
	export namespace JSX {
		/** An interface defining all JSX intrinsic elements, refer to JSX function for details */
		export interface IntrinsicElements {
			// containers
			cell: UIComponent.ViewPreset<UICell>;
			form: UIComponent.ViewPreset<UIForm>;
			row: UIComponent.ViewPreset<UIRow>;
			column: UIComponent.ViewPreset<UIColumn>;
			scrollcontainer: UIComponent.ViewPreset<UIScrollContainer>;
			animatedcell: UIComponent.ViewPreset<UIAnimatedCell>;

			// controls
			button: UIComponent.ViewPreset<UIButton>;
			iconbutton: UIComponent.ViewPreset<UIIconButton>;
			primarybutton: UIComponent.ViewPreset<UIPrimaryButton>;
			plainbutton: UIComponent.ViewPreset<UIPlainButton>;
			label: UIComponent.ViewPreset<UILabel>;
			closelabel: UIComponent.ViewPreset<UICloseLabel>;
			p: UIComponent.ViewPreset<UIParagraphLabel>;
			h1: UIComponent.ViewPreset<UIHeading1Label>;
			h2: UIComponent.ViewPreset<UIHeading2Label>;
			h3: UIComponent.ViewPreset<UIHeading3Label>;
			textfield: UIComponent.ViewPreset<UITextField>;
			img: UIComponent.ViewPreset<UIImage>;
			toggle: UIComponent.ViewPreset<UIToggle>;
			separator: UIComponent.ViewPreset<UISeparator>;
			spacer: UIComponent.ViewPreset<UISpacer>;

			// composites
			conditional: Parameters<(typeof UIConditional)["with"]>[0];
			formcontext: { formContext?: Binding };
			list: Parameters<(typeof UIList)["with"]>[0];
			selection: {};
			animation: Parameters<(typeof UIAnimationController)["with"]>[0];
			render: Parameters<(typeof UIViewRenderer)["with"]>[0];
		}
	}
}
