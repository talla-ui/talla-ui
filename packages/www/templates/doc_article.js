module.exports = async (content, item, pipeline) =>
  require("./base")(
    `
<link rel="preload" href="/assets/icons/chevron.svg" as="image" />
<div id="breadcrumb_bar">
  <section class="wrapper">
      <a href="/" class="logo_link" id="breadcrumb_logo" hidden>
          <img src="/assets/logo_small.png" alt="Typescene logo" class="topnav_logo">
      </a>
      <span>
          <a href="/docs">${item.data.texts?.DOC_BACKLINK}</a>
          ${item.data.nav
            .map((it) =>
              item.path.startsWith(it.path)
                ? "&nbsp;|&nbsp " + pipeline.escapeHTML(it.title)
                : ""
            )
            .join("")}
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

        <div class="wrapper_column wrapper_column--sidebar">
            <div class="fixed_cell">
                <div class="fixed_cell_inner">
                    <nav id="toc" class="sidebar_nav">
                        ${item.data.nav
                          .map(
                            (it) =>
                              `<h4 class="${
                                item.path.startsWith(it.path)
                                  ? "open"
                                  : "closed"
                              }">${pipeline.escapeHTML(it.title)}</h4>
                              <ul>
                                  <li>{{nav:${it.path}}}</li>
                              </ul>
                              `
                          )
                          .join("\n")}
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
<link rel="prefetch" href="/docs/" as="fetch" />`,
    item,
    pipeline
  );
