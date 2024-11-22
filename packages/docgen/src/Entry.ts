/** The type of a documentation entry */
export const enum EntryType {
	ClassEntry = "class",
	InterfaceEntry = "interface",
	NamespaceEntry = "namespace",
	ConstructorEntry = "constructor",
	MethodEntry = "method",
	PropertyEntry = "property",
	FunctionEntry = "function",
	VariableEntry = "variable",
	TypeEntry = "type",
	Document = "doc",
}

/** A documentation entry with data from its declaration and docs comment */
export type Entry = {
	location: string;
	type: EntryType;
	root?: boolean;
	id: string;
	name: string;
	title: string;
	folder?: string;
	template?: string;
	content?: string;
	isStatic?: boolean;
	isProtected?: boolean;
	isPrivate?: boolean;
	isReadonly?: boolean;
	isAbstract?: boolean;
	inherits?: string[];
	signature?: string;
	abstract?: string;
	summary?: string;
	description?: string;
	notes?: string;
	examples?: string[];
	related?: string[];
	params?: [string, string][];
	throws?: string;
	returns?: string;
	parent?: string;
	isDeprecated?: boolean;
	deprecation?: string;
	hideConstructor?: boolean;
	hideDocs?: boolean;
	hideMembers?: boolean;
};
