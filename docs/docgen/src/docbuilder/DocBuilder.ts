import { glob } from "glob";
import * as yaml from "js-yaml";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { DocItem, DocItemTemplateFunction } from "./DocItem.js";

export class DocBuilder {
	/** Returns the document item with the specified ID */
	lookup(id: string): DocItem | undefined {
		return this._index.get(id);
	}

	/** Add a warning message to be displayed at the end */
	warn(...msg: string[]) {
		this._warnings.push(msg.join(" "));
	}

	/** Returns a list of all warning messages */
	getWarnings() {
		return this._warnings.slice();
	}

	/** Add a document item */
	addItem(item: DocItem) {
		if (this._index.has(item.id)) {
			this._warnings.push("Duplicate ID: " + item.id);
		}
		this._items.add(item);
		this._index.set(item.id, item);
	}

	/** Set text that can be included in documents using `@text` tags (for translation) */
	setTagText(text: Record<string, string>) {
		Object.assign(this._text, text);
		return this;
	}

	/** Get (translated) text with the specified ID for replacing a `@text` tag; warns if ID is not found */
	getTagText(id: string) {
		if (!this._text) this._warnings.push("Undefined text replacement: " + id);
		return this._text[id] || "";
	}

	/** Set the provided function as the template with the specified ID */
	setTemplate(
		id: string,
		module: { template: DocItemTemplateFunction | string },
	) {
		this._templates[id] =
			typeof module.template === "string"
				? () => module.template as string
				: module.template;
		return this;
	}

	/** Returns a function for the specified template ID; warns if ID is not found */
	getTemplate(id: string) {
		if (!this._templates[id]) this._warnings.push("Undefined template: " + id);
		return this._templates[id] || (() => "");
	}

	/** Validate that all links refer to existing IDs; returns a list of warnings */
	async validateAsync() {
		// generate HTML but ignore the output
		for (let item of this._items) {
			if (item.id.indexOf(":") >= 0) continue;
			await item.toHtmlAsync(this, true);
		}
		return this._warnings.slice();
	}

	/** Sets menu parent on each item that is referenced from another item using `+` link */
	buildMenu() {
		for (let item of this._items) {
			if (item.id.indexOf(":") >= 0) continue;
			let menuItems = item.getMenuItems(this);
			item.data.menu = menuItems;
			for (let itemId of menuItems) {
				if (itemId.startsWith("#")) continue;
				let found = this._index.get(itemId);
				if (!found) {
					this.warn("Missing menu item:", itemId, "in", item.id);
					continue;
				}
				if (found.data.menu_parent && found.data.menu_parent !== item.id) {
					this.warn(
						"Duplicate menu parent:",
						itemId,
						"of",
						item.id + " <> " + found.data.menu_parent,
					);
				}
				found.data.menu_parent = item.id;
			}
		}
		return this;
	}

	/** Merge all items from another builder into this one, overwriting content (if any) and merging data */
	merge(other: DocBuilder) {
		for (let item of other._items) {
			let existing = this._index.get(item.id);
			if (existing) {
				if (existing.data.check && existing.data.check !== item.data.match) {
					this.warn("Mismatched checksum for", item.id);
					this.warn(".. Not overriding, update match:", existing.data.check);
					if (existing.data.input_path) {
						this.warn(".. Input file:", existing.data.input_path);
					}
					continue;
				}
				Object.assign(existing.data, item.data);
				if (item.hasContent()) existing.setContent(item);
			} else {
				this._items.add(item);
				this._index.set(item.id, item);
			}
		}
		return this;
	}

	/** Add items from markdown files, referenced by glob */
	readItems(inputGlob: string, defaultData?: Record<string, any>) {
		let files = glob.sync(inputGlob);
		for (let file of files) {
			let id = path.basename(file, ".md");
			let data: any = { ...defaultData };
			data.id = id;
			data.input_path = path.resolve(file);
			let mdInput = readFileSync(file, "utf8");
			mdInput = mdInput.replace(/\t/g, "  ");
			if (mdInput.startsWith("---\n")) {
				let yamlInput = mdInput.slice(4).split("\n---\n")[0]!;
				mdInput = mdInput.slice(yamlInput.length + 8);
				Object.assign(data, yaml.load(yamlInput));
				if (data.id) id = data.id;
			}
			let item = new DocItem(id, data, mdInput, data.folder, data.file);
			this.addItem(item);
		}
		return this;
	}

	/** Write all items to file as markdown, at the specified path */
	writeItems(outPath: string) {
		if (!existsSync(outPath)) {
			mkdirSync(outPath, { recursive: true });
		}
		let seen: { [outFile: string]: boolean } = {};
		for (let item of this._items) {
			let fileName = item.getSanitizedId() + ".md";
			let outFile = path.join(outPath, fileName);
			writeFileSync(outFile, item.toMarkdown());
			if (seen[outFile]) {
				this._warnings.push("Overwritten file: " + outFile);
			}
			seen[outFile] = true;
		}
		return this;
	}

	/** Write all items to file as HTML, at the specified path */
	async writeHtmlAsync(outPath: string) {
		let seen: { [outFile: string]: boolean } = {};
		for (let item of this._items) {
			if (item.id.indexOf(":") >= 0) continue;
			let fileName = path.join(outPath, item.outFolder || ".", item.outFile);
			let content = await item.toHtmlAsync(this);
			this._writeFile(fileName, content);
			if (seen[fileName]) {
				this._warnings.push("Overwritten file: " + fileName);
			}
			seen[fileName] = true;
		}
		return this;
	}

	/** Write a JSON index of all content to the specified file */
	async writeJsonIndexAsync(outFile: string, baseUrl: string) {
		if (!baseUrl.endsWith("/")) baseUrl += "/";
		let index: any[] = [];
		for (let item of this._items) {
			if (item.id.indexOf(":") >= 0) continue;
			let url =
				baseUrl +
				(item.outFolder ? item.outFolder + "/" : "") +
				item.getSanitizedId() +
				".html";
			index.push([
				item.id,
				item.data.menu_title || item.data.title,
				await item.getFieldHtmlAsync("abstract", this),
				url,
			]);
		}
		this._writeFile(outFile, JSON.stringify(index));
		return this;
	}

	/** Copy all asset files from the specified folder to the output folder */
	copyAssets(assetGlob: string, outPath: string) {
		let assetFiles = glob.sync(assetGlob);
		for (let assetFile of assetFiles) {
			let fileName = path.basename(assetFile);
			let outFile = path.join(outPath, fileName);
			this._writeFile(outFile, readFileSync(assetFile));
		}
		return this;
	}

	private _writeFile(fileName: string, content: Buffer | string) {
		let folderName = path.dirname(fileName);
		if (!existsSync(folderName)) {
			mkdirSync(folderName, { recursive: true });
		}
		writeFileSync(fileName, content);
	}

	private _index = new Map<string, DocItem>();
	private _items = new Set<DocItem>();
	private _text: Record<string, string> = {};
	private _templates: Record<string, DocItemTemplateFunction> = {};
	private _warnings: string[] = [];
}
