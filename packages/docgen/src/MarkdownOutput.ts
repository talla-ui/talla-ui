import * as yaml from "js-yaml";
import { DocsIndex, href, MenuItem, safeId } from "./DocsIndex.js";
import { Entry } from "./Entry.js";
import { encode } from "html-entities";
import { log } from "./Log.js";
import { Output } from "./Output.js";

/** Encapsulation of the markdown output formatter */
export class MarkdownOutput extends Output {
	/** Initializes markdown output using the provided index */
	constructor(public docsIndex: DocsIndex) {
		super();
		if (docsIndex.config.output?.markdown) {
			this.outputPath = docsIndex.config.output.markdown.path;
			this.outputYaml = !!docsIndex.config.output.markdown.yaml;
			this.preserveLinks = !!docsIndex.config.output.markdown.preserveLinks;
		}
	}

	/** The output file path (directory), if any */
	outputPath?: string;

	/** True if output should include YAML front matter */
	outputYaml?: boolean;

	/** True if link tags should NOT be rewritten in the output file */
	preserveLinks?: boolean;

	/** Collates all entries from the index to an array that can be used by {@link write()}, as well as the HTML formatter */
	collate() {
		let result: CollatedMarkdownOutput[] = [];
		for (let entry of this.docsIndex.entries.values()) {
			// collate each entry to full markdown text one by one
			result.push(this._collateEntry(entry));
		}

		// also add all entries to the menu
		for (let c of result) c.addToMenu();
		return result;
	}

	/** Writes collated output to markdown files, if a path was specified in the config */
	async writeAsync(output: CollatedMarkdownOutput[]) {
		if (!this.outputPath) return;

		// go through all entries and create a file for each
		for (let it of output) {
			// compile markdown output
			let text = this.preserveLinks ? it.getSource() : it.getOutput("md");

			// add simple breadcrumb link from menu, if any
			let { title, href } = it.getMenuParentInfo("md");
			if (title && href) text = `[${title}](${href})\n\n` + text;

			// prepend text with YAML front matter if required
			if (this.outputYaml) {
				text = "---\n" + yaml.dump(it.props) + "---\n\n" + text;
			}

			// write markdown file
			await this.writeFileAsync(this.outputPath, it.getFileName("md"), text);
		}
	}

	/** Serializes the given entry to markdown content */
	private _collateEntry(entry: Entry): CollatedMarkdownOutput {
		let props: Record<string, unknown> = {
			id: entry.id,
			type: entry.type,
			title: entry.title,
		};
		let text = "";
		function addSection(title: string, content: string) {
			if (text) text += "\n\n";
			text += title + "\n\n" + content;
		}
		function addMemberSection(title: string, members: Entry[]) {
			addSection(
				title,
				members
					.map((m) => {
						// add list of links, with + to indicate child page
						let isChild = m.parent === entry.id;
						return `- {@link ${m.id}}${isChild ? "+" : ""}`;
					})
					.join("\n"),
			);
		}
		log.verbose("Collating Markdown for " + entry.id);

		// add title and abstract
		text += "# " + entry.title;
		if (entry.abstract) text += "\n\n> " + entry.abstract;

		// add signature block
		if (entry.signature) {
			text +=
				'\n\n<pre class="docgen_signature">' +
				entry.signature.replace(/\n/g, "<br>") +
				"</pre>";
		}

		// add general notes
		if (entry.deprecation) addSection("### Deprecated", entry.deprecation);
		if (entry.summary) addSection("### Summary", entry.summary);
		if (entry.notes) {
			if (entry.notes.startsWith("> ")) text += "\n\n" + entry.notes;
			else addSection("### Notes", entry.notes);
		}

		// add function information
		if (entry.params) {
			let params = entry.params
				.map((p) => `- **${p[0]}** — ${p[1]}`)
				.join("\n");
			addSection("### Parameters", params);
		}
		if (entry.returns) addSection("### Return value", entry.returns);
		if (entry.throws) addSection("### Errors", entry.throws);

		// add description and content from markdown inputs, if any
		if (entry.description) addSection("## Description", entry.description);
		if (entry.content) text += "\n\n" + entry.content;

		// add examples, if any
		if (entry.examples) addSection("## Examples", entry.examples.join("\n\n"));

		// add all members
		let members = entry.hideMembers
			? ({} as Record<string, never>)
			: this.docsIndex.findMembers(entry);
		if (members.construct) {
			addMemberSection("## Constructor", [members.construct]);
		}
		if (members.types?.length) {
			addMemberSection("## Type members", members.types);
		}
		if (members.static?.length) {
			addMemberSection("## Static members", members.static);
		}
		if (members.nonstatic?.length) {
			addMemberSection("## Instance members", members.nonstatic);
		}
		if (members.deprecated?.length) {
			addMemberSection("## Deprecated members", members.deprecated);
		}
		if (members.inherited?.length) {
			addMemberSection("## Inherited members", members.inherited);
		}

		// add 'Related' section with links
		if (entry.related?.length || entry.parent) {
			addSection(
				"## Related",
				(entry.parent ? `- {@link ${entry.parent}}\n` : "") +
					((entry.related?.map((s) => "- " + s) || []).join("\n") || ""),
			);
		}

		// return collated output
		return new CollatedMarkdownOutput(this.docsIndex, entry, props, text);
	}
}

/** Encapsulation of pre-processed markdown output, used by both markdown and HTML formatters */
export class CollatedMarkdownOutput {
	constructor(
		public docsIndex: DocsIndex,
		public entry: Entry,
		public props: Record<string, unknown>,
		text: string,
	) {
		this._text = text;
	}

	/**
	 * Adds menu items to the index for the provided markdown content
	 *
	 * > Note: The menu includes both internal links (to headings that end with an ID comment tag: `<!--{#id}-->`) as well as `@link` tags that are immediately followed by a plus `+` symbol (usually in a list).
	 */
	addToMenu() {
		for (let it of this._getMenuItems()) {
			this.docsIndex.addMenuItem(it);
		}
	}

	/** Returns the intended file name for the associated entry */
	getFileName(extension: "md" | "html") {
		return safeId(this.entry.id, extension, this.entry.folder);
	}

	/** Returns the menu parent information of the associated entry */
	getMenuParentInfo(extension: "md" | "html") {
		let parent = this.docsIndex.getMenuParent(this.entry);
		return {
			parent,
			title: parent?.title,
			href: parent && href(this.entry, parent, extension),
		};
	}

	/** Returns the markdown source (including original link tags) */
	getSource() {
		return this._text;
	}

	/** Returns the intended output, using either `.md` or `.html` link refs */
	getOutput(extension: "md" | "html") {
		let result = this._rewriteLinks(this._text, extension);

		// add sample code using `{@sample xyz}` tag (on any line)
		result = result.replace(/^.*\{@sample ([^}\s]+)\}.*$/gm, (_, id) => {
			if (id.startsWith(":")) id = this.entry.id + id;
			if (!this.docsIndex.samples.has(id)) {
				log.error("Sample not found: " + id);
				log.error("Referenced from entry " + this.entry.id);
				return "???";
			}
			return this.docsIndex.samples.get(id)!.code;
		});

		// format signature within <pre> block
		result = result.replace(
			/^(<pre class="docgen_signature">)(.*)(<\/pre>)/m,
			(_, t1, s, t2) => t1 + this._formatSignature(s, extension) + t2,
		);

		// format note blockquotes to make them stand out more
		result = result.replace(/^> (\S+): /gm, "> **$1**\\\n> ");

		// check if any remaining tags
		let match: RegExpMatchArray | null | undefined;
		let re = /\{@\w+/g;
		while ((match = re.exec(result))) {
			log.error(
				"Remaining tag in output for " + this.entry.id + ": " + match[0],
			);
		}

		return result;
	}

	/** Returns the entry abstract (description) text, if any, in markdown format */
	getAbstract(extension: "md" | "html") {
		if (!this.entry.abstract) return "";
		return this._rewriteLinks(this.entry.abstract, extension);
	}

	/** Formats the given signature text for the current entry as HTML */
	private _formatSignature(text: string, extension: "md" | "html") {
		const keywords = (
			"class|interface|enum|type|const|let|extends|implements|protected|abstract|in|of|keyof|" +
			"typeof|boolean|string|number|object|void|null|this|any|never|unknown|undefined|readonly"
		).split("|");
		return (
			text
				// split on strings and IDs (only those will match)
				.split(/(<br>)|(\"(?:[^\\\"]|\\.)*\"|[\w\.]+)/)
				// find IDs in the index
				.map((part) => {
					if (part === "<br>") return part;
					if (/^[A-Z]/.test(part)) {
						let found = this.docsIndex.findEntry(part, this.entry.id);
						if (found && found.signature && found.id !== this.entry.id) {
							let ref = href(this.entry, found, extension);
							return `<a href="${ref}">${part}</a>`;
						}
					}
					return keywords.includes(part) ? `<b>${part}</b>` : encode(part);
				})
				.join("")
		);
	}

	/**
	 * Rewrites `@link` tags within the given text to markdown, and always refer to an absolute ID
	 * @param entry The entry where this text is referenced, for relative ID resolution
	 * @param text The text to be rewritten
	 */
	private _rewriteLinks(
		text: string,
		extension: string,
		ref = this.entry,
	): string {
		return (text || "")
			.replace(
				/^- \{@link\s+([^\s\(\)\}]+)([^}]*)\}[ +]*$/gm,
				(s, id, rest) => {
					// replace block ref links
					let found = this.docsIndex.findEntry(id, ref.id);
					if (found && found.abstract) {
						let title = "<!--{ref:" + found.type + "}-->" + found.title;
						let desc =
							" " +
							(found.isDeprecated ? "<!--{refchip:deprecated}-->" : "") +
							(found.isAbstract ? "<!--{refchip:abstract}-->" : "") +
							(found.isReadonly ? "<!--{refchip:readonly}-->" : "") +
							(found.isStatic ? "<!--{refchip:static}-->" : "") +
							(found.isProtected ? "<!--{refchip:protected}-->" : "") +
							"\\\n    " +
							this._rewriteLinks(found.abstract, extension, found);
						return `- [${title}](${href(this.entry, found, extension)})${desc}`;
					} else {
						log.error(
							"Reference not found",
							s,
							" (from " + this.entry.id + ")",
						);
						return `- [${id}${rest}](#)`;
					}
				},
			)
			.replace(/\{@link\s+([^\s\(\)\}]+)([^}]*)\}/g, (s, id, rest) => {
				// replace inline links
				let found = this.docsIndex.findEntry(id, ref.id);
				if (found) {
					let title = rest.trim() || id;
					if (title === "()") title = id + "()";
					return `[${title}](${href(this.entry, found, extension)})`;
				} else {
					log.error("Reference not found", s, " (from " + this.entry.id + ")");
					return `[${id}${rest}](#)`;
				}
			});
	}

	/** Returns the list of menu items to be added to the index for the encapsulated markdown content */
	private _getMenuItems() {
		let result: MenuItem[] = [];
		let re =
			/(?:^##+\s+(.*)<!--\{#([\w-]+)\}-->$)|(?:\{@link\s+([^}]+)\s*} *\+)/gm;
		let match: RegExpExecArray | undefined | null;
		while ((match = re.exec(this._text))) {
			if (match[1] && match[2]) {
				let title = match[1].trim();
				let headingId = match[2];
				result.push({ entry: this.entry, title, headingId });
			}
			if (match[3]) {
				let id = match[3].trim();
				let found = this.docsIndex.findEntry(id, this.entry.id);
				if (found) {
					result.push({
						entry: this.entry,
						target: found,
						title: found.title,
					});
				}
			}
		}
		return result;
	}

	private _text: string;
}
