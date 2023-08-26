/**
 * An interface that can be implemented to support a specific locale
 * - I18n providers are selected on the global application context. Refer to {@link GlobalContext.i18n app.i18n} for details.
 */
export interface I18nProvider {
	/**
	 * A method that's used to localize a string
	 * @summary This method is called primarily by {@link LazyString} (the result of {@link strf()}), for each string that should be translated. The implementation of this method may use a lookup table to provide a translation for a particular language, or it may return the same string if translation isn't necessary.
	 * @note The input string may include formatting and plural form placeholders; translated text should include the same placeholders.
	 *
	 * @example
	 * // Part of an I18nProvider implementation:
	 * getText(text: string): string {
	 *   return this.translationTable[text] || text;
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

	/**
	 * A method that's used to set the decimal separator for numeric values
	 * @summary This method is called once by {@link LazyString} to set the decimal separator (`.` or `,`) that will be used for number formatting while the {@link I18nProvider} is active.
	 */
	getDecimalSeparator(): string;
}
