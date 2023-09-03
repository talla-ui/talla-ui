import type { Pipeline, PipelineItem } from "markdown-pipeline";
import { glob } from "glob";
import { PageBuilder } from "./PageBuilder.js";
import { DocGenOptions } from "./DocGenOptions.js";
import { IndexEntry, Indexer } from "./Indexer.js";
import { Parser } from "./Parser.js";
import { Tokenizer } from "./Tokenizer.js";
import path from "path";

/** Represents source documentation in a language (from .d.ts file, may be translated) */
export class PackageDocs {
	constructor(
		public pipeline: Pipeline,
		public options: DocGenOptions,
	) {}

	/** Returns a promise for the index, which contains all entries from the .d.ts files (after running `addPagesAsync()`) */
	async getIndexAsync() {
		await this._waitIndex;
		return this._index!;
	}

	/** Index .d.ts files and add all content items to the pipeline */
	async addEntryPagesAsync() {
		let index = new Map<string, IndexEntry>();

		// load all .d.ts files and tokenize, parse, and index them
		let files = glob.sync(this.options.dtsPath, { cwd: this.pipeline.path });
		for (let fileName of files) {
			let dtsSource = await this.pipeline.readTextFileAsync(fileName);
			let tokenizer = new Tokenizer(
				path.resolve(this.pipeline.path, fileName),
				dtsSource,
				this.options,
			);
			let parser = new Parser(tokenizer.tokenize(), this.options);
			let indexer = new Indexer(parser.parse(), this.options);
			for (let [id, entry] of indexer.build().getIndex()) {
				index.set(id, entry);
			}
		}

		// create all API docs pages asynchronously
		await Promise.all(
			Array.from(index.keys()).map((id) =>
				new PageBuilder(
					this.pipeline,
					index,
					id,
					this.options,
				).createEntryPageAsync(),
			),
		);

		// fulfill index promise (unblocks parent pipeline)
		this._setIndex(index);
	}

	/** Adds all guide pages (from options); ensures that all items are added _in order_ */
	async addGuidePagesAsync() {
		let index = await this.getIndexAsync();
		for (let fileName of this.options.guidePages) {
			let text = await this.pipeline.readTextFileAsync(fileName);
			let id = fileName.replace(/\.md$/, "");
			let builder = new PageBuilder(this.pipeline, index, id, this.options);
			await builder.createGuidePageAsync(text);
		}
	}

	/** Adds a `_toc` partial with a list of page ref blocks for all exposed entries */
	async addTOCAsync() {
		let index = await this.getIndexAsync();
		let tocBuilder = new PageBuilder(
			this.pipeline,
			index,
			"_toc",
			this.options,
		);
		tocBuilder.createTocAsync();
	}

	/** Adds a JSON output file with the complete index */
	async addJSONAsync() {
		let index = await this.getIndexAsync();
		let data: string[][] = [];
		for (let it of index.values()) {
			if (!it.isPage) continue;
			data.push([
				it.id.replace(/\.([A-Z])|[^\w\.\-_]/g, "__$1"),
				it.title,
				await this.pipeline.parseAsync(
					(it.abstract || "").replace(
						/\{\@link\s+([^\}\s]+)([^\}]*)\}/g,
						(s, name, title) => title || name,
					),
				),
			]);
		}
		let text = JSON.stringify(data);
		this.pipeline.addOutputFile("index.json", text);
	}

	/** Retrieves pages from the pipeline and gets content to insert into given page (as markdown) */
	async getGuideContentAsync(item: PipelineItem) {
		let ref: PipelineItem[] = [];
		let partialPath = item.path.startsWith(this.pipeline.path)
			? item.path.slice(this.pipeline.path.length + 1)
			: item.path;
		for (let page of this.pipeline.getAllItems()) {
			if (
				Array.isArray(page.data.applies_to) &&
				page.data.applies_to.includes(partialPath)
			) {
				ref.push(page);
			}
		}
		if (!ref.length) return "";
		await Promise.all(ref.map((r) => r.waitAsync()));
		ref.sort((a, b) => (+a.data.sort || 0) - (+b.data.sort || 0));
		return (
			`\n## ${this.options.strings.GuideBacklinks} {#guides}\n\n` +
			"<!--{{html-attr class=pagerefblock_list}}-->\n" +
			ref
				.map((it) => `- <!--{{pagerefblock path="${it.path}"}}-->`)
				.join("\n") +
			"\n"
		);
	}

	private _index?: Map<string, IndexEntry>;
	private _waitIndex = new Promise<void>((resolve) => {
		this._setIndex = (index) => {
			this._index = index;
			resolve();
		};
	});
	private _setIndex!: (index: Map<string, IndexEntry>) => void;
}
