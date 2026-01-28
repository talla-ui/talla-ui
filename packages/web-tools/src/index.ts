import { app, UIElement } from "@talla-ui/core";
import { LogModel } from "./LogModel";
import { useClickForegroundEffect } from "./views/ClickForeground";
import { MainOverlayView } from "./views/MainOverlay/MainOverlayView";

let instance: MainOverlayView | undefined;
let logModel: LogModel | undefined;

/**
 * Shows the main web tools overlay
 * @param inspect A value to show in the object inspector panel
 * @param defaultMinimized True if the overlay should be minimized into a button the first time
 */
export function showWebTools(
	inspect?: unknown,
	defaultMinimized?: boolean,
	position?: UIElement.Position,
) {
	useClickForegroundEffect();
	logModel ||= new LogModel();
	if (instance && !instance.isUnlinked()) {
		if (inspect) instance.showInspect(inspect);
		else instance.showIndex();
		if (position) instance.setPosition(position);
		return instance;
	}

	instance = new MainOverlayView(logModel, defaultMinimized);
	if (inspect) instance.showInspect(inspect);
	(window as any).webToolsInstance = instance;

	let vc = app.render(instance, { mode: "overlay" });
	if (position) instance.setPosition(position);
	app.renderer?.listen(() => {
		vc.render(instance, undefined, { mode: "overlay" });
	});
}

/**
 * Adds a global (window) key event listener, to show/hide the web tools overlay(s) when the user presses the specified key
 * @param key Name of the key to listen for
 * @param modifiers Modifiers that need to be pressed along with the key
 */
export function setWebToolsToggleKey(
	key: string,
	modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean },
	mode?: "select" | "console" | "toggle",
) {
	logModel ||= new LogModel();
	window.addEventListener(
		"keydown",
		(e) => {
			if (e.key.toUpperCase() !== key.toUpperCase()) return;
			if (!!modifiers?.ctrl !== !!e.ctrlKey) return;
			if (!!modifiers?.shift !== !!e.shiftKey) return;
			if (!!modifiers?.alt !== !!e.altKey) return;
			if (mode === "select") {
				showWebTools(undefined);
				instance?.showPicker();
				return;
			}
			if (mode === "console") {
				if (!instance) showWebTools(undefined, true);
				instance?.showConsole();
				return;
			}
			if (instance && !instance.isUnlinked() && instance.mode !== "minimized") {
				if (instance.docked) instance.undock();
				instance.unlink();
			} else {
				showWebTools(undefined);
			}
		},
		true,
	);
}
