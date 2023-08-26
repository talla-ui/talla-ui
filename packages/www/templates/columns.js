module.exports = async (content, item, pipeline) =>
  require("./base")(
    `
<article class="wrapper wrapper--page">
    <div class="pagetitle_container">
        <h1>${item.data.title}</h1>
    </div>

    <div class="wrapper_columns">
        <div class="wrapper_column">
            ${content.split("<col>")[0]}
        </div>

        <aside class="wrapper_column wrapper_column--aside">
            ${content.split("<col>")[1]}
        </aside>
    </div>
</article>`,
    item,
    pipeline
  );
