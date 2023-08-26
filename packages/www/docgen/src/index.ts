import { readFileSync } from "fs";
import * as path from "path";
import { Pipeline } from "markdown-pipeline";
import { DeclarationFileParser, SpecNodeType } from "./DeclarationFileParser";
import { MiscContent } from "./MiscContent";
import { PageGenerator } from "./PageGenerator";

/** Source configuration data */
interface ConfigSource {
  module: string;
  misc_path: string;
  template: string;
  out: string;
  json_out: string;
  base_url: string;
}

/** Helper function to compress search content using a very simple string-based algorithm */
function compressContent(content: string[]) {
  let words: string[] = [];
  let ref = Object.create(null);
  let str = content.join("+").replace(/\w+/g, (word) => {
    if (word in ref) {
      // if seen: move word to the front of the stack, insert old position
      let idx = ref[word];
      words.unshift(words.splice(idx, 1)[0]);
      for (let i = idx; i >= 0; i--) ref[words[i]] = i;
      return idx;
    } else {
      // add new word to the front of the stack, insert word itself
      words.unshift(word);
      for (let w in ref) ref[w]++;
      ref[word] = 0;
      return word;
    }
  });

  // replace most common patterns with single chars
  str = str
    .replace(/\|3\#0\:3\:3\+2\.2/g, "*")
    .replace(/\|2\#0\:2\+1/g, "?")
    .replace(/\|2\#0\:2\+/g, "!")
    .replace(/\|1\+/g, "=");

  return str;

  // Decompression algorithm is the reverse:
  // let inflate = (str: string) => {
  //     let w2: string[] = [];
  //     return str
  //         .replace(/\=/g, "|1+")
  //         .replace(/\!/g, "|2#0:2+")
  //         .replace(/\?/g, "|2#0:2+1")
  //         .replace(/\*/g, "|3#0:3:3+2.2")
  //         .replace(/(\d+)|\w+/g, (w, n) => {
  //             if (n) w = w2.splice(n, 1)[0];
  //             w2.unshift(w);
  //             return w;
  //         });
  // }
  // console.log(inflate(str).split("+").join("\n"));
}

/** Process given source and add documentation pages to the pipeline */
export function generateDocs(pipeline: Pipeline, config: ConfigSource) {
  let packagePath = path.join(__dirname, "../../node_modules", config.module);
  let packageJSON = readFileSync(
    path.join(packagePath, "package.json")
  ).toString();
  let packageInfo: any = JSON.parse(packageJSON);

  // read declaration files and parse their types/JSDoc
  let parser = new DeclarationFileParser(
    path.join(packagePath, packageInfo.typings)
  );

  // generate a plain list of IDs, types, and links
  let index = parser.getPageData();
  let content: string[] = [];
  for (let node of index) {
    for (let c of node.content) {
      if (c.spec.deprecated) continue;
      if (c.id.endsWith(".") || c.spec.inherited) continue;
      let path =
        node.id.replace(/\W/g, "_") +
        (c.id.indexOf(".") < 0 ? "" : "#" + c.id.replace(/[\.\@\[\]]/g, ":"));
      content.push(c.id + "|" + c.spec.type + "|" + path);
    }
  }
  content.sort((a, b) => (a === b ? 0 : a > b ? 1 : -1));

  let jsonItem = new Pipeline.Item("@symbols");
  jsonItem.output.push({
    path: config.json_out,
    data: JSON.stringify({
      version: packageInfo.version,
      content: compressContent(content),
    }),
  });
  pipeline.add(jsonItem);

  // parse miscellaneous content and generate all content pages
  let misc = new MiscContent();
  misc.readDir(config.misc_path);
  for (let page of index) {
    let pg = new PageGenerator(
      page,
      parser,
      misc,
      config.template,
      config.base_url
    );
    let content = pg.generate();
    let id = page.id.replace(/\W/g, "_");
    if (content.length) {
      if (pg.data.alias) {
        pg.data.alias = path.join(config.out, pg.data.alias + ".html");
      }
      pipeline.add(
        new Pipeline.Item(path.join(config.out, id), content, pg.data)
      );
    }
  }
}
