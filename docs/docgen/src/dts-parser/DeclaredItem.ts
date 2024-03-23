export const enum DeclaredItemType {
	ClassItem = "class",
	InterfaceItem = "interface",
	NamespaceItem = "namespace",
	ConstructorItem = "constructor",
	MethodItem = "method",
	PropertyItem = "property",
	FunctionItem = "function",
	VariableItem = "variable",
	TypeItem = "type",
}

export type DeclaredItem = {
	fileName: string;
	type: DeclaredItemType;
	id: string;
	name: string;
	title: string;
	isStatic?: boolean;
	isProtected?: boolean;
	isReadonly?: boolean;
	isAbstract?: boolean;
	members?: string[];
	extendsNames?: string[];
	inherits?: string;
	signature?: string;
	abstract?: string;
	summary?: string;
	description?: string;
	notes?: string;
	examples?: string[];
	related?: string[];
	params?: string[];
	throws?: string[];
	returns?: string;
	parent?: string;
	isPage?: boolean;
	isDeprecated?: boolean;
	deprecation?: string;
	hideConstructor?: boolean;
	hideDocs?: boolean;
};

export type DeclaredItemMembers = {
	construct?: DeclaredItem;
	static: DeclaredItem[];
	types: DeclaredItem[];
	nonstatic: DeclaredItem[];
	inherited: DeclaredItem[];
	staticInherited: DeclaredItem[];
	deprecated: DeclaredItem[];
};
