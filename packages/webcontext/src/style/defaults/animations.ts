import { RenderContext } from "desk-frame";

/** @internal Default set of animations */
export const animations: [
	name: string,
	animation: RenderContext.OutputTransformer,
][] = [
	["fade-in", _anim([[], []], [0, 1])],
	["fade-out", _anim([[], []], [1, 0], false, true)],
	["fade-in-up", _anim([[0, 0.1], []], [0, 1])],
	["fade-in-down", _anim([[0, -0.1], []], [0, 1])],
	["fade-in-left", _anim([[0.1, 0], []], [0, 1])],
	["fade-in-right", _anim([[-0.1, 0], []], [0, 1])],
	["fade-out-up", _anim([[], [0, -0.1]], [1, 0], false, true)],
	["fade-out-down", _anim([[], [0, 0.1]], [1, 0], false, true)],
	["fade-out-left", _anim([[], [-0.1, 0]], [1, 0], false, true)],
	["fade-out-right", _anim([[], [0.1, 0]], [1, 0], false, true)],
	["show-dialog", _anim([[0, 0.1], []], [0, 1])],
	["hide-dialog", _anim([[], []], [1, 0], true, true)],
	["show-menu", _anim([[0, -0.1], []], [0, 1], false, false, 100)],
	["hide-menu", _anim([[], []], [1, 0], true, true, 100)],
];

/** Helper function to compose an animation transform function */
function _anim(
	offset: [[number?, number?], [number?, number?]],
	fade: [number, number],
	async?: boolean,
	easeIn?: boolean,
	duration?: number,
): RenderContext.OutputTransformer {
	return async function (t: RenderContext.OutputTransform) {
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
	};
}
