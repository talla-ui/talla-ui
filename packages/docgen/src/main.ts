import { existsSync, readFileSync } from "fs";
import { Config } from "./Config.js";
import { glob } from "glob";
import { Parser } from "./Parser.js";
import { DocsIndex } from "./DocsIndex.js";
import { JSONOutput } from "./JSONOutput.js";
import { MarkdownOutput } from "./MarkdownOutput.js";
import { MarkdownReader } from "./MarkdownReader.js";
import { IndexOutput } from "./IndexOutput.js";
import { log } from "./Log.js";
import { HTMLOutput } from "./HTMLOutput.js";
import { Output } from "./Output.js";
import { SamplesReader } from "./SamplesReader.js";

// read config from a file, or use defaults
let config = new Config();
let hasDefault = existsSync("docgen.config.json");
let fileArg = process.argv[2];
if (fileArg?.startsWith("-")) fileArg = undefined;
let configFileName = fileArg || (hasDefault ? "docgen.config.json" : undefined);
log.verbose("Reading config from " + (configFileName || "defaults"));
try {
	let configStr = configFileName
		? readFileSync(configFileName).toString()
		: "{}";
	let configData = JSON.parse(configStr);
	Object.assign(config, configData);
} catch (err) {
	log.error("Cannot read data from config file: " + configFileName);
	log.error(err);
	process.exit(1);
}

// gather all input file names
let files: string[] = [];
let sampleFiles: string[] = [];
for (let input of config.input) {
	let found = glob.sync(input, { absolute: true, nodir: true });
	if (!found.length) {
		log.info("WARNING: No input files in " + input);
	}
	files.push(...found);
}
for (let input of config.samples) {
	let found = glob.sync(input, { absolute: true, nodir: true });
	if (!found.length) {
		log.info("WARNING: No sample source files in " + input);
	}
	sampleFiles.push(...found);
}

// parse all input files, adding entries to the index
let docsIndex = new DocsIndex(config);
for (let file of files) {
	let fileContent: string;
	try {
		fileContent = readFileSync(file).toString();
	} catch (err) {
		log.error("Error while reading file: " + file);
		log.error(err);
		continue;
	}
	if (file.endsWith(".d.ts")) {
		docsIndex.addParsed(new Parser(file, fileContent));
	} else if (file.endsWith(".md") || file.endsWith(".txt")) {
		docsIndex.addMarkdown(new MarkdownReader(file, fileContent));
	}
}

// parse all sample files, if any
for (let file of sampleFiles) {
	let fileContent: string;
	try {
		fileContent = readFileSync(file).toString();
	} catch (err) {
		log.error("Error while reading file: " + file);
		log.error(err);
		continue;
	}
	docsIndex.addSamples(new SamplesReader(file, fileContent));
}

// shortcut here if already found errors
if (log.hasErrors()) {
	console.error("No output generated");
	process.exit(1);
}

// write raw output file(s)
log.verbose("Writing output...");
await new JSONOutput(docsIndex).writeAsync();
await new IndexOutput(docsIndex).writeAsync();

// write markdown and/or HTML output file(s)
let markdownFormatter = new MarkdownOutput(docsIndex);
let htmlFormatter = new HTMLOutput(docsIndex);
let collated = markdownFormatter.collate();

// check references by generating markdown output if needed
if (config.check) {
	for (let co of collated) co.getOutput("md");
	if (log.hasErrors()) {
		console.error("Check failed");
		process.exit(1);
	}
}

// TODO: at this stage, the pre-processed markdown can be swapped (partially)
// for a translated version (from markdown output with preserveLinks option).

await markdownFormatter.writeAsync(collated);
await htmlFormatter.writeAsync(collated);

// copy assets within configured folders
for (let dir in config.assets) {
	await Output.copyAssetsAsync(dir, config.assets[dir]!);
}
if (log.hasErrors()) {
	console.error("Completed with errors");
	process.exit(1);
}

// check for orphaned non-root pages
if (config.checkOrphans) {
	let orphans = docsIndex.getOrphans();
	orphans.sort((a, b) => a.id.localeCompare(b.id));
	if (orphans.length) {
		console.error("Orphaned pages:");
		for (let o of orphans) console.error("- " + o.id);
		process.exit(1);
	}
}
