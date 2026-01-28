import { RenderContext, RenderEffect, UIColumn, View } from "@talla-ui/core";

function isDocked(elt: any) {
	while (elt) {
		if ("dataset" in elt) {
			if (String(elt.dataset.name).startsWith("WebTools")) {
				if (elt.dataset.name !== "WebToolsOverlay") return false;
			}
			if (elt.dataset.docked) return true;
		}
		elt = elt.parentElement!;
	}
}

export function bringToForeground(view: View) {
	let col = view instanceof UIColumn ? view : view.findViewContent(UIColumn)[0];
	let elt = col?.lastRenderOutput?.element as HTMLElement;
	while (elt && elt.parentElement !== document.body) {
		elt = elt.parentElement!;
	}
	if (!elt) return;
	if (document.body.lastElementChild !== elt) {
		while (elt.nextElementSibling) {
			insertAndKeepScroll(elt.nextElementSibling, elt);
		}
	}
}

export function insertAndKeepScroll(elt: Element, before: Element | null) {
	let cont = Array.from(elt.querySelectorAll("container")).filter(
		(a) => a.scrollTop > 0,
	);
	let scrollSaved = cont.map((a) => a.scrollTop);
	document.body.insertBefore(elt, before);
	cont.forEach((a, i) => {
		a.scrollTop = scrollSaved[i] || 0;
	});
}

const appliedClickForeground = new WeakSet<HTMLElement>();

const clickForegroundEffect: RenderEffect<HTMLElement> = {
	onRendered(view: View, output: RenderContext.Output<HTMLElement>) {
		let elt = output.element;
		if (!elt || appliedClickForeground.has(elt)) return;
		appliedClickForeground.add(elt);

		let last = Date.now();
		elt.addEventListener("mousedown", function () {
			if (Date.now() - last > 100 && !isDocked(elt)) bringToForeground(view);
			last = Date.now();
		});
	},
};

export function useClickForegroundEffect() {
	RenderEffect.register("click-foreground", clickForegroundEffect);
}
