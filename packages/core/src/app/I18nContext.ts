import { DeferredString, fmt } from "@talla-ui/util";
import { ObservableObject } from "../object/index.js";

/**
 * An object that provides internationalization functionality for the current locale
 * - This object is used by {@link fmt()} and {@link Binding.fmt()} to translate and format strings.
 * - An instance of this class is available on the global application context, as {@link AppContext.i18n app.i18n}.
 * @see {@link DeferredString}
 */
export class I18nContext
	extends ObservableObject
	implements DeferredString.I18nProvider
{
	/** The current locale, if any */
	get locale() {
		return this._locale;
	}

	/** Configures the i18n context
	 * @summary This method can be used to set the current internationalization locale and options, which are used by {@link fmt()} and {@link Binding.fmt()} to translate and format strings. After using this method, re-render all views if needed using {@link AppContext.remount() app.remount()}.
	 * @param locale The name of the current locale.
	 * @param provider An object with (optional) methods that determine the behavior of the current locale, including translation and formatting. The current locale is cleared before applying the new methods.
	 */
	configure(locale: string, provider?: Partial<DeferredString.I18nProvider>) {
		this._locale = locale;
		this._provider = provider;
		DeferredString.setI18nInterface(this);
		this.emitChange();
		return this;
	}

	/**
	 * Sets the translations for the current locale
	 * - This method can be used to set the translations for the current locale, if the current provider methods passed to {@link configure()} do not include a custom `getText()` method.
	 * - If a `getText()` method is provided by the current provider instance, the translation dictionary is ignored.
	 * - The keys of the dictionary can be either the original strings **or** markers, which are used as `{#marker}` in the original string. Markers may not include spaces or `{` and `}` characters.
	 * @param dict A dictionary of translations, where the keys are the original strings **or** markers, and the values are the translated strings.
	 */
	setText(dict: Record<string, string>) {
		DeferredString.setI18nInterface(this);
		this._dict = dict;
	}

	/** Clears the current locale, methods, and translations */
	clear() {
		this._locale = undefined;
		this._provider = undefined;
		this._dict = undefined;
		return this;
	}

	/**
	 * Translates the provided text to the current locale, if necessary
	 * - This method is used by {@link DeferredString} to translate strings, and is part of the {@link DeferredString.I18nProvider} interface.
	 * - If a translation dictionary is set using {@link setText()}, it is used to translate the text. Any text not found is returned as is.
	 * @param text The text to translate
	 * @returns The translated text
	 */
	getText(text: string): string {
		if (this._provider?.getText) return this._provider.getText(text);
		if (this._dict) {
			let marker = text.match(/^\{\#([^\{\}\s]+)\}/)?.[1];
			if (marker) return this._dict?.[marker] || text;
			return this._dict?.[text] || text;
		}
		return text;
	}

	/**
	 * Chooses a plural form based on a specific quantity
	 * - This method is used by {@link DeferredString} to choose a plural form, and is part of the {@link DeferredString.I18nProvider} interface.
	 * @param n The quantity on which to base the plural form
	 * @param forms The list of plural forms from which to choose
	 * @returns The chosen plural form
	 */
	getPlural(n: number, forms: string[]): string {
		return this._provider?.getPlural?.(n, forms) || forms[n == 1 ? 0 : 1] || "";
	}

	/**
	 * Formats a value according to the specified type
	 * - This method is used by {@link DeferredString} to format values with the `:L` specifier, and is part of the {@link DeferredString.I18nProvider} interface.
	 * - By default, only `Date` values are formatted using `toLocaleDateString()` or `toLocaleString()`. Other values are formatted using the default `fmt()` behavior if no type is specified at all.
	 * @param value The value to format
	 * @param type The type of formatting to be performed, possibly with further options
	 * @returns The formatted value
	 */
	format(value: any, ...type: string[]): string {
		if (this._provider?.format) {
			return this._provider.format(value, ...type) || "";
		}
		if (value instanceof Date) {
			return type[0] === "date"
				? value.toLocaleDateString()
				: value.toLocaleString();
		}
		return type[0] ? "???" : fmt("{}", value).toString();
	}

	/**
	 * Returns current (user) culture preferences and/or locale defaults, as reported by the configured i18n provider
	 * - This method returns an object with culture-specific options, as used by e.g. localizable widgets. The exact properties of this object are intentionally application and platform specific. They may be initialized from defaults for the selected language and region, and extended with user preferences (to allow for e.g. `en-US` language with non-US date formatting).
	 * - The framework renderer itself may use at least the `textDirection` property, if present, to determine whether the current locale uses right-to-left script.
	 * @see {@link DeferredString.I18nProvider}
	 */
	getCulture() {
		return this._provider?.getCulture?.() || {};
	}

	private _locale?: string;
	private _provider?: Partial<DeferredString.I18nProvider>;
	private _dict?: Record<string, string>;
}
