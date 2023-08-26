import type { PackageDocs } from "./PackageDocs";

/** Keys for all localizable strings */
export type DOC_STRINGS =
	| "GuideBacklinks"
	| "Deprecated"
	| "Summary"
	| "Notes"
	| "Parameters"
	| "ReturnValue"
	| "Errors"
	| "Description"
	| "Example"
	| "Examples"
	| "Constructor"
	| "StaticMembers"
	| "Types"
	| "InstanceMembers"
	| "InheritedMembers"
	| "DeprecatedMembers"
	| "Related"
	| "Exports"
	| "ClassType"
	| "InterfaceType"
	| "NamespaceType"
	| "MethodType"
	| "PropertyType"
	| "FunctionType"
	| "VariableType"
	| "TypeType";

/** Options that are shared among all docgen classes */
export type DocGenOptions = {
	/** Path (glob) for all .d.ts files to process */
	dtsPath: string;
	/** Base path for all pages */
	path: string;
	/** Docs with index that should be included in ancestor/reference search */
	parentDocs?: PackageDocs;
	/** Enable warnings */
	warn?: boolean;
	/** Enable warnings for `@link`s not found */
	warnLinks?: boolean;
	/** Enable debug output for parser */
	parserDebug?: boolean;
	/** Localized strings (one for each in DOC_STRINGS) */
	strings: { [s in DOC_STRINGS]: string };
	/** Additional data for all generated API pages */
	pageData: any;
	/** Auxiliary pages that should be generated (paths to markdown files) */
	guidePages: string[];
};
