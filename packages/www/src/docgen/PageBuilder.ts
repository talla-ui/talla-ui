import { Pipeline } from "markdown-pipeline";
import { IndexEntry, IndexEntryType } from "./Indexer.js";
import { DocGenOptions } from "./DocGenOptions.js";

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

export class PageBuilder {
	constructor(
		public pipeline: Pipeline,
		public index: Map<string, IndexEntry>,
		public id: string,
		public options: DocGenOptions,
	) {}

	/** Creates a page for an index entry with the current ID */
	async createEntryPageAsync() {
		if (this.options.parentDocs) {
			this._parentIndex = await this.options.parentDocs.getIndexAsync();
		}

		// find entry for given ID
		let entry = this.index.get(this.id)!;
		if (!entry?.pagePath) return;
		this._warnings.push(...entry.warnings);

		// fix up the page title a bit
		let title = this.id.replace(/.*[\.\[]/, "").replace(/[\[\]]/g, "");
		if (title === "constructor") {
			title = "new " + entry.parent;
		}
		if (entry.parent && this.index.get(entry.parent)?.type === "function") {
			title = entry.id;
		}

		// get page content and format it
		let text = this._format(await this._getEntryContentAsync(entry, title));
		let abstract = this._format(entry.abstract || "");

		// create a pipeline source with formatted text and all data
		return this.pipeline.addSource(this.id, text, {
			...this.options.pageData,
			output: this.id.replace(/\.([A-Z])|[^\w\.\-_]/g, "__$1") + ".html",
			warnings: this._warnings,
			id: this.id,
			nav_title: this.id,
			type: entry.type,
			parent: entry.parent,
			nav_uplink: this._makeParentLink(entry),
			title,
			subject: entry.title,
			abstract,
			doctags: {
				abstract: entry.isAbstract,
				readonly: entry.isReadonly,
				protected: entry.isProtected,
				static: entry.isStatic,
				deprecated: entry.isDeprecated,
			},
		});
	}

	/** Creates a page with given text, with replacement of def and link tags */
	async createGuidePageAsync(text: string) {
		if (this.options.parentDocs) {
			this._parentIndex = await this.options.parentDocs.getIndexAsync();
		}

		// create a pipeline source with formatted text and all data
		let page = this.pipeline.addSource(this.id, this._format(text), {
			...this.options.pageData,
		});
		page.data.abstract = this._format(page.data.abstract || "");
		page.data.nav_title ||= page.data.title;
		page.data.subject ||= page.data.title;

		// add page header
		page.source.unshift(
			`# ${page.data.title || "???"}\n`,
			`<!--{{abstract}}-->\n`,
		);

		// add breadcrumb
		if (page.data.nav_uplink) {
			page.data.nav_uplink =
				this._format(page.data.nav_uplink || "") || undefined;
			page.source.unshift(
				`<!--{{breadcrumb name="${this.options.strings.GuideBacklinks}"}}-->\n`,
			);
		} else {
			let uplink = this.pipeline.escapeHtml(
				page.data.breadcrumb_uplink || "[Docs](../)",
			);
			let name = this.pipeline.escapeHtml(
				page.data.breadcrumb_name || "Reference",
			);
			page.source.unshift(
				`<!--{{breadcrumb uplink="${uplink}" name="${name}"}}-->\n`,
			);
		}

		// add a section with automatic guide backlinks
		page.source.push("\n<!--{{guidebacklinks}}-->");

		// add warnings (e.g. from links)
		if (!page.data.warnings) page.data.warnings = [];
		page.data.warnings.push(...this._warnings);
	}

	/** Creates a _toc partial, with a list of exposed index entries */
	async createTocAsync() {
		let toc = "\n";
		let entries = Array.from(this.index.values());
		entries.sort((a, b) => (a.id.toLowerCase() > b.id.toLowerCase() ? 1 : -1));
		for (let entry of entries) {
			if (entry.pagePath && !entry.parent) {
				toc += `- {@ref ${entry.id}}\n`;
			}
		}
		return this.pipeline.addSource(this.id, this._format(toc), {
			partial: true,
			warnings: this._warnings,
		});
	}

	/** Generates automatic page content for given index entry */
	private async _getEntryContentAsync(entry: IndexEntry, title: string) {
		if (!entry) throw Error("No index entry");
		let strings = this.options.strings;

		// add page header
		let uplink = this.pipeline.escapeHtml(
			this._makeParentLink(entry) || `<a href="./">${strings.Exports}</a>`,
		);
		let content =
			`<!--{{breadcrumb uplink="${uplink}" name="${this._getTypeString(
				entry,
			)}"}}-->\n\n` +
			`# ${title}\n\n` +
			(entry.abstract ? `<!--{{abstract}}-->\n\n` : "");

		// add tags below the title
		const addDocTag = (tag: string) =>
			(content += `<span class="doctag doctag--${tag}">${tag}</span>`);
		if (entry.isAbstract) addDocTag("abstract");
		if (entry.isProtected) addDocTag("protected");
		if (entry.isReadonly) addDocTag("readonly");
		if (entry.isStatic) addDocTag("static");
		content += "\n";

		// add signature, if any
		if (entry.signature) {
			content +=
				"\n\n" +
				"<!--{{html-attr class=apisignature}}-->\n<pre>" +
				this._formatSignature(entry, entry.signature) +
				(entry.extendsNames?.length
					? entry.extendsNames
							.map((s) => "<br>" + this._formatSignature(entry, "  " + s))
							.join("")
					: "") +
				"\n</pre>\n";
		}

		// add deprecation warning if needed
		if (entry.deprecation) {
			content +=
				`\n### ${strings.Deprecated} {#deprecation}\n\n` +
				entry.deprecation +
				"\n";
		}

		// add summary and/or notes
		if (entry.summary) {
			content +=
				`\n### ${strings.Summary} {#summary}\n\n` + entry.summary + "\n";
		}
		if (entry.notes) {
			content += `\n### ${strings.Notes} {#notes}\n\n` + entry.notes + "\n";
		}

		// add function/method information
		if (entry.params?.length) {
			content +=
				`\n### ${strings.Parameters} {#params}\n\n` +
				entry.params.map((s) => "- " + s).join("\n") +
				"\n";
		}
		if (entry.returns) {
			content +=
				`\n### ${strings.ReturnValue} {#returns}\n\n` + entry.returns + "\n";
		}
		if (entry.throws?.length) {
			content +=
				`\n### ${strings.Errors} {#throws}\n\n` +
				entry.throws.map((s) => "- " + s).join("\n") +
				"\n";
		}

		// add extended description
		if (entry.description) {
			content +=
				`\n## ${strings.Description} {#description}\n\n` +
				entry.description +
				"\n";
		}

		// add examples (already formatted by indexer)
		if (entry.examples?.length) {
			let heading =
				entry.examples.length > 1 ? strings.Examples : strings.Example;
			content +=
				`\n## ${heading} {#examples}\n\n` + entry.examples.join("\n\n") + "\n";
		}

		// add a section with automatic guide backlinks
		content += "\n<!--{{guidebacklinks}}-->\n";

		// add all types of class/interface members
		let members = this._getMembers(entry);
		const makeMemberSection = (
			title: string,
			id: string,
			entries: IndexEntry[],
		) =>
			`\n## ${title} {#${id}}\n\n` +
			entries.map((entry) => `- {@ref ${entry.id}}`).join("\n") +
			"\n";
		if (
			members.construct &&
			!entry.hideConstructor &&
			!members.construct.hideConstructor
		) {
			content += makeMemberSection(strings.Constructor, "#constructor", [
				members.construct,
			]);
		}
		if (members.types?.length) {
			content += makeMemberSection(strings.Types, "#types", members.types);
		}
		if (members.static?.length) {
			content += makeMemberSection(
				strings.StaticMembers,
				"#static",
				members.static,
			);
		}
		if (members.nonstatic?.length) {
			content += makeMemberSection(
				strings.InstanceMembers,
				"#instance",
				members.nonstatic,
			);
		}
		if (members.inherited?.length) {
			content += makeMemberSection(
				strings.InheritedMembers,
				"#inherited",
				members.inherited,
			);
		}
		if (members.deprecated?.length) {
			content += makeMemberSection(
				strings.DeprecatedMembers,
				"#deprecated",
				members.deprecated,
			);
		}

		// add 'Related' section with links
		if (entry.related?.length || entry.parent) {
			let overridden = this._getOverridden(entry);
			content +=
				`\n## ${strings.Related} {#related}\n\n` +
				((entry.parent ? `- {@link ${entry.parent}}\n` : "") +
					(overridden ? `- {@link ${overridden.id}}\n` : "") +
					(entry.related?.length
						? entry.related.map((s) => "- " + s).join("\n")
						: "")) +
				"\n";
		}

		return content;
	}

	/** Returns an entry of one of the parent's ancestors, if any, with the same name as the current entry */
	private _getOverridden(entry: IndexEntry) {
		if (!entry.parent) return;
		let parent =
			this.index.get(entry.parent) || this._parentIndex?.get(entry.parent);
		while (parent && parent.inherits) {
			let ancestor = this.index.get(parent.inherits);
			let foundInIndex = !!ancestor;
			if (!foundInIndex) ancestor = this._parentIndex?.get(parent.inherits);
			if (ancestor?.members) {
				let members = ancestor.members.map((id) =>
					(foundInIndex ? this.index : this._parentIndex)!.get(id),
				);
				let overridden = members.filter((m) => m && m.name === entry.name)[0];
				if (overridden && overridden.abstract && overridden.isPage)
					return overridden;
			}
			parent = ancestor;
		}
	}

	/** Returns a list of members of given index entry, if any (i.e. class, interface, namespace) */
	private _getMembers(
		entry: IndexEntry,
		noDedupRemove?: boolean,
	): {
		construct: IndexEntry;
		static: IndexEntry[];
		types: IndexEntry[];
		nonstatic: IndexEntry[];
		inherited: IndexEntry[];
		staticInherited: IndexEntry[];
		deprecated: IndexEntry[];
	} {
		if (!entry) throw Error("No index entry");

		// find ancestor to get inherited entries first
		let ancestor =
			entry.inherits &&
			(this.index.get(entry.inherits) ||
				this._parentIndex?.get(entry.inherits));
		let inherited = ancestor ? this._getMembers(ancestor, true) : ({} as any);

		// filter out deprecated entries, add to separate array
		let deprecated: IndexEntry[] = [];
		let members: IndexEntry[] = (
			entry.members?.map(
				(id) => this.index.get(id)! || this._parentIndex?.get(id)!,
			) || []
		).filter((a) => {
			if (!a) return false;
			if (!a.isDeprecated) return true;
			deprecated.push(a);
		});

		/** A helper function to remove duplicate inherited names */
		function dedup(...list: IndexEntry[]) {
			let result: IndexEntry[] = [];
			for (let entry of list) {
				let dup = members.find((m) => m.name === entry!.name);
				if (!dup) {
					// no duplicate found, add inherited item
					result.push(entry);
				} else if (
					!noDedupRemove &&
					!dup.abstract &&
					(entry.abstract || entry.isStatic)
				) {
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
				members.find((a) => a.name === "constructor") || inherited.construct,
			static: members.filter(
				(a) =>
					a?.isStatic &&
					a.type !== IndexEntryType.TypeEntry &&
					a.type !== IndexEntryType.InterfaceEntry &&
					a.type !== IndexEntryType.ClassEntry,
			),
			types: members.filter(
				(a) =>
					a?.isStatic &&
					(a.type === IndexEntryType.TypeEntry ||
						a.type === IndexEntryType.InterfaceEntry ||
						a.type === IndexEntryType.ClassEntry),
			),
			nonstatic: members.filter(
				(a) => a && a.name !== "constructor" && !a.isStatic,
			),
			inherited: nonstaticInherited,
			staticInherited,
			deprecated,
		};
	}

	/** Format given signature string, making keywords bold and adding links to other entries */
	private _formatSignature(entry: IndexEntry, s: string) {
		if (!entry.signature) return "";
		return (
			s
				// remove JSDoc first
				.replace(/\n\s*\/\*\*([^\*]|\*[^\/])+\*\/\s*\n/g, "\n")
				// split on strings and IDs (only those will match)
				.split(/(\"(?:[^\\\"]|\\.)*\"|[\w\.]+)/)
				// find IDs in the index
				.map((part) => {
					let found = /^[A-Z]/.test(part) && this._findInContext(part, entry);
					return found
						? this._makeLink(found, part)
						: SIGNATURE_KEYWORDS.includes(part)
						? `<b>${part}</b>`
						: `${this.pipeline.escapeHtml(part)}`;
				})
				.join("")
		);
	}

	/** Format given text, replacing JSDoc def and link tags */
	private _format(text: string) {
		return text
			.replace(/\n[ \t]*-[ \t]+\{\@ref\s+([^\n]|\n[^\n])+/g, (s) => {
				// insert class attribute before entire list of page ref blocks
				return "<!--{{html-attr class=pagerefblock_list}}-->\n" + s;
			})
			.replace(
				/^[ \t]*-[ \t]+\{\@ref\s+([^\}]+)\}[ \t]*(.*)$/gm,
				(_s, id, abstract) => {
					id = id.trim().replace(/\(\)$/, "");
					let ref = this._findInContext(id);
					if (!ref) {
						if (this.options.warnLinks) {
							this._warnings.push("Reference not found: " + _s);
						}
						return "";
					}
					if (ref.pagePath) {
						if (!abstract) abstract = ref.abstract || "";
						return `- <!--{{pagerefblock path="${ref.pagePath}"}}-->`;
					} else {
						return `- **${ref.title}**`;
					}
				},
			)
			.replace(/\{\@link\s+([^\}\s]+)([^\}]*)\}/g, (s, name, title) => {
				let id = name.trim().replace(/\(\)$/, "").replace(/\:/g, ".");
				let ref = this._find(id) || this._findInContext(id);
				if (!ref && this.options.warnLinks) {
					this._warnings.push("Reference not found: " + s);
				}
				title = title.trim() || name;
				return ref ? this._makeLink(ref, title) : "`" + title + "`";
			});
	}

	/** Create an HTML link to given index entry */
	private _makeLink(ref: IndexEntry, title: string, className = "apilink") {
		let page = this.pipeline.find(ref.pagePath!);
		let url = page
			? "/" + page.pipeline.outputPath + "/" + page.data.output
			: ref.id.replace(/\.([A-Z])|[^\w\.\-_]/g, "__$1") + ".html";
		return (
			`<a href="${url}" class="${className}">` +
			this.pipeline.escapeHtml(title) +
			"</a>"
		);
	}

	/** Create an HTML link to the parent of given index entry */
	private _makeParentLink(entry: IndexEntry, className?: string) {
		let parentRef = entry.parent && this._findInContext(entry.parent);
		return parentRef ? this._makeLink(parentRef, entry.parent!, className) : "";
	}

	/** Returns an index entry for given ID */
	private _find(id: string) {
		return this.index.get(id) || this._parentIndex?.get(id);
	}

	/** Returns an index entry for given ID, in the context of the current (Builder) ID */
	private _findInContext(id: string, exclude?: IndexEntry) {
		let parts = this.id.split(/[\.\/]/);
		for (let i = parts.length; i >= 0; i--) {
			let contextId = [...parts.slice(0, i), id].join(".");
			let entry = this.index.get(contextId);
			if (entry && (!exclude || entry !== exclude)) return entry;
		}

		// alternatively, find an exact match in the parent index
		if (this._parentIndex?.has(id)) {
			return this._parentIndex?.get(id);
		}
	}

	/** Returns a localized string for the type of given index entry */
	private _getTypeString(entry: IndexEntry) {
		let strings = this.options.strings;
		switch (entry?.type) {
			case IndexEntryType.ClassEntry:
				return strings.ClassType;
			case IndexEntryType.InterfaceEntry:
				return strings.InterfaceType;
			case IndexEntryType.NamespaceEntry:
				return strings.NamespaceType;
			case IndexEntryType.MethodEntry:
				return strings.MethodType;
			case IndexEntryType.PropertyEntry:
				return strings.PropertyType;
			case IndexEntryType.FunctionEntry:
				return strings.FunctionType;
			case IndexEntryType.TypeEntry:
				return strings.TypeType;
			default:
				return strings.VariableType;
		}
	}

	private _warnings: string[] = [];
	private _parentIndex?: Map<string, IndexEntry>;
}
