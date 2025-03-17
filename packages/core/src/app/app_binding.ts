import { Binding, ObservedObject } from "../object/index.js";
import type { NavigationContext } from "./NavigationContext.js";
import { RenderContext } from "./RenderContext.js";

/** @internal Label property used to filter bindings using $app */
export const $_app_bind_label = Symbol("app");

/**
 * An object that can be used to create bindings for properties of the {@link RenderContext.Viewport} object
 * - This object can be used to create bindings to control responsive UIs, e.g. to show or hide particular views based on the size of the user's screen or window.
 */
export const $viewport = Binding.createFactory<
	ObservedObject.PropertiesOf<RenderContext.Viewport>
>($_app_bind_label, "renderer", "viewport");

/** An object that can be used to create bindings for properties of the {@link NavigationContext} object */
export const $navigation = Binding.createFactory<
	ObservedObject.PropertiesOf<NavigationContext>
>($_app_bind_label, "navigation");
