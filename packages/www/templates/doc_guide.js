module.exports = async (content, item, pipeline) =>
  require("./base")(
    `
<div id="breadcrumb_bar">
  <section class="wrapper">
      <a href="/" class="logo_link" id="breadcrumb_logo" hidden>
          <img src="/assets/logo_small.png" alt="Typescene logo" class="topnav_logo">
      </a>
      <span>
          <a href="/docs">${item.data.texts.DOC_BACKLINK}</a>
          &nbsp;|&nbsp;
          ${item.data.texts.DOC_GUIDES}
          &gt;
          <a href="/${pipeline.find(item.data.parent).output[0].path}">
              ${pipeline.escapeHTML(pipeline.find(item.data.parent).data.title)}
          </a>
      </span>
  </section>
</div>
<article class="wrapper wrapper--page wrapper--guide">
    <div class="pagetitle_container">
        <h1>${item.data.title}</h1>
        ${
          item.data.pageintro
            ? `<p class="style--pageintro">${await pipeline.parseAsync(
                item.data.pageintro
              )}</p>`
            : ""
        }
    </div>
    <div class="wrapper_columns">
        <div class="wrapper_column wrapper--guide_content">
            ${content}
        </div>
    </div>
</article>
<link rel="prefetch" href="/docs/" as="fetch" />`,
    item,
    pipeline
  );
