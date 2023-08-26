const fs = require("fs");
const path = require("path");
const { Pipeline } = require("markdown-pipeline");

// NOTE: this pipeline module adds ONLY global transform functions, and assets.
// No other content is added here.
//
// Transforms:
// - Add linked files from YAML front matter `add` property
// - Add a `toc` data property that contains Markdown text for a Table of Contents
// - Add aliases (redirects) for a file if it an `alias` data property was set
// - Wrap output in a template if a `template` data property was set
// - Replace tags in the HTML output with generated content

const TYPESCENE_VERSION = JSON.parse(
  fs.readFileSync("./node_modules/typescene/package.json").toString()
).version;

/**
 * Add linked files from item `add` property
 * @param {import("markdown-pipeline").Pipeline.Item} item
 * @param {import("markdown-pipeline").Pipeline} pipeline
 */
async function addLinkedFiles(item, next, pipeline) {
  if (Array.isArray(item.data.add)) {
    pipeline.addFiles(
      ...item.data.add.map((fileName) =>
        path.relative(
          pipeline.path,
          path.join(path.dirname(item.path), fileName)
        )
      )
    );
  }
  return next();
}

/**
 * Parse all markdown headings, add a markdown list in data property `toc`
 * @param {import("markdown-pipeline").Pipeline.Item} item
 */
async function makeToc(item, next) {
  let toc = [];
  for (let line of item.markdown) {
    if (/^\#/.test(line)) {
      let match = line.match(/\#([\w-]+)\}\s*$/);
      if (match && match[1]) {
        toc.push(
          "* [" +
            line.replace(/^#+\s*/, "").replace(/\s*\{.*/, "") +
            "](#" +
            match[1] +
            "){.toc}"
        );
      }
    }
  }
  if (toc) item.data.toc = toc;
  return next();
}

/**
 * Wrap all output in an HTML template
 * @param {import("markdown-pipeline").Pipeline.Item} item
 * @param {import("markdown-pipeline").Pipeline} pipeline
 */
async function template(item, next, pipeline) {
  await next();
  if (item.data.template) {
    let templateId = String(item.data.template);
    if (/[^\w-]/.test(templateId))
      throw Error("Invalid template ID: " + templateId);
    let wrap;
    try {
      wrap = require("./templates/" + templateId);
    } catch (e) {
      throw Error("Template not found: " + templateId);
    }
    if (typeof wrap !== "function")
      throw Error("Invalid template module: " + templateId);
    for (let out of item.output) {
      out.data = await wrap(out.data, item, pipeline);
    }
  }
}

/**
 * Add aliases, i.e. alternative output that redirects to the primary path
 * @param {import("markdown-pipeline").Pipeline.Item} item
 * @param {import("markdown-pipeline").Pipeline} pipeline
 */
async function addAliases(item, next, pipeline) {
  await next();
  if (item.data.alias) {
    let outPath = item.output[0]?.path.replace(/(index)?\.html$/, "");
    let aliases = Array.isArray(item.data.alias)
      ? item.data.alias
      : [item.data.alias];
    for (let alias of aliases) {
      pipeline.add(
        new Pipeline.Item(
          item.path + ":alias",
          [
            "[Redirecting...](/" + outPath + "){:#redir}",
            "<script>document.location=document.getElementById('redir').href</script>",
          ],
          { ...item.data, output: alias, alias: undefined, aliasFor: outPath }
        )
      );
    }
  }
}

/**
 * Replace version tag
 * @param {import("markdown-pipeline").Pipeline.Item} item
 */
async function tag_version(item, next) {
  await next();
  if (!item.output.length) return;
  item.output[0].data = item.output[0].data.replace(
    /{{version}}/g,
    () => TYPESCENE_VERSION
  );
}

/**
 * Replace nav tag: insert list of matching links, and add TOC if possible
 * @param {import("markdown-pipeline").Pipeline.Item} item
 * @param {import("markdown-pipeline").Pipeline} pipeline
 */
async function tag_nav(item, next, pipeline) {
  await next();
  if (!item.output.length) return;
  let toc = await pipeline.parseAsync(item.data.toc);
  item.output[0].data = item.output[0].data.replace(
    /\<li\>{{nav:([^}]+)}}\<\/li\>/g,
    (_s, prefix) => {
      let items = pipeline
        .getAllItems()
        .filter(
          (it) =>
            !it.data.aliasFor && !it.data.parent && it.path.startsWith(prefix)
        )
        .map((it) => [
          it === item,
          it.output[0].path.replace(/(index)?\.html$/, ""),
          pipeline.escapeHTML(it.data.title),
        ]);
      return items
        .map((it) =>
          !it[0]
            ? `<li><a href="/${it[1]}">${it[2]}</a></li>` +
              `<link rel="prefetch" href="/${it[1]}" as="fetch" />`
            : `<li aria-current="page"><b>${it[2]}</b></li>` + toc
        )
        .join("\n");
    }
  );
}

/**
 * Replace refdoc tag: insert table rows of matching links
 * @param {import("markdown-pipeline").Pipeline.Item} item
 * @param {import("markdown-pipeline").Pipeline} pipeline
 */
async function tag_refdoc(item, next, pipeline) {
  await next();
  if (!item.output.length) return;
  item.output[0].data = item.output[0].data.replace(
    /\<tr\>\<td\>{{refdoc:([^}]+)}}\<\/td\>\<\/tr\>/g,
    (_s, prefix) => {
      let items = pipeline
        .getAllItems()
        .filter(
          (it) =>
            !it.data.aliasFor && !it.data.parent && it.path.startsWith(prefix)
        )
        .map((it) => [
          it.data.reftype,
          it.output[0].path.replace(/(index)?\.html$/, ""),
          pipeline.escapeHTML(it.data.title),
        ]);
      return items
        .map(
          (it) =>
            `<tr><td>${it[0]}</td><td><a href="/${it[1]}">${it[2]}</a></td></tr>`
        )
        .join("\n");
    }
  );
}

/**
 * Replace guides tag: insert list of matching block-level links as paragraphs
 * @param {import("markdown-pipeline").Pipeline.Item} item
 * @param {import("markdown-pipeline").Pipeline} pipeline
 */
async function tag_guides(item, next, pipeline) {
  await next();
  if (!item.output.length) return;
  item.output[0].data = item.output[0].data.replace(
    /\<p\>{{guides:([^}]+)}}\<\/p\>/g,
    (_s, prefix) => {
      let items = pipeline
        .getAllItems()
        .filter(
          (it) =>
            !it.data.aliasFor && it.data.parent && it.path.startsWith(prefix)
        )
        .map((it) => [
          it.output[0].path.replace(/(index)?\.html$/, ""),
          pipeline.escapeHTML(it.data.title),
        ]);
      return items
        .map(
          (it) =>
            `<p><a class="block_link guide" href="/${it[0]}"><b>${item.data.texts.DOC_GUIDELINK}</b> ${it[1]}</a></p>`
        )
        .join("\n");
    }
  );
}

/** @param {import("markdown-pipeline").Pipeline} pipeline */
module.exports.start = function (pipeline) {
  pipeline.parserOptions.smartypants = true;
  pipeline.addTransform(addLinkedFiles);
  pipeline.addTransform(makeToc);
  pipeline.addTransform(addAliases);
  pipeline.addTransform(template);
  pipeline.addTransform(tag_version);
  pipeline.addTransform(tag_nav);
  pipeline.addTransform(tag_refdoc);
  pipeline.addTransform(tag_guides);

  pipeline.addAssets(
    "./favicon.ico",
    "./CNAME",
    "./.nojekyll",
    { input: "./docwidget/dist/docwidget.js", output: "./assets/docwidget.js" },
    ...fs
      .readdirSync("./assets")
      .map((name) => "./assets/" + name)
      .filter((name) => !fs.statSync(name).isDirectory()),
    ...fs
      .readdirSync("./assets/icons")
      .map((name) => "./assets/icons/" + name)
      .filter((name) => !fs.statSync(name).isDirectory()),
    ...fs
      .readdirSync("./assets/images")
      .map((name) => "./assets/images/" + name)
      .filter((name) => !fs.statSync(name).isDirectory())
  );
};
