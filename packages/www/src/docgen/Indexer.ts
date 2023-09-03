import { DocGenOptions } from "./DocGenOptions.js";
import { NodeType, ParsedNode } from "./Parser.js";

export const enum IndexEntryType {
	ClassEntry = "class",
	InterfaceEntry = "interface",
	NamespaceEntry = "namespace",
	MethodEntry = "method",
	PropertyEntry = "property",
	FunctionEntry = "function",
	VariableEntry = "variable",
	TypeEntry = "type",
}

export type IndexEntry = {
	type: IndexEntryType;
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
	pagePath?: string;
	isDeprecated?: boolean;
	deprecation?: string;
	hideConstructor?: boolean;
	warnings: string[];
};

export class Indexer {
	constructor(
		public parsed: ParsedNode,
		public options: DocGenOptions,
	) {}

	getIndex() {
		return this._index;
	}

	build() {
		this._index.clear();
		this._addNode(this.parsed);

		// check if any entries should be pages but lack JSDoc source
		for (let entry of this._index.values()) {
			if (
				!entry.pagePath &&
				(entry.members?.length ||
					entry.type === IndexEntryType.MethodEntry ||
					entry.type === IndexEntryType.FunctionEntry ||
					entry.type === IndexEntryType.VariableEntry ||
					entry.type === IndexEntryType.TypeEntry ||
					entry.type === IndexEntryType.ClassEntry ||
					entry.type === IndexEntryType.InterfaceEntry ||
					entry.type === IndexEntryType.NamespaceEntry)
			) {
				entry.isPage = true;
				entry.pagePath = this.options.path + "/" + entry.id;
				if (this.options.warn) {
					entry.warnings.push("Missing JSDoc for page " + entry.id);
				}
			}
		}

		return this;
	}

	private _addNode(
		node: ParsedNode,
		prefix = "",
		parent?: IndexEntry,
		isStatic?: boolean,
	) {
		let warnings: string[] = [];
		if (!!node.name !== !!node.signature && this.options.warn) {
			warnings.push(
				"Name/signature mismatch: " + node.name + " / " + node.signature,
			);
		}
		let id: string | undefined;
		let entry: IndexEntry | undefined;
		if (node.name && node.signature) {
			// figure out ID and check for duplicates/errors
			id = (prefix + node.name).replace(/\.\[/, "[");
			if (node.modifiers?.includes("private")) return;
			if (node.name.startsWith("_") && this.options.warn) {
				warnings.push("Exposed private name: " + id);
			}
			if (this._index.has(id)) {
				if (node.jsdoc && this.options.warn) {
					warnings.push("Pointless JSDoc override: " + id);
				}
				if (node.nodes) {
					for (let n of node.nodes)
						this._addNode(n, id + ".", this._index.get(id), true);
				}
				if (
					node.type === NodeType.MethodDefinition ||
					node.type === NodeType.PropertyDefinition
				) {
					let mainEntry = this._index.get(id);
					if (
						mainEntry &&
						mainEntry.signature &&
						node.signature &&
						node.signature !== mainEntry.signature
					) {
						mainEntry.signature += "\n\n" + node.signature;
					}
				}
				return;
			}

			// determine type and make up an intuitive title
			let title = node.name;
			let type: IndexEntryType;
			if (node.signature.startsWith("class")) {
				type = IndexEntryType.ClassEntry;
				title = "class " + title;
			} else if (node.signature.startsWith("interface")) {
				type = IndexEntryType.InterfaceEntry;
				title = "interface " + title;
			} else if (node.signature.startsWith("namespace")) {
				type = IndexEntryType.NamespaceEntry;
				title = "namespace " + title;
			} else if (node.type === NodeType.MethodDefinition) {
				type = IndexEntryType.MethodEntry;
				title += "(" + (node.paramNames || []).join(", ") + ")";
			} else if (node.type === NodeType.PropertyDefinition) {
				type = IndexEntryType.PropertyEntry;
			} else if (node.type === NodeType.TypeDefinition) {
				type = IndexEntryType.TypeEntry;
				title = "type " + title;
			} else if (node.type === NodeType.GlobalVar) {
				if (node.paramNames) {
					type = IndexEntryType.FunctionEntry;
					title =
						"function " +
						node.name +
						"(" +
						(node.paramNames || []).join(", ") +
						")";
				} else {
					type = IndexEntryType.VariableEntry;
				}
			} else {
				if (this.options.warn) {
					warnings.push("Unknown item type: " + id + " " + NodeType[node.type]);
				}
				return;
			}

			// add prefix if this entry is static
			if (node.modifiers?.includes("static")) title = prefix + title;
			else if (isStatic)
				title = title.replace(/^(interface|type) /, "$1 " + prefix);

			// add to index
			entry = {
				id,
				type,
				title,
				name: node.name,
				isStatic:
					isStatic ||
					node.modifiers?.includes("static") ||
					parent?.type === IndexEntryType.NamespaceEntry,
				isAbstract: node.modifiers?.includes("abstract"),
				isReadonly: node.modifiers?.includes("readonly"),
				isProtected: node.modifiers?.includes("protected"),
				signature: node.signature,
				parent: parent?.id,
				warnings,
				...this._parseJSDoc(node.jsdoc),
			};
			this._index.set(id, entry);
			if (parent) {
				if (!parent.members) parent.members = [];
				parent.members.push(id);
			}
			if (entry.params || entry.returns || entry.description?.length) {
				entry.isPage = true;
				entry.pagePath = this.options.path + "/" + id;
			}

			// hide constructors if needed (either from parent JSDoc or own)
			if (
				(entry.hideConstructor || parent?.hideConstructor) &&
				entry.name === "constructor"
			) {
				entry.isPage = false;
				entry.pagePath = "";
			}

			// add inheritance ID
			if (node.extendsNames?.length) {
				entry.extendsNames = node.extendsNames;
				let match = node.extendsNames[0]?.match(/^extends\s+([\w\.]+)/);
				if (match && match[1]) entry.inherits = match[1];
			}
		}
		if (node.nodes) {
			for (let n of node.nodes)
				this._addNode(n, id ? id + "." : "", entry || parent);
		}
	}

	private _parseJSDoc(jsdoc: string | undefined): Partial<IndexEntry> {
		if (!jsdoc) return {};

		let [abstract, ...rest] = jsdoc.split(/\r?\n/);
		if (abstract?.startsWith("@")) {
			rest.unshift(abstract);
			abstract = "";
		} else {
			abstract = abstract!.trim();
			if (abstract && !abstract.endsWith(".")) abstract += ".";
		}

		let result: Partial<IndexEntry> = { abstract };
		let inSummary = false;
		let inDescription = false;
		let description: string[] = [];
		let summary: string[] = [];
		let notes: string[] = [];
		let examples: string[] = [];
		let currentExample = "";
		let params: string[] = [];
		let returns: string[] = [];
		let throws: string[] = [];
		let related: string[] = [];
		let nextTag: string | undefined;
		let nextParam: string | undefined;
		for (let i = 0; i < rest.length; i++) {
			let line = rest[i]!;
			let match = line.match(/^\@(\w+)(?:\s+(.*)|$)/);
			let tag = match?.[1];
			let content = tag ? match?.[2]?.trim() || "" : line.trimEnd();
			if (tag && !content && !/^\s*\@/.test(rest[i + 1] || "")) {
				nextTag = tag;
				continue;
			}
			if (currentExample) {
				if (!tag && !nextTag) {
					currentExample += "\n" + line;
					continue;
				} else {
					examples.push(currentExample.trim() + "\n```");
					currentExample = "";
				}
			}
			switch (tag || nextTag) {
				case "param":
					if (content.match(/^\w+\s*$/)) {
						nextTag = tag;
						nextParam = content;
						continue;
					}
					if (nextParam) content = nextParam + " " + content;
					params.push((content || "").replace(/^(\w+)/, "**$1** —"));
					nextParam = undefined;
					break;
				case "return":
				case "returns":
					returns.push(content);
					break;
				case "throw":
				case "throws":
				case "exception":
				case "error":
					throws.push(content);
					break;
				case "see":
				case "seeAlso":
				case "related":
					related.push(content);
					break;
				case "example":
					if (tag && content) {
						throw Error("Example captions are not supported: " + line);
					}
					currentExample = "```ts\n" + line;
					break;
				case "hideconstructor":
					result.hideConstructor = true;
					break;
				case "deprecated":
					result.isDeprecated = true;
					if (content.trim()) result.deprecation = content;
					break;
				case "readonly":
					result.isReadonly = true;
					break;
				case "summary":
					inSummary = true;
					if (content.trim()) summary.push(content);
					break;
				case "description":
					inDescription = true;
					if (content.trim()) description.push(content);
					break;
				case "note":
					(inDescription ? description : inSummary ? summary : notes).push(
						"\n> " + content + "\n",
					);
					break;
				default:
					if (!tag) {
						(inDescription ? description : inSummary ? summary : notes).push(
							content,
						);
					}
			}
			nextTag = undefined;
		}
		if (currentExample) {
			examples.push(currentExample.trim() + "\n```");
		}
		result.description = description.join("\n").trim();
		result.summary = summary.join("\n").trim();
		result.notes = notes.join("\n").trim();
		result.returns = returns.join("\n").trim();
		if (examples) result.examples = examples;
		if (related) result.related = related;
		if (params) result.params = params;
		if (throws) result.throws = throws;
		return result;
	}

	private _index = new Map<string, IndexEntry>();
}
