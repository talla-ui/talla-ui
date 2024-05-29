import { Binding, ManagedObject, bind } from "../base/index.js";
import type { ViewportContext } from "./ViewportContext.js";
import type { NavigationContext } from "./NavigationContext.js";

/** @internal Label property used to filter bindings using $app */
export const $_app_bind_label = Symbol("app");

/**
 * An object that can be used to create bindings for properties of the {@link ViewportContext} object
 * - This object can be used to create bindings to control responsive UIs, e.g. to show or hide particular views based on the size of the user's screen or window.
 */
export const $viewport: Binding.Source<
	ManagedObject.PropertiesOf<ViewportContext>
> = bind.$on($_app_bind_label, "viewport");

/** An object that can be used to create bindings for properties of the {@link NavigationContext} object */
export const $navigation: Binding.Source<
	ManagedObject.PropertiesOf<NavigationContext>
> = bind.$on($_app_bind_label, "navigation");

/** An object that can be used to create bindings for (properties of) services */
export const $services: Binding.Source = bind.$on($_app_bind_label, "services");
