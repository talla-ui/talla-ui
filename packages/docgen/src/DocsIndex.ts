import { Config } from "./Config.js";
import { Entry, EntryType } from "./Entry.js";
import { Parser } from "./Parser.js";
import { MarkdownReader } from "./MarkdownReader.js";
import { log } from "./Log.js";
import { SamplesReader, CodeSample } from "./SamplesReader.js";

/** Lists of member entries for a particular parent */
export type EntryMembers = {
	construct?: Entry;
	static: Entry[];
	types: Entry[];
	nonstatic: Entry[];
	inherited: Entry[];
	staticInherited: Entry[];
	deprecated: Entry[];
};

/** A description of a menu item for a particular entry */
export type MenuItem = {
	entry: Entry;
	target?: Entry;
	headingId?: string;
	title: string;
};

/** Helper method to make a safe file name for the specified ID */
export function safeId(id: string, extension?: string, folder?: string) {
	return (
		(folder ? folder.replace(/[^\w.-\/]/, "_") + "/" : "") +
		id.replace(/[^\w.]/g, "_").replace(/\.([^A-Z])/g, "_$1") +
		(extension ? "." + extension : "")
	);
}

/** Helper function to find the relative path from one entry to another */
export function href(from: Entry, to: Entry, extension?: string) {
	let folder = to.folder || "";
	if (from.folder === folder) folder = "";
	else if (from.folder) {
		folder = from.folder.replace(/[^\/]+/g, "..") + "/" + folder;
	}
	folder = folder.replace(/\/$/, "").replace(/\/+/g, "/");
	return safeId(to.id, extension, folder);
}

/** A class that combines all documentation entries in the project */
export class DocsIndex {
	/** Creates a new index with the provided configuration */
	constructor(public config: Config) {}

	/**
	 * All current entries
	 * - To add an entry, use the {@link addEntry()} method instead of adding it manually here.
	 */
	readonly entries = new Map<string, Entry>();

	/**
	 * All code samples
	 * - Code samples are read from source files; the {@link SamplesReader} class is used to add samples to this map.
	 */
	readonly samples = new Map<string, CodeSample>();

	/** Adds all entries read by the provided parser */
	addParsed(parser: Parser) {
		log.verbose("+++ Adding (parsed)", parser.fileName);
		let entries = parser.getEntries();
		log.verbose("Adding entries:");
		for (let entry of entries) {
			log.verbose(
				entry.isPrivate ? " + (private):" : " + entry:",
				entry.id,
				entry.type,
			);
			entry.folder = this.config.refFolder || undefined;
			if (!entry.isPrivate) this.addEntry(entry);
		}
	}

	/** Adds a single entry from a markdown source file */
	addMarkdown(reader: MarkdownReader) {
		log.verbose("+++ Adding (md)", reader.fileName);
		let entry = reader.read();
		if (entry.isPrivate) {
			log.verbose(" - (skipped private entry)");
			return;
		}
		if (this.entries.has(entry.id)) {
			// merge title and content with existing entry
			log.verbose(" - (merged)");
			let existing = this.entries.get(entry.id)!;
			existing.title = entry.title;
			existing.content = [existing.content || "", entry.content].join("\n\n");
			if (entry.hideMembers) existing.hideMembers = true;
			if (entry.hideConstructor) existing.hideConstructor = true;
		} else {
			// add entry as-is
			entry.folder ||= this.config.docFolder || undefined;
			this.entries.set(entry.id, entry);
		}
	}

	/** Adds samples from the given sample code reader */
	addSamples(reader: SamplesReader) {
		log.verbose("+++ Adding (samples)", reader.fileName);
		for (let sample of reader.readSamples()) {
			if (this.samples.has(sample.id)) {
				// duplicate ID already exists
				log.error("Sample with duplicate ID: " + sample.id);
				log.error(sample.file);
				log.error(this.samples.get(sample.id)!.file);
				continue;
			}
			log.verbose("+ sample: " + sample.id);
			this.samples.set(sample.id, sample);
		}
	}

	/** Adds the provided entry to the index */
	addEntry(entry: Entry) {
		if (!entry.id || !entry.name) {
			return log.error("Invalid declaration at " + entry.location);
		}
		if (entry.name.startsWith("_")) {
			return log.error("Leaked private declaration:", entry.id);
		}
		if (this.entries.has(entry.id)) {
			return log.error(
				"Duplicate declaration: " +
					entry.id +
					"\n" +
					entry.location +
					"\n" +
					this.entries.get(entry.id)!.location,
			);
		}
		this.entries.set(entry.id, entry);
	}

	/**
	 * Finds the documentation entry with the specified ID, possibly related to another ID
	 * @param id The ID to look for
	 * @param rel The ID for the entry where this text is referenced, for relative ID resolution
	 */
	findEntry(id: string, rel?: string, noScope?: boolean): Entry | undefined {
		if (this.entries.has(id)) return this.entries.get(id)!;

		// search by going backwards from given related ID
		while (rel) {
			let rid = rel + "." + id;
			if (this.entries.has(rid)) return this.entries.get(rid)!;

			// check for inherited members
			let relEntry = this.entries.get(rel)!;
			if (relEntry && relEntry.inherits?.[0]) {
				let inherited = this.findEntry(id, relEntry.inherits[0], true);
				if (inherited) return inherited;
			}

			// check enclosing scope
			let enclosing = rel.replace(/\.\w+$|\[.*\]$/, "");
			if (noScope || enclosing === rel) break;
			rel = enclosing;
		}
	}

	/** Return an object with lists of members for the provided entry */
	findMembers(entry: Entry): EntryMembers {
		// find ancestor to get inherited entries first
		let ancestor = entry.inherits?.length
			? this.findEntry(entry.inherits[0]!)
			: undefined;
		let inherited: Partial<EntryMembers> = ancestor
			? this.findMembers(ancestor)
			: {};

		// filter out deprecated entries, add to separate array
		let deprecated: Entry[] = [];
		let members = [...this.entries.values()].filter((a) => {
			if (a.parent !== entry.id) return false;
			if (a && a.isDeprecated) deprecated.push(a);
			return !(!a || a.isDeprecated);
		});

		/** A helper function to remove duplicate inherited names */
		function dedup(...list: Entry[]) {
			let result: Entry[] = [];
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
			construct: entry.hideConstructor
				? undefined
				: members.find((a) => a.type === EntryType.ConstructorEntry) ||
					inherited.construct,
			static: members.filter(
				(a) =>
					a?.isStatic &&
					a.type !== EntryType.TypeEntry &&
					a.type !== EntryType.InterfaceEntry &&
					a.type !== EntryType.ClassEntry,
			),
			types: members.filter(
				(a) =>
					a?.isStatic &&
					(a.type === EntryType.TypeEntry ||
						a.type === EntryType.InterfaceEntry ||
						a.type === EntryType.ClassEntry),
			),
			nonstatic: members.filter(
				(a) => a && a.type !== EntryType.ConstructorEntry && !a.isStatic,
			),
			inherited: nonstaticInherited,
			staticInherited,
			deprecated,
		};
	}

	/** Adds a menu item to the global menu */
	addMenuItem(item: MenuItem) {
		if (item.target) {
			if (this._parents.has(item.target)) {
				log.error(
					"Entry is referenced from multiple parent entries: " +
						`${item.target.id} < ${item.entry.id}, ` +
						this._parents.get(item.target)!.id,
				);
			}
			this._parents.set(item.target, item.entry);
		}
		let menu = this._menu.get(item.entry);
		if (!menu) this._menu.set(item.entry, (menu = []));
		menu.push(item);
	}

	/** Returns a list of menu items for a particular entry */
	getMenuItems(entry: Entry) {
		return this._menu.get(entry) || [];
	}

	/** Returns the parent menu item for the specified entry, if any */
	getMenuParent(entry: Entry) {
		return this._parents.get(entry);
	}

	/** Returns a list of orphaned entries */
	getOrphans() {
		return [...this.entries.values()].filter((a) => !this._parents.has(a));
	}

	private _menu = new Map<Entry, MenuItem[]>();
	private _parents = new Map<Entry, Entry>();
}
