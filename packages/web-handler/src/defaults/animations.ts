import { RenderContext, UI, UIAnimation } from "@talla-ui/core";

/** Helper function to compose an animation transform function */
function _anim(
	offset: [[number?, number?], [number?, number?]],
	fade: [number, number],
	async?: boolean,
	easeIn?: boolean,
	duration?: number,
): UIAnimation {
	return new UIAnimation(async function (t: RenderContext.OutputTransform) {
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
	});
}

/** @internal Default set of animations */
export default {
	fadeIn: _anim([[], []], [0, 1]),
	fadeOut: _anim([[], []], [1, 0], false, true),
	fadeInUp: _anim([[0, 0.1], []], [0, 1]),
	fadeInDown: _anim([[0, -0.1], []], [0, 1]),
	fadeInLeft: _anim([[0.1, 0], []], [0, 1]),
	fadeInRight: _anim([[-0.1, 0], []], [0, 1]),
	fadeOutUp: _anim([[], [0, -0.1]], [1, 0], false, true),
	fadeOutDown: _anim([[], [0, 0.1]], [1, 0], false, true),
	fadeOutLeft: _anim([[], [-0.1, 0]], [1, 0], false, true),
	fadeOutRight: _anim([[], [0.1, 0]], [1, 0], false, true),
	showDialog: _anim([[0, 0.1], []], [0, 1]),
	hideDialog: _anim([[], []], [1, 0], true, true),
	showMenu: _anim([[0, -0.1], []], [0, 1], false, false, 50),
	hideMenu: _anim([[], []], [1, 0], true, true, 50),
} as Readonly<Record<UI.AnimationName, UIAnimation>>;
