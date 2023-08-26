module.exports = async (content, item, pipeline) =>
  require("./base")(
    `
<div class="titlebackdrop_container">
    <div class="titlebackdrop"></div>
    <div class="wrapper wrapper--tight">
        <h2 class="displaytitle">Build apps with confidence</h2>
        <p>
          Typescene is a robust Web app framework made with TypeScript: strongly typed, no dependencies, no nonsense.
        </p>
    </div>
</div>

<section class="wrapper wrapper--encroach refblock_container">
    <div class="refblock">
        <div class="refblock_block">
            <h3><a href="/docs/goals">Why Typescene?</a></h3>
            <p>Typescene helps you to develop maintainable Web apps. Use this to convince your boss.</p>
            <p><a href="/docs/goals">Read more ▸</a></p>
        </div>
    </div>
    <div class="refblock">
        <div class="refblock_block">
            <h3><a href="/docs/introduction">How does it work?</a></h3>
            <p>Read this to learn more about the core components that make up a Typescene application.</p>
            <p><a href="/docs/introduction">Read more ▸</a></p>
        </div>
    </div>
    <div class="refblock">
        <div class="refblock_block">
            <h3><a href="/docs">Guides & Docs</a></h3>
            <p>Browse all documentation guides, or search for detailed information on any of the API exports.</p>
            <p><a href="/docs">View topics ▸</a></p>
        </div>
    </div>
</section>

<section class="wrapper">
    <p style="text-align: center">
        <b>New!</b>
        <span style="display: inline-block; padding: .25rem .5rem">
            <img src="/assets/logo_detail.png" class="logo_inline" alt="Logo">&nbsp;<a href="https://github.com/typescene/create-typescene-webapp" target="_blank" rel="noopener">create-typescene-webapp</a>
        </span>
        <span style="display: inline-block; padding: .25rem .5rem">
            <img src="/assets/vscode_logo.png" class="logo_inline" alt="VS Code Logo">&nbsp;<a href="https://marketplace.visualstudio.com/items?itemName=jcormont.vscode-typescene-snippets" target="_blank" rel="noopener">VS Code Snippets</a>
        </span>
        <span style="display: inline-block; padding: .25rem .5rem">
            <img src="/assets/realworld_icon.png" class="logo_inline" alt="RealWorld icon">&nbsp;<a href="https://github.com/typescene/typescene-realworld-example-app" target="_blank" rel="noopener">RealWorld example</a>
        </span>
    </p>

    <p class="style--dim" style="text-align: center">
        Typescene is independent, free, and open source.
        <a href="https://github.com/typescene" target="_blank" rel="noopener">Contribute on Github.</a>
    </p>
</section>

<article class="wrapper wrapper--home">
    ${content}
</article>

<div class="prefooter">
    <div class="wrapper wrapper--home">
        <section class="wrapper_columns">
            <div class="wrapper_column" id="footer_logo_column">
                <a href="/" class="logo_link">
                    <img src="/assets/logo_detail.png" alt="Typescene logo" class="footer_logo">
                    <span class="topnav_title">Typescene</span>
                </a>
            </div>
            <div class="wrapper_column">
                <div class="wrapper_columns">
                    <div class="wrapper_column">
                        <h4>Getting Started</h4>
                        <ul>
                            <li><a href="/docs/goals">Why Typescene?</a></li>
                            <li><a href="/docs/introduction">Basic Overview</a></li>
                            <li><a href="/docs/installation">Installation</a></li>
                        </ul>
                    </div>
                    <div class="wrapper_column">
                        <h4>Resources</h4>
                        <ul style="list-style-type: none">
                            <li><a href="/docs">Documentation</a></li>
                            <li><a href="https://github.com/typescene/typescene/issues" target="_blank" rel="noopener">Github Issues <img src="/assets/icons/appexit.svg" alt="External website" style="width: .785rem"></a></li>
                            <li><a href="https://twitter.com/typescene" target="_blank" rel="noopener">Twitter <img src="/assets/icons/appexit.svg" alt="External website" style="width: .785rem"></a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    </div>
</div>
<link rel="prefetch" href="/docs/goals" as="fetch" />
<link rel="prefetch" href="/docs/introduction" as="fetch" />
<link rel="prefetch" href="/docs/" as="fetch" />`,
    item,
    pipeline
  );
