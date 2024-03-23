import { readFileSync } from "node:fs";
import * as path from "node:path";
import { glob } from "glob";
import { FileParser, ParsedNode, NodeType } from "./FileParser.js";
import {
	DeclaredItem,
	DeclaredItemMembers,
	DeclaredItemType,
} from "./DeclaredItem.js";

export class PackageParser {
	static findIn(packages: PackageParser[], id?: string) {
		if (!id) return undefined;
		for (let p of packages) {
			let found = p.findItem(id);
			if (found) return found;
		}
	}

	static findMembersFor(
		packages: PackageParser[],
		entry: DeclaredItem,
	): DeclaredItemMembers {
		if (!entry) throw Error("No index entry");

		// find ancestor to get inherited entries first
		let ancestor = this.findIn(packages, entry.inherits);
		let inherited: Partial<DeclaredItemMembers> = ancestor
			? this.findMembersFor(packages, ancestor)
			: {};

		// filter out deprecated entries, add to separate array
		let deprecated: DeclaredItem[] = [];
		let members = (
			entry.members?.map((id) => this.findIn(packages, id)) || []
		).filter((a): a is DeclaredItem => {
			if (a && a.isDeprecated) deprecated.push(a);
			return !(!a || a.isDeprecated);
		});

		// filter out string property members with no JSDoc
		members = members.filter((a) => a.isPage || a.name.indexOf('["') < 0);

		/** A helper function to remove duplicate inherited names */
		function dedup(...list: DeclaredItem[]) {
			let result: DeclaredItem[] = [];
			for (let entry of list) {
				let dup = members.find((m) => m.name === entry!.name);
				if (!dup) {
					// no duplicate found, add inherited item
					result.push(entry);
				} else if (!dup.abstract && (entry.abstract || entry.isStatic)) {
					// duplicate has no description, remove it instead
					members = members.filter((m) => m !== dup);
					result.push(entry);
				}
			}
			return result;
		}

		// combine inherited members and remove overrides with no jsdoc
		let staticInherited = dedup(
			...(inherited.static || []),
			...(inherited.staticInherited || []),
		);
		let nonstaticInherited = dedup(
			...(inherited.nonstatic || []),
			...(inherited.inherited || []),
		);

		// return lists of (inherited) member entries
		return {
			construct:
				members.find(
					(a) => a.type === DeclaredItemType.ConstructorItem && a.isPage,
				) || inherited.construct,
			static: members.filter(
				(a) =>
					a?.isStatic &&
					a.type !== DeclaredItemType.TypeItem &&
					a.type !== DeclaredItemType.InterfaceItem &&
					a.type !== DeclaredItemType.ClassItem,
			),
			types: members.filter(
				(a) =>
					a?.isStatic &&
					(a.type === DeclaredItemType.TypeItem ||
						a.type === DeclaredItemType.InterfaceItem ||
						a.type === DeclaredItemType.ClassItem),
			),
			nonstatic: members.filter(
				(a) => a && a.type !== DeclaredItemType.ConstructorItem && !a.isStatic,
			),
			inherited: nonstaticInherited,
			staticInherited,
			deprecated,
		};
	}

	constructor(
		public id: string,
		public inputGlob: string,
	) {
		// enable warnings by default
		this._warn = true;
	}

	enableDebugOutput(enable?: boolean) {
		this._debugOutput = enable;
		return this;
	}

	enableWarnings(enable?: boolean) {
		this._warn = enable;
		return this;
	}

	parse() {
		this._index.clear();
		let files = glob.sync(this.inputGlob);
		for (let file of files) {
			if (this._debugOutput) console.log(`Parsing ${file} ...`);
			let content = readFileSync(file, "utf8").toString();
			let parser = new FileParser(
				path.resolve(file),
				content,
				this._debugOutput,
			);
			this._addNode(parser.parse());
		}
		return this;
	}

	getWarnings(): ReadonlyArray<string> {
		return this._allWarnings;
	}

	getIndex() {
		return this._index;
	}

	hasItem(id: string) {
		return this._index.has(id);
	}

	findItem(id: string, context?: DeclaredItem) {
		// always try root first
		let item = this._index.get(id);
		if (item) return item;

		// otherwise, try context and its parents (reverse order)
		while (context) {
			let prefix = context.id + ".";
			if (this._index.has(prefix + id)) {
				return this._index.get(prefix + id);
			}
			context = context.parent ? this._index.get(context.parent) : undefined;
		}
	}

	private _addNode(
		node: ParsedNode,
		prefix = "",
		parent?: DeclaredItem,
		isStatic?: boolean,
	) {
		if (!!node.name !== !!node.signature && this._warn) {
			this._allWarnings.push(
				"Name/signature mismatch: " + node.name + " / " + node.signature,
			);
		}
		if (node.name && node.signature) {
			// figure out ID and check for duplicates/errors
			let id = (prefix + node.name).replace(/\.\[/, "[");
			if (node.modifiers?.includes("private")) return;
			if (node.name.startsWith("_") && this._warn) {
				this._allWarnings.push(
					"Exposed private name: " + id + " in " + node.fileName,
				);
			}
			if (this._index.has(id)) {
				if (node.jsdoc && this._warn) {
					let existing = this._index.get(id)!;
					this._allWarnings.push(
						"Pointless JSDoc override:\n> " +
							node.fileName +
							":\n  " +
							node.signature +
							"\n< " +
							existing.fileName +
							":\n  " +
							existing.signature,
					);
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
			let type: DeclaredItemType;
			if (node.signature.startsWith("class")) {
				type = DeclaredItemType.ClassItem;
				title = "class " + title;
			} else if (node.signature.startsWith("interface")) {
				type = DeclaredItemType.InterfaceItem;
				title = "interface " + title;
			} else if (node.signature.startsWith("namespace")) {
				type = DeclaredItemType.NamespaceItem;
				title = "namespace " + title;
			} else if (node.type === NodeType.MethodDefinition) {
				let isConstructor = node.name === "constructor";
				type = isConstructor
					? DeclaredItemType.ConstructorItem
					: DeclaredItemType.MethodItem;
				title += "(" + (node.paramNames || []).join(", ") + ")";
			} else if (node.type === NodeType.PropertyDefinition) {
				type = DeclaredItemType.PropertyItem;
			} else if (node.type === NodeType.TypeDefinition) {
				type = DeclaredItemType.TypeItem;
				title = "type " + title;
			} else if (node.type === NodeType.GlobalVar) {
				if (node.paramNames) {
					type = DeclaredItemType.FunctionItem;
					title =
						"function " +
						node.name +
						"(" +
						(node.paramNames || []).join(", ") +
						")";
				} else {
					type = DeclaredItemType.VariableItem;
				}
			} else {
				if (this._warn) {
					this._allWarnings.push(
						"Unknown item type: " +
							id +
							" " +
							NodeType[node.type] +
							" in " +
							node.fileName,
					);
				}
				return;
			}

			// add prefix if this entry is static
			if (node.modifiers?.includes("static")) title = prefix + title;
			else if (isStatic)
				title = title.replace(/^(interface|type) /, "$1 " + prefix);

			// parse JSDoc attributes
			let jsdocAttr = this._parseJSDoc(node.jsdoc);
			if (jsdocAttr.hideDocs) return;

			// add to index
			let entry: DeclaredItem = {
				fileName: node.fileName,
				id,
				type,
				title,
				name: node.name,
				isStatic:
					isStatic ||
					node.modifiers?.includes("static") ||
					parent?.type === DeclaredItemType.NamespaceItem,
				isAbstract: node.modifiers?.includes("abstract"),
				isReadonly: node.modifiers?.includes("readonly"),
				isProtected: node.modifiers?.includes("protected"),
				signature: node.signature,
				parent: parent?.id,
				...jsdocAttr,
			};
			this._index.set(id, entry);

			if (parent) {
				if (!parent.members) parent.members = [];
				parent.members.push(id);
			}
			if (entry.params || entry.returns || entry.description?.length) {
				entry.isPage = true;
			}

			// hide constructors if needed (either from parent JSDoc or own)
			if (
				(entry.hideConstructor || parent?.hideConstructor) &&
				entry.type === DeclaredItemType.ConstructorItem
			) {
				entry.isPage = false;
			}

			// add inheritance ID
			if (node.extendsNames?.length) {
				entry.extendsNames = node.extendsNames;
				let match = node.extendsNames[0]?.match(/^extends\s+([\w\.]+)/);
				if (match && match[1]) entry.inherits = match[1];
			}

			// add child nodes
			if (node.nodes) {
				for (let n of node.nodes) this._addNode(n, id + ".", entry);
			}
		} else if (node.nodes) {
			// add child nodes under parent
			for (let n of node.nodes) this._addNode(n, "", parent);
		}
	}

	private _parseJSDoc(jsdoc: string | undefined): Partial<DeclaredItem> {
		if (!jsdoc) return {};

		let [abstract, ...rest] = jsdoc.split(/\r?\n/);
		if (abstract?.startsWith("@")) {
			rest.unshift(abstract);
			abstract = "";
		} else {
			abstract = abstract!.trim();
			if (abstract && !abstract.endsWith(".")) abstract += ".";
		}

		let result: Partial<DeclaredItem> = { abstract };
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
				case "hidedocs":
					result.hideDocs = true;
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
						"\n> **Note**<br>" + content + "\n",
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

	private _index = new Map<string, DeclaredItem>();
	private _debugOutput?: boolean;
	private _warn?: boolean;
	private _allWarnings: string[] = [];
}
