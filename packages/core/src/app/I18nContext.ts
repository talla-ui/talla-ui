import { DeferredString, fmt } from "@talla-ui/util";

/**
 * An object that provides internationalization functionality for the current locale
 * - This object is used by {@link fmt()} and {@link bind.fmt()} to translate and format strings.
 * - An instance of this class is available on the global application context, as {@link AppContext.i18n app.i18n}.
 * @see {@link DeferredString}
 */
export class I18nContext implements DeferredString.I18nProvider {
	/** The current locale, if any */
	get locale() {
		return this._locale;
	}

	/** Configures the i18n context
	 * @summary This method can be used to set the current internationalization locale and options, which are used by {@link fmt()} and {@link bind.fmt()} to translate and format strings. After using this method, re-render all views if needed using {@link AppContext.remount() app.remount()}.
	 * @param locale The name of the current locale.
	 * @param provider An object with (optional) methods that determine the behavior of the current locale, including translation and formatting. The current locale is cleared before applying the new methods.
	 */
	configure(locale: string, provider?: Partial<DeferredString.I18nProvider>) {
		this._locale = locale;
		this._provider = provider;
		DeferredString.setI18nInterface(this);
		return this;
	}

	/**
	 * Sets the translations for the current locale
	 * - This method can be used to set the translations for the current locale, if the current provider methods passed to {@link configure()} do not include a custom `getText()` method.
	 * - If a `getText()` method is provided, the translation dictionary is ignored.
	 * - The keys of the dictionary can be either the original strings **or** markers, which are used as `{#marker}` in the original string. Markers may not include spaces or `{` and `}` characters.
	 * @param dict A dictionary of translations, where the keys are the original strings **or** markers, and the values are the translated strings.
	 */
	setTranslations(dict: Record<string, string>) {
		DeferredString.setI18nInterface(this);
		this._dict = dict;
	}

	/** Clears the current locale, methods, and translations */
	clear() {
		this._locale = undefined;
		this._provider = undefined;
		this._dict = undefined;
		DeferredString.setI18nInterface();
		return this;
	}

	/**
	 * Translates the provided text to the current locale, if necessary
	 * - This method is used by {@link DeferredString} to translate strings, and is part of the {@link DeferredString.I18nProvider} interface.
	 * - If a translation dictionary is set using {@link setTranslations()}, it is used to translate the text. Any text not found is returned as is.
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
	 * - This method is used by {@link DeferredString} to format values, and is part of the {@link DeferredString.I18nProvider} interface.
	 * @param value The value to format
	 * @param type The type of formatting to be performed, possibly with further options
	 * @returns The formatted value
	 */
	format(value: any, ...type: string[]): string {
		return (
			this._provider?.format?.(value, ...type) ||
			(type[0] ? "???" : fmt("{}", value).toString())
		);
	}

	/** Returns true if the current locale uses right-to-left script */
	isRTL(): boolean {
		return !!this._provider?.isRTL?.();
	}

	private _locale?: string = undefined;
	private _provider?: Partial<DeferredString.I18nProvider>;
	private _dict?: Record<string, string>;
}
