import { app } from "../app/index.js";

/** Next 'random' ID assigned if style definition doesn't specify one */
let _nextStyleId = 0x1234;

/**
 * A class that defines a set of styles that can be applied to UI components
 * - Do not use this class directly; use the {@link ui.style} factory function to create a new style object, or preferably use one of the base styles defined on {@link ui.style}.
 * - For custom styles used by an application, extend base styles using the {@link extend()} method, or create override objects using the {@link override()} method.
 */
export class UIStyle<TDefinition> {
	/**
	 * Creates a new subclass that includes the original styles as well as new styles
	 * @param styles A list of style definitions to be added to the extended style; this may include multiple objects with different state options (see {@link StyleStateOptions}).
	 * @returns A subclass of {@link UIStyle} that includes the specified styles
	 */
	static extend<TDefinition>(
		this: UIStyle.Type<TDefinition>,
		...styles: Readonly<UIStyle.StyleSelectorList<TDefinition>>
	): typeof this {
		return class extends this {
			override getStyles() {
				return [...super.getStyles(), ...styles];
			}
		};
	}

	/**
	 * Creates a style override object that can be used to apply base styles as well as the specified styles to a UI component
	 * @param styles A list of style definitions to be added to the extended style; these may _not_ include state options (see {@link StyleStateOptions}).
	 * @returns A style override object that can be used to apply the specified styles to a UI component (e.g. {@link UIButton.style})
	 */
	static override<TDefinition>(
		this: UIStyle.Type<TDefinition>,
		...styles: Readonly<TDefinition | undefined>[]
	): UIStyle.StyleOverrides<TDefinition> {
		return {
			[UIStyle.OVERRIDES_BASE]: this,
			overrides: styles,
		};
	}

	/**
	 * Creates a new style object; do not use directly
	 * - This constructor is used by the renderer to declare each style once, and doesn't need to be used otherwise.
	 */
	constructor(name: string, BaseClass: Function) {
		let isBaseStyle = this.constructor === BaseClass;
		this.id = name + (isBaseStyle ? "" : "_" + _nextStyleId++);
		this.name = name;
		this.base = app.theme?.styles.get(name) || [];
	}

	/**
	 * Unique style ID
	 * - This property is set by the constructor, but can be changed afterwards as long as the value is unique across different styles.
	 */
	readonly id: string;

	/** Style type identifier */
	readonly name: string;

	/** Base styles, read from the current theme */
	readonly base: Readonly<UIStyle.StyleSelectorList<TDefinition>>;

	/**
	 * Returns the list of styles that should be applied to a UI component
	 * - This method is called by the renderer to declare each style once, and doesn't need to be called otherwise. It can be overridden to modify or add styles.
	 * - The static {@link extend()} method returns a subclass that overrides this method to include the specified styles.
	 */
	getStyles(): Readonly<UIStyle.StyleSelectorList<TDefinition>> {
		return this.base;
	}
}

export namespace UIStyle {
	/** A property that is used on {@link StyleStateOptions} to apply styles to hovered elements */
	export const STATE_HOVERED = Symbol("hovered");
	/** A property that is used on {@link StyleStateOptions} to apply styles to pressed elements */
	export const STATE_PRESSED = Symbol("pressed");
	/** A property that is used on {@link StyleStateOptions} to apply styles to focused elements */
	export const STATE_FOCUSED = Symbol("focused");
	/** A property that is used on {@link StyleStateOptions} to apply styles to disabled elements */
	export const STATE_DISABLED = Symbol("disabled");
	/** A property that is used on {@link StyleStateOptions} to apply styles to readonly elements */
	export const STATE_READONLY = Symbol("readonly");

	/**
	 * Type definition for an object that includes style state options
	 * @see {@link UITheme.StyleSelectorList}
	 */
	export type StyleStateOptions = {
		[STATE_HOVERED]?: boolean;
		[STATE_PRESSED]?: boolean;
		[STATE_FOCUSED]?: boolean;
		[STATE_DISABLED]?: boolean;
		[STATE_READONLY]?: boolean;
	};

	/** Type definition for a list of style definitions */
	export type StyleSelectorList<TDefinition> = Readonly<
		TDefinition & StyleStateOptions
	>[];

	/** Symbol that's used on override objects to reference the base style class */
	export const OVERRIDES_BASE = Symbol("style");

	/**
	 * An object that includes a base style reference and style overrides
	 * - This object is produced by {@link UIStyle.override()} and accepted as a valid value for the {@link UIStyle.TypeOrOverrides} type.
	 */
	export type StyleOverrides<TDefinition> = {
		[UIStyle.OVERRIDES_BASE]: { new (): UIStyle<TDefinition> };
		overrides: Array<Readonly<TDefinition> | undefined>;
	};

	export type Type<TDefinition> = {
		new (): UIStyle<TDefinition>;
		extend: typeof UIStyle.extend;
		override: typeof UIStyle.override;
	};

	/** A value that produces a valid style type or object */
	export type TypeOrOverrides<TDefinition> =
		| { new (): UIStyle<TDefinition> }
		| StyleOverrides<TDefinition>
		| TDefinition;
}
