/**
 * An interface that can be implemented to support a specific locale
 * - I18n providers are selected on the global application context. Refer to {@link AppContext.i18n app.i18n} for details.
 */
export interface I18nProvider {
	/**
	 * A method that returns information about the locale represented by this provider
	 * @summary This method must be implemented to provide information about the locale, such as the locale identifier (mandatory), text direction (only true if right-to-left), and decimal separator. The decimal separator defaults to `.` if not provided.
	 *
	 * @example
	 * // Part of an I18nProvider implementation:
	 * getAttributes(): I18nProvider.Attributes {
	 *   return {
	 *     locale: "en-US",
	 *     rtl: false,
	 *     decimalSeparator: ".",
	 *   };
	 * }
	 */
	getAttributes(): Readonly<I18nProvider.Attributes>;

	/**
	 * A method that's used to localize a string
	 * @summary This method is called primarily by {@link LazyString} (the result of {@link strf()}), for each string that should be translated. The implementation of this method may use a lookup table to provide a translation for a particular language, or it may return the same string if translation isn't necessary. Both the input and output strings may start with translation markers (up to the first space, i.e. `##MARKER_ID`) and descriptions (between `:` characters, i.e. `##MARKER_ID:Some description:`). These markers and descriptions can be used by this method, and will be removed from the output string.
	 * @note The input string may include formatting and plural form placeholders; translated text should include the same placeholders.
	 *
	 * @example
	 * // Part of an I18nProvider implementation:
	 * getText(text: string): string {
	 *   let marker = text.match(/^##([^: ]+)/)?.[1];
	 *   return this.translationTable[marker || text] || text;
	 * }
	 */
	getText(text: string): string;

	/**
	 * A method that's used to choose a plural form based on a specific quantity
	 * @summary This method is called primarily by {@link LazyString} (the result of {@link strf()}), for each plural form placeholder in a format string. The implementation of this method must return one of the plural forms from a list, based on the provided quantity. E.g. for the English language, plural forms may be `["email", "emails"]` or simply `["", "s"]`, where the first one should be chosen if the quantity is exactly 1, otherwise the second form. Other languages may require more than 2 plural forms and/or different rules to pick the correct form.
	 * @param n The quantity on which to base the plural form
	 * @param forms The list of plural forms from which to choose
	 *
	 * @example
	 * // Part of an I18nProvider implementation:
	 * getPlural(n: number, forms: string[]): string {
	 *   return forms[n == 1 ? 0 : 1] || "";
	 * }
	 */
	getPlural(n: number, forms: string[]): string;

	/**
	 * A method that's used to format a value
	 * @summary This method is called primarily by {@link LazyString} (the result of {@link strf()}), for each 'local' placeholder in a format string. The implementation of this method should support all types of formats that are necessary for the rest of the application, such as dates or currency values. The format type specified along with the 'local' placeholder is passed directly to this method, along with the value to be formatted.
	 * @param value The value to be formatted
	 * @param type The type of formatting to be performed, possibly with further options
	 *
	 * @example
	 * // Part of an I18nProvider implementation:
	 * format(value: any, ...type: string[]): string {
	 *   switch (type[0]) {
	 *     case "date":
	 *       return this.formatDate(value, type[1] || "short");
	 *     // ... other formats
	 *     default:
	 *       return "???";
	 *   }
	 * }
	 */
	format(value: any, ...type: string[]): string;
}

export namespace I18nProvider {
	/**
	 * Attributes that describe the locale and its formatting rules
	 * - These attributes can be used by the application to adjust its behavior based on the current locale
	 * - The `locale` attribute is required, while the others are optional
	 * - The `rtl` attribute should only be set to `true` if the writing direction for the locale is right-to-left
	 * - The `decimalSeparator` attribute is used to determine the decimal separator for numeric values, `.` or `,`; this attribute defaults to `.` if not provided
	 */
	export type Attributes = {
		/** The locale identifier, usually a combination of language and country codes */
		locale: string;
		/** The text direction, `true` for right-to-left */
		rtl?: boolean;
		/** The decimal separator for numeric values, `.` or `,` */
		decimalSeparator?: string;
	};
}
