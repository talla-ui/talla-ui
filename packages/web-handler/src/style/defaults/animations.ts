import { RenderContext } from "talla";

/** @internal Default set of animations */
export const animations: [
	name: string,
	animation: RenderContext.OutputTransformer,
][] = [
	["FadeIn", _anim([[], []], [0, 1])],
	["FadeOut", _anim([[], []], [1, 0], false, true)],
	["FadeInUp", _anim([[0, 0.1], []], [0, 1])],
	["FadeInDown", _anim([[0, -0.1], []], [0, 1])],
	["FadeInLeft", _anim([[0.1, 0], []], [0, 1])],
	["FadeInRight", _anim([[-0.1, 0], []], [0, 1])],
	["FadeOutUp", _anim([[], [0, -0.1]], [1, 0], false, true)],
	["FadeOutDown", _anim([[], [0, 0.1]], [1, 0], false, true)],
	["FadeOutLeft", _anim([[], [-0.1, 0]], [1, 0], false, true)],
	["FadeOutRight", _anim([[], [0.1, 0]], [1, 0], false, true)],
	["ShowDialog", _anim([[0, 0.1], []], [0, 1])],
	["HideDialog", _anim([[], []], [1, 0], true, true)],
	["ShowMenu", _anim([[0, -0.1], []], [0, 1], false, false, 50)],
	["HideMenu", _anim([[], []], [1, 0], true, true, 50)],
];

/** Helper function to compose an animation transform function */
function _anim(
	offset: [[number?, number?], [number?, number?]],
	fade: [number, number],
	async?: boolean,
	easeIn?: boolean,
	duration?: number,
): RenderContext.OutputTransformer {
	return {
		async applyTransform(t: RenderContext.OutputTransform) {
			let a = t
				.offset(...offset[0])
				.fade(fade[0])
				.step()
				.offset(...offset[1])
				.fade(fade[1]);
			let p = easeIn
				? a.easeIn(duration || 200).waitAsync()
				: a.easeOut(duration || 200).waitAsync();
			if (!async) await p;
		},
	};
}
