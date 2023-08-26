const fs = require("fs");
const { generateDocs } = require("../../docgen/dist");

const lang_texts = {
  DOCS: "Docs",
  DOC_BACKLINK: "Documentation",
  DOC_GUIDELINK: "Guide:",
  DOC_GUIDES: "Guides",
  DOC_REF: "Reference",
  DOC_TOC: "Contents",
  BACKTOTOP: "↑ Back to top",
  COPYRIGHT: "© Copyright 2021 Typescene contributors",
  FOOTER: `Find Typescene on
    <a href="https://twitter.com/typescene" target="_blank" rel="noopener">Twitter</a> and
    <a href="https://github.com/typescene" target="_blank" rel="noopener">Github</a>`,
};

/** @param {import("markdown-pipeline").Pipeline} pipeline */
module.exports.start = function (pipeline) {
  pipeline = pipeline.spawn("content/en", "./");

  // add data properties to all pages
  pipeline.addTransform(async (item, next) => {
    // set language property
    item.data.lang = "en";
    item.data.texts = lang_texts;

    // set nav array to be used in the sidebar
    if (!item.data.nav) {
      item.data.nav = [
        { title: "Overview", path: "content/en/docs/overview/" },
        { title: "Concepts", path: "content/en/docs/concepts/" },
        { title: "Guides", path: "content/en/docs/guides/" },
      ];
    }

    return next();
  });

  // add all markdown files content
  pipeline.addFiles(
    "index.md",
    "404.md",
    "docs/index.md",
    "docs/overview/goals.md",
    "docs/overview/introduction.md",
    "docs/overview/installation.md",
    "docs/overview/js-ts.md",
    "docs/concepts/components.md",
    "docs/concepts/lists-maps.md",
    "docs/concepts/views.md",
    "docs/concepts/activities.md",
    "docs/concepts/services.md",
    "docs/guides/ui/index.md",
    "docs/guides/layout/index.md"
  );

  // add generated documentation
  generateDocs(pipeline.spawn("", "docs/ref"), {
    module: "typescene",
    misc_path: "content/en/docs/reference",
    template: "doc_ref",
    out: "docs/ref",
    json_out: "assets/ref.json",
    base_url: "/docs/ref/",
  });
};
