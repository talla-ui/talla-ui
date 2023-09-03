import { RenderContext } from "desk-frame";

/** @internal Default set of animations */
export const animations: {
	readonly [name: string]: RenderContext.OutputTransformer;
} = {
	"fade-in": (t) => t.fade(0).step().fade(1).ease(200).waitAsync(),
	"fade-out": (t) => t.fade(1).step().fade(0).ease(200).waitAsync(),
	"fade-in-up": _anim([[0, 0.1], []], [0, 1]),
	"fade-in-down": _anim([[0, -0.1], []], [0, 1]),
	"fade-in-left": _anim([[0.1, 0], []], [0, 1]),
	"fade-in-right": _anim([[-0.1, 0], []], [0, 1]),
	"fade-out-up": _anim([[], [0, -0.1]], [1, 0]),
	"fade-out-down": _anim([[], [0, 0.1]], [1, 0]),
	"fade-out-left": _anim([[], [-0.1, 0]], [1, 0]),
	"fade-out-right": _anim([[], [0.1, 0]], [1, 0]),
	"show-dialog": _anim([[0, 0.1], []], [0, 1]),
	"hide-dialog": _anim([[], []], [1, 0], true),
	"show-menu": _anim([[0, -0.1], []], [0, 1]),
	"hide-menu": _anim([[], []], [1, 0], true),
};

/** Helper function to compose an animation transform function */
function _anim(
	offset: [[number?, number?], [number?, number?]],
	fade: [number, number],
	async?: boolean,
): RenderContext.OutputTransformer {
	return async function (t: RenderContext.OutputTransform) {
		let p = t
			.offset(...offset[0])
			.fade(fade[0])
			.step()
			.offset(...offset[1])
			.fade(fade[1])
			.ease(200)
			.waitAsync();
		if (!async) await p;
	};
}
