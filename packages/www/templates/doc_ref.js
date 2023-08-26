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
          ${item.data.texts.DOC_REF}
      </span>
  </section>
</div>
<article class="wrapper wrapper--page">
    <div class="wrapper_columns">
        <div class="wrapper_column">
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

            ${content}
        </div>

        <div class="wrapper_column wrapper_column--sidebar wrapper_column--nav">
            <div class="fixed_cell">
                <div class="fixed_cell_inner">
                    <nav id="toc" class="sidebar_nav">
                        ${await pipeline.parseAsync([item.data.nav])}
                    </nav>
                </div>
                <div class="fixed_cell_backtotop">
                    <a href="#" onclick="backToTop()">${
                      item.data.texts?.BACKTOTOP
                    }</a>
                </div>
            </div>
        </div>
    </div>
</article>
<link rel="prefetch" href="/docs/" as="fetch" />
<script>
    (function(){document.querySelectorAll(".sidebar_nav ul+h4").forEach(function(it){it.className="closed"})})()
</script>
`,
    item,
    pipeline
  );
