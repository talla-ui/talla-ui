module.exports = async (content, item, pipeline) =>
  `<!DOCTYPE html>
<html lang="${item.data.lang || "en"}">
<head>
    <meta charset="UTF-8">
    ${
      item.data.description
        ? `<meta name="Description" content="${pipeline.escapeHTML(
            item.data.description
          )}">`
        : ""
    }
    <meta name="viewport" content="width=device-width, maximum-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>${
      "Typescene" +
      (item.data.title === "Typescene" ? "" : " - " + item.data.title)
    }</title>
    <!-- Global site tag (gtag.js) - Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=UA-96048899-3"></script>
    <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'UA-96048899-3');
    </script>
    <!-- end GA -->
    <link rel="stylesheet" href="/assets/style.css">
    <link href="https://fonts.googleapis.com/css?family=IBM+Plex+Mono:400,300i|IBM+Plex+Sans:200,300,500,800,200i,300i,500i" rel="stylesheet">
    <link rel="canonical" href="https://typescene.dev/${
      item.data.aliasFor ||
      item.output[0]?.path?.replace(/(index)?\.html$/, "") ||
      ""
    }">
</head>
<body${item.data.homepage ? ` class="home"` : ""}>
    <nav class="topnav">
        <section class="wrapper">
            <a href="/" class="logo_link">
                <img src="/assets/logo_small.png" alt="Typescene logo" class="topnav_logo">
                <span class="topnav_title">Typescene</span>
            </a>
            <ul class="topnav_links">
                <li><a href="#" onclick="return showDocWidget()"><img src="/assets/icons/search-reverse.svg" alt="" width=16 style="position: relative; top: .125rem">&nbsp; ${
                  item.data.texts?.DOCS
                }</a></li>
                <li class="hide_small"><a href="https://github.com/typescene/typescene" target="_blank" rel="noopener">Github</a></li>
            </ul>
        </section>
    </nav>

    ${content}

    <footer class="footer">
        <section class="wrapper">
            <div class="wrapper_columns">
                <div class="wrapper_column">
                    ${item.data.texts?.COPYRIGHT}
                </div>
                <div class="wrapper_column wrapper_column--oppose style--light">
                    ${item.data.texts?.FOOTER}
                </div>
            </div>
        </section>
    </footer>

    <script src="/assets/default.js"></script>
    <script src="/assets/docwidget.js"></script>
</body>
</html>
`;
