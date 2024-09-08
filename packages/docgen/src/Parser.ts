import { Entry, EntryType } from "./Entry.js";
import { log } from "./Log.js";

/** @internal A list of entry types that are succeeded by a declaration block */
const BLOCK_TYPES = [
	EntryType.ClassEntry,
	EntryType.InterfaceEntry,
	EntryType.NamespaceEntry,
];

/** @internal Representation of an input line */
type LineData = {
	/** The length of the indentation that came before the text on this line */
	indent: number;

	/** The input text, whitespace trimmed on both sides */
	text: string;

	/** The parent entry, if any (set when parsing the declaration before) */
	parent?: Partial<Entry> & { id: string };
};

/**
 * A declaration file parser
 *
 * This class is responsible for parsing a single input file. It captures all lines of the input file and can generate an array of documented entries, each of type {@link Entry}. Both the declaration itself and the JSDoc comment preceding it are used.
 *
 * > Note: Only declarations with a corresponding JSDoc comment are parsed and included in the list. Other restrictions apply, please refer to the project README.
 */
export class Parser {
	/**
	 * Creates a new parser for the specified file
	 * @param fileName The name of the file, for later reference
	 * @param fileContent The file text, as a string
	 */
	constructor(
		public fileName: string,
		public fileContent: string,
	) {
		// split file content into separate lines, keep track of indentation
		this._lines = fileContent
			.replace(/\t/g, "  ")
			.split("\n")
			.map((s) => ({
				text: s.trim(),
				indent: s.replace(/\S.*/, "").length >> 1,
			}));
	}

	/** Returns all documented entries from the input file */
	getEntries(): Entry[] {
		let result: Entry[] = [];
		let lines = this._lines;
		for (let i = 0; i < lines.length; i++) {
			let line = this._lines[i]!;
			if (line.text.startsWith("/**")) {
				log.verbose("... considering " + this.fileName + ":" + (i + 1));

				// find end of JSDoc first
				let docStart = i;
				if (line.text.endsWith("/**")) docStart++;
				while (lines[i] && !lines[i]!.text.includes("*/")) i++;
				if (!lines[i]) {
					log.error(
						"Unexpected end of comment: " + this.fileName + ":" + (i + 1),
					);
					return result;
				}
				let docs = lines
					.slice(docStart, i + 1)
					.map((s) => s.text.replace(/\s*\*\/.*/, "").replace(/^\/?\*+ ?/, ""))
					.join("\n");

				// skip to start of code
				if (lines[i]?.text.endsWith("*/")) {
					i++;
					while (lines[i] && !lines[i]!.text) i++;
				}

				// parse declaration from this point onwards
				let entry = this._parseDeclaration(i, line.parent);
				if (!entry.id || !entry.signature) {
					log.error(
						"Invalid code after docs at: " + this.fileName + ":" + (i + 1),
					);
					continue;
				}
				if (!entry.signature!.endsWith(";")) {
					log.error("Expected semicolon at: " + this.fileName + ":" + (i + 1));
					log.error(entry.signature);
					return result;
				}
				log.verbose("> Found " + entry.id);

				// parse docs and add on to data
				this._parseDocs(docs, entry);
				result.push(entry as Entry);
				if (
					entry.type === EntryType.ConstructorEntry &&
					(entry.hideConstructor || line.parent?.hideConstructor)
				) {
					entry.isPrivate = true;
				}
			} else if (i && (line.parent || /^export \w/.test(line.text))) {
				// not a docs line, check for overloads
				let entry = this._parseDeclaration(i, line.parent, true);
				let prev = lines[i - 1]?.parent;
				if (
					prev &&
					((entry.id && entry.id === prev.id) ||
						entry.type === EntryType.NamespaceEntry)
				) {
					let overload = this._parseDeclaration(
						i,
						line.parent,
						false,
						entry.type !== EntryType.NamespaceEntry ? prev : undefined,
					);
					if (!BLOCK_TYPES.includes(entry.type!)) {
						if (!overload.signature!.endsWith(";")) {
							log.error(
								"Uncertain overload (no semicolon) at: " +
									this.fileName +
									":" +
									(i + 1),
							);
							log.error(overload.signature);
						}
						log.verbose(
							"Adding overload to " + entry.id + " (" + overload.type + ")",
						);
						prev.signature += "\n\n" + overload.signature;
					}
				}
			}
		}
		return result;
	}

	/** Parses a single declaration on the specified line */
	private _parseDeclaration(
		index: number,
		parent?: Partial<Entry> & { id: string },
		tentative?: boolean,
		overload?: Partial<Entry> & { id: string },
	): Partial<Entry> & { id: string } {
		let result: Partial<Entry> & { id: string } = {
			location: this.fileName + ":" + (index + 1),
			parent: parent?.id,
			id: "",
		};

		// read entire declaration block based on indentation if needed
		// (and mark block with current entry to identify as parent)
		let signature = this._markBlock(
			index,
			overload || (tentative ? undefined : result),
		);

		// find out the ID and name/title
		let decl = signature.replace(/<([^<>]|<[^>]+>)+>/s, "");
		let words = decl
			.replace(/[^\w$. \[\]].*/s, "")
			.trim()
			.split(" ");
		let id = words.pop()!;

		// check for extends/implements clause
		let inherits: string[] = [];
		while (
			words.length &&
			(words[words.length - 1] === "extends" ||
				words[words.length - 1] === "implements")
		) {
			// found an extends clause instead
			inherits.unshift(id);
			words.pop();
			id = words.pop()!;
		}
		if (/Decorator/.test(signature)) {
			id = "@" + id;
		}
		if (!id) return result;
		let name = (result.name = id);
		if (parent) id = (parent.id + "." + id).replace(".[", "[");
		result.id = id;
		result.inherits = inherits.length ? inherits : undefined;

		// check if maybe missed a parent entry
		if (!words.includes("export") && !parent && !tentative) {
			log.error("Missing parent entry for " + id + " at: " + result.location);
			return result;
		}

		// set a few modifiers using the signature (before ID)
		result.isPrivate =
			parent?.isPrivate || words.includes("private") || undefined;
		result.isReadonly = words.includes("readonly") || undefined;
		result.isStatic = words.includes("static") || undefined;
		result.isProtected = words.includes("protected") || undefined;
		result.isAbstract = words.includes("abstract") || undefined;

		// mark namespace entries also as static
		if (
			parent?.type === EntryType.NamespaceEntry ||
			parent?.type === EntryType.VariableEntry
		) {
			result.isStatic = true;
		}
		(result as any).parentType = parent?.type;

		// find out the type and title of this item
		let title = result.isStatic ? id : name;
		let type = EntryType.VariableEntry;
		if (words.includes("class")) {
			type = EntryType.ClassEntry;
			title = "class " + name;
		} else if (words.includes("namespace")) {
			type = EntryType.NamespaceEntry;
			title = "namespace " + name;
		} else if (words.includes("interface")) {
			type = EntryType.InterfaceEntry;
			title = "interface " + id;
		} else if (words.includes("function")) {
			type = EntryType.FunctionEntry;
			title = "function " + name + "()";
		} else if (words.includes("type")) {
			type = EntryType.TypeEntry;
			title = "type " + title;
		} else if (words.includes("enum")) {
			type = EntryType.TypeEntry;
			title = "enum " + title;
		} else if (parent && parent.type !== EntryType.NamespaceEntry) {
			if (name === "constructor") {
				type = EntryType.ConstructorEntry;
				title = "new " + parent.id + "()";
			} else if (words[0] === "get" || words[0] === "set") {
				type = EntryType.PropertyEntry;
			} else if (
				decl.indexOf("(") < 0 ||
				decl.indexOf(":") < decl.indexOf("(")
			) {
				type = EntryType.PropertyEntry;
			} else {
				title = title + "()";
				type = EntryType.MethodEntry;
			}
		}
		result.title = title;
		result.type = type;

		// fix signature based on type, tidy up declaration and JSDoc inside
		if (BLOCK_TYPES.includes(result.type!) || title.startsWith("enum ")) {
			// limit class/interface/namespace to block start
			signature = signature.replace(/\s*\{.*/s, ";");
		}
		result.signature = signature
			.replace(/^(export |declare )+/, "")
			.replace(/\n\s*\/\*\*([^\*]|\*[^\/])+\*\/\s*\n/g, "\n");

		// return the result
		return result;
	}

	/** Reads a declaration or block from the specified line, and marks its parent entry in the lines array */
	private _markBlock(idx: number, entry?: Partial<Entry> & { id: string }) {
		let start = idx;
		let lines = this._lines;
		let text = lines[idx]?.text || "";
		if (!text) return "";
		if (entry) lines[idx]!.parent = entry;

		// skip to end of comment on first line, if any
		text = text.replace(/.*\*\/\s*/, "");

		// check if next line is not indented; return single line
		let indent = lines[idx]!.indent;
		if (lines[idx + 1]!.indent! <= indent!) return text;

		// indent starts next line, look for block end
		while (lines[++idx]) {
			if (
				lines[idx]!.indent < indent ||
				(lines[idx]!.indent === indent &&
					/^(\/\*\*|export )/.test(lines[idx]!.text))
			) {
				// go back one if overshot (this line is another export)
				idx--;
				break;
			}
			if (entry) lines[idx]!.parent = entry;

			// check for some formatting oddities where the indentation returns
			// but the statement isn't over yet
			if (/[{([<]$/.test(lines[idx]!.text)) continue;
			if (lines[idx + 1] && lines[idx + 1]?.text.startsWith("?")) continue;

			// stop if this line is deindented
			if (lines[idx]!.text && lines[idx]!.indent <= indent) break;
		}
		return (
			text +
			"\n" +
			lines
				.slice(start + 1, idx + 1)
				.map((s) => "  ".repeat(s.indent - indent) + s.text)
				.join("\n")
		);
	}

	/** Parses the specified JSDoc string (without comment markers or remaining asterisks), and update given entry */
	private _parseDocs(docs: string, entry: Partial<Entry>): Partial<Entry> {
		if (!docs) return {};

		let [abstract, ...rest] = docs.split(/\r?\n/);
		if (abstract?.startsWith("@")) {
			rest.unshift(abstract);
			abstract = "";
		} else {
			abstract = abstract!.trim();
			if (abstract && !abstract.endsWith(".")) abstract += ".";
		}
		entry.abstract = abstract;

		let description: string[] = [];
		let summary: string[] = [];
		let notes: string[] = [];
		let contentTarget = notes;
		let examples: string[] = [];
		let currentExample = "";
		let params: [string, string][] = [];
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
				case "docgen":
					if (content.includes("{hide}")) entry.isPrivate = true;
					if (content.includes("{hidemembers}")) entry.hideMembers = true;
					if (content.includes("{hideconstructor}"))
						entry.hideConstructor = true;
					break;
				case "internal":
					entry.isPrivate = true;
					if (!abstract) entry.abstract = content;
					break;
				case "param":
					if (content.match(/^\w+\s*$/)) {
						nextTag = tag;
						nextParam = content;
						continue;
					}
					if (nextParam) content = nextParam + " " + content;
					let paramMatch = content.match(/^(\w+)\s+(.*)/) || ["", content];
					params.push([paramMatch[1] || "", paramMatch[2] || ""]);
					nextParam = undefined;
					break;
				case "return":
				case "returns":
					returns.push(content);
					contentTarget = returns;
					break;
				case "throw":
				case "throws":
				case "exception":
				case "error":
					throws.push(content);
					contentTarget = throws;
					break;
				case "see":
				case "seeAlso":
				case "related":
					related.push(content);
					break;
				case "example":
					if (tag && content) {
						log.error(
							"Example captions are not supported, at: " +
								this.fileName +
								":" +
								(line + 1),
						);
					}
					currentExample = "```ts\n" + line;
					break;
				case "deprecated":
					entry.isDeprecated = true;
					if (content.trim()) entry.deprecation = content;
					break;
				case "readonly":
					entry.isReadonly = true;
					break;
				case "summary":
					contentTarget = summary;
					if (content.trim()) summary.push(content);
					break;
				case "description":
					contentTarget = description;
					if (content.trim()) description.push(content);
					break;
				case "note":
					contentTarget.push("\n> Note: " + content + "\n");
					break;
				default:
					if (!tag) {
						if (!content && contentTarget !== summary) {
							// empty line: switch (back) to description content
							contentTarget = description;
							description.push("");
						} else {
							// otherwise, push to current block
							contentTarget.push(content);
						}
					}
			}
			nextTag = undefined;
		}
		if (currentExample) {
			examples.push(currentExample.trim() + "\n```");
		}
		entry.description = description.join("\n").trim() || undefined;
		entry.summary = summary.join("\n").trim() || undefined;
		entry.notes = notes.join("\n").trim() || undefined;
		entry.returns = returns.join("\n").trim() || undefined;
		entry.throws = throws.join("\n").trim() || undefined;
		if (examples.length) entry.examples = examples;
		if (related.length) entry.related = related;
		if (params.length) entry.params = params;
		return entry;
	}

	/** The list of lines from the input file */
	private _lines: LineData[];
}
