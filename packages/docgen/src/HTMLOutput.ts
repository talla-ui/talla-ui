import * as path from "path";
import { DocsIndex, href } from "./DocsIndex.js";
import { log } from "./Log.js";
import { CollatedMarkdownOutput } from "./MarkdownOutput.js";
import hljs from "highlight.js";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import { markedSmartypants } from "marked-smartypants";
import { Output } from "./Output.js";
import { Entry, EntryType } from "./Entry.js";

export type HTMLTemplateFunction = (
	text: string,
	data: Record<string, unknown>,
) => string;

export type MenuListItem = {
	title: string;
	href: string;
	type: "heading" | EntryType;
	current?: boolean;
	menu?: MenuListItem[];
};

const defaultTemplate: HTMLTemplateFunction = (text, data) => `
<!DOCTYPE html>
<html lang="${data.lang || "en"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title || ""}</title>
</head>
<body>
  ${text}
</body>
</html>
`;

const marked = new Marked(
	markedSmartypants({ config: 1 }),
	markedHighlight({
		langPrefix: "hljs language-",
		highlight(code, lang) {
			const language = hljs.getLanguage(lang) ? lang : "plaintext";
			let html = hljs.highlight(code, { language }).value;
			let highlighting = 0;
			let lines = html.split("\n").map((line) => {
				let hlMatch = line.match(/([+~]{5,})\W*(\d+)?/);
				if (hlMatch && hlMatch[1]) {
					highlighting = hlMatch[2] ? +hlMatch[2] : 1;
					let type = hlMatch[1][0] === "+" ? "good" : "bad";
					return `<span class="hljs--highlight-${type}">`;
				}
				if (highlighting) {
					if (--highlighting === 0) return line + "</span>";
				}
				return line + "\n";
			});
			if (highlighting) lines.push("</span>");
			return lines.join("");
		},
	}),
);

/** Encapsulation of the HTML output formatter */
export class HTMLOutput extends Output {
	/** Initializes HTML output using the provided index */
	constructor(public docsIndex: DocsIndex) {
		super();
		if (docsIndex.config.output?.html) {
			this.outputPath = docsIndex.config.output.html.path;
			this.templatesPath = docsIndex.config.output.html.templates;
			this.defaultTemplate = docsIndex.config.output.html.defaultTemplate;
		}
	}

	/** The output file path (directory), if any */
	outputPath?: string;

	/** Templates folder path, from configuration */
	templatesPath?: string;

	/** Default template ID, from configuration */
	defaultTemplate?: string;

	/** Writes collated (Markdown) output to HTML files, if a path was specified in the config */
	async writeAsync(output: CollatedMarkdownOutput[]) {
		if (!this.outputPath) return;

		// go through all entries and create a file for each
		for (let it of output) {
			// set additional props
			let parentInfo = it.getMenuParentInfo("html");
			it.props.parentLink = parentInfo.href;
			it.props.parentTitle = parentInfo.title;
			it.props.menu = this._makeMenu(it.entry);

			// compile HTML using template
			await this.writeFileAsync(
				this.outputPath,
				it.getFileName("html"),
				await this._compileAsync(it),
			);
		}
	}

	/** Serializes the given markdown content and props to an HTML file */
	private async _compileAsync(collated: CollatedMarkdownOutput) {
		let text = await marked.parse(collated.getOutput("html"));

		// generate meta "description" tag content (markdown => html => remove tags)
		if (collated.entry.abstract && !collated.props.metaDescription) {
			let abstract = collated.getAbstract("html");
			let desc = await marked.parseInline(abstract);
			desc = desc.replace(/<[^>]+>/g, "");
			collated.props.metaDescription = desc;
		}

		// apply `id` attribute to headings
		text = text.replace(
			/<h(\d)([^<]+)<!--{#((?:[^<>-]|-\w)+)}--><\/h\d>/g,
			(_, d, rest, id) => `<h${d} id="${id}"${rest.trim()}</h${d}>`,
		);

		// add nbsp in front of dots in heading (ID)
		text = text.replace(/<h1[^<]+<\/h1>/, (s) =>
			s.replace(/\.(\w)/g, "\u200B.$1"),
		);

		// wrap HTML in template
		let template = await this._getTemplateAsync(
			String(collated.entry.template || ""),
		);
		return template(text, collated.props);
	}

	/** Generates a menu structure for given entry, inserting a sub menu for a second entry (recursively) */
	private _makeMenu(
		current: Entry,
		entry = current,
		subEntry?: Entry,
		subMenu?: MenuListItem[],
	): MenuListItem[] {
		let result: MenuListItem[] = [];
		let items = this.docsIndex.getMenuItems(entry);
		for (let it of items) {
			result.push({
				title: it.title,
				href:
					href(current, it.target || it.entry, "html") +
					(it.headingId ? "#" + it.headingId : ""),
				type: it.target ? it.target.type || "doc" : "heading",
				current: current === it.target,
				menu: it.target === subEntry ? subMenu : undefined,
			});
		}
		let parent = this.docsIndex.getMenuParent(entry);
		return parent ? this._makeMenu(current, parent, entry, result) : result;
	}

	/** Retrieves the template function with given ID, if possible */
	private async _getTemplateAsync(id?: string) {
		if (!id) id = this.defaultTemplate;
		if (!id) return defaultTemplate;

		// return cached template, if any
		if (this._templates.has(id)) return this._templates.get(id);

		// try to find the template from disk
		let importPath = path.resolve(this.templatesPath || ".", id + ".js");
		log.verbose("Importing template", importPath);
		let all: any = await import(importPath);
		if (typeof all?.default !== "function") {
			log.error("Invalid default export for template: " + importPath);
			all = { default: defaultTemplate };
		}
		this._templates.set(id, all.default);
		return all.default;
	}

	/** Loaded templates by ID */
	private _templates = new Map<string, HTMLTemplateFunction>();
}
