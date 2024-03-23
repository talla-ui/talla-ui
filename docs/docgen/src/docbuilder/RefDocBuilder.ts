import { encode } from "html-entities";
import { DeclaredItem, DeclaredItemType, PackageParser } from "../index.js";
import { DocBuilder } from "./DocBuilder.js";
import { DocItem } from "./DocItem.js";

const SIGNATURE_KEYWORDS = [
	"class",
	"interface",
	"enum",
	"type",
	"const",
	"let",
	"extends",
	"implements",
	"protected",
	"abstract",
	"in",
	"of",
	"keyof",
	"typeof",
	"boolean",
	"string",
	"number",
	"object",
	"void",
	"null",
	"this",
	"any",
	"never",
	"unknown",
	"undefined",
	"readonly",
];

const REF_TYPES: { [type in DeclaredItemType]?: string } = {
	namespace: "class",
	class: "class",
	interface: "type",
	type: "type",
	constructor: "constructor",
	method: "function",
	function: "function",
	property: "var",
	variable: "var",
};

export class RefDocBuilder extends DocBuilder {
	static fromPackages(...packages: PackageParser[]) {
		let result = new RefDocBuilder();
		for (let p of packages) {
			result.addPackage(p);
		}
		return result;
	}

	packages: PackageParser[] = [];

	addPackage(p: PackageParser) {
		this.packages.push(p);
		for (let w of p.getWarnings()) this.warn(w);
		let index = p.getIndex();
		for (let item of index.values()) {
			if (!item.isPage) continue;
			this.addDeclarationItem(p, item).appendContent("{@import :ref}");
			this.addCrossRefItem(p, item);
		}
	}

	addDeclarationItem(p: PackageParser, decl: DeclaredItem) {
		let docItem = new DocItem(decl.id, undefined, undefined, "ref");
		this.addItem(docItem);
		docItem.data.package = p.id;
		docItem.data.parent = decl.parent;
		docItem.data.lang = "en-US";
		docItem.data.template = "ref";
		docItem.data.title = decl.id;
		docItem.data.crumb = decl.parent ? decl.type : "";

		// make nicer heading title
		let title = decl.id.replace(/.*[\.\[]/, "").replace(/[\[\]]/g, "");
		if (decl.type === DeclaredItemType.ConstructorItem && decl.parent) {
			title = "new " + decl.parent;
		} else if (decl.type === DeclaredItemType.ClassItem) {
			title = "class " + title;
		} else if (decl.type === DeclaredItemType.InterfaceItem) {
			title = "interface " + title;
		} else if (decl.type === DeclaredItemType.TypeItem) {
			title = "type " + title;
		}

		// compile tags and set as property
		let doctags = "";
		if (decl.isAbstract) doctags += "{@doctag abstract}";
		if (decl.isProtected) doctags += "{@doctag protected}";
		if (decl.isReadonly) doctags += "{@doctag readonly}";
		if (decl.isStatic) doctags += "{@doctag static}";
		if (doctags) docItem.data.doctags = doctags;

		// format signature and set as property
		let signature = this._formatSignature(p, decl);
		docItem.data.signature = signature;

		// format cross-ref link block and set as property
		let abstract = this._expandLinks(decl.abstract, p, decl);
		docItem.data.abstract = abstract;
		let refTitle = decl.title;
		if (refTitle.indexOf("}") >= 0) {
			this.warn("Title contains '}' character:", refTitle, "in", decl.fileName);
			refTitle = decl.id;
		}
		let refBlockLink = "{@link " + decl.id + " " + refTitle + "}";
		if (doctags) refBlockLink += " " + doctags;
		docItem.data.ref_title = refTitle;
		docItem.data.ref_blocklink = refBlockLink;
		docItem.data.ref_type = REF_TYPES[decl.type];
		docItem.data.menu_type = REF_TYPES[decl.type];
		docItem.data.menu_title = decl.title.replace(/\(.*/, "");

		// add title
		docItem.appendContent("# " + title.replace(/\./g, "\u200B."));

		// add abstract text, if any
		if (abstract) docItem.appendContent("> " + abstract);

		// add tags, if any
		if (doctags) docItem.appendContent("{@include doctags}");

		// add signature (pulled from property)
		if (signature) {
			docItem.appendContent(
				'<pre class="apisignature">{@include signature}</pre>',
			);
		}

		// add deprecation warning if needed
		if (decl.deprecation) {
			docItem.appendContent(
				"### Deprecated",
				this._expandLinks(decl.deprecation, p, decl),
			);
		}

		// add summary and/or notes
		if (decl.summary) {
			docItem.appendContent(
				"### Summary",
				this._expandLinks(decl.summary, p, decl),
			);
		}
		if (decl.notes) {
			docItem.appendContent(
				decl.notes.startsWith("> ") ? "" : "### Notes",
				this._expandLinks(decl.notes, p, decl),
			);
		}

		// add function/method information
		if (decl.params?.length) {
			docItem.appendContent(
				"### Parameters",
				decl.params.map((s) => "- " + this._expandLinks(s, p, decl)).join("\n"),
			);
		}
		if (decl.returns) {
			docItem.appendContent(
				"### Return value",
				this._expandLinks(decl.returns, p, decl),
			);
		}
		if (decl.throws?.length) {
			docItem.appendContent(
				"### Errors",
				decl.throws.map((s) => "- " + this._expandLinks(s, p, decl)).join("\n"),
			);
		}

		// add description
		if (decl.description) {
			docItem.appendContent(
				"## Description",
				this._expandLinks(decl.description, p, decl),
			);
		}

		// add examples
		if (decl.examples?.length) {
			docItem.appendContent(
				decl.examples.length > 1 ? "## Examples" : "## Example",
				decl.examples.join("\n\n"),
			);
		}

		return docItem;
	}

	addCrossRefItem(p: PackageParser, decl: DeclaredItem) {
		let docItem = new DocItem(decl.id + ":ref");
		this.addItem(docItem);
		docItem.data.package = p.id;

		// add all types of class/interface members
		// (use `+` link to add items to the menu)
		let members = PackageParser.findMembersFor(this.packages, decl);
		const addMemberSection = (id: string, entries: DeclaredItem[]) => {
			let text = entries
				.map((entry) => {
					let isChild = entry.parent === decl.id;
					return `- {@link ${entry.id}${isChild ? " +" : ""}}`;
				})
				.join("\n");
			docItem.appendContent(`## {@text ${id.toUpperCase()}}`, text);
		};

		if (
			members.construct &&
			!decl.hideConstructor &&
			!members.construct.hideConstructor
		) {
			addMemberSection("constructor", [members.construct]);
		}
		if (members.types?.length) {
			addMemberSection("typemembers", members.types);
		}
		if (members.static?.length) {
			addMemberSection("staticmembers", members.static);
		}
		if (members.nonstatic?.length) {
			addMemberSection("instancemembers", members.nonstatic);
		}
		if (members.deprecated?.length) {
			addMemberSection("deprecated", members.deprecated);
		}
		if (members.inherited?.length) {
			addMemberSection("inherited", members.inherited);
		}

		// add 'Related' section with links
		if (decl.related?.length || decl.parent) {
			let relatedList =
				(decl.parent ? `- {@link ${decl.parent}}\n` : "") +
				(decl.related
					?.map((s) => "- " + this._expandLinks(s, p, decl))
					.join("\n") || "");
			docItem.appendContent("## {@text RELATED}", relatedList);
		}

		return docItem;
	}

	private _formatSignature(p: PackageParser, declaration: DeclaredItem) {
		let signature =
			(declaration.signature || "") +
			(declaration.extendsNames || []).map((s) => "\n" + s).join("");

		return (
			signature
				// remove JSDoc first
				.replace(/\n\s*\/\*\*([^\*]|\*[^\/])+\*\/\s*\n/g, "\n")
				// split on strings and IDs (only those will match)
				.split(/(\"(?:[^\\\"]|\\.)*\"|[\w\.]+)/)
				// find IDs in the index
				.map((part) => {
					if (/^[A-Z]/.test(part)) {
						let found =
							p.findItem(part, declaration) ||
							PackageParser.findIn(this.packages, part);
						if (found && found.isPage && found.id !== declaration.id)
							return "{@link " + found.id + " " + part + "}";
					}
					return SIGNATURE_KEYWORDS.includes(part)
						? `<b>${part}</b>`
						: `${encode(part)}`;
				})
				.join("")
		);
	}

	private _expandLinks(
		text: string | undefined,
		p: PackageParser,
		declaration: DeclaredItem,
	) {
		return (text || "").replace(
			/\{@link\s+([^\s\(\)\}]+)([^\}]*)\}/g,
			(s, id, rest) => {
				let found =
					p.findItem(id, declaration) ||
					PackageParser.findIn(this.packages, id);
				if (found) {
					if (rest === "()") rest = " " + id + "()";
					if (!rest && found.id !== id) rest = " " + id;
					id = found.isPage ? found.id : "_";
					return "{@link " + id + rest + "}";
				}
				return s;
			},
		);
	}
}
