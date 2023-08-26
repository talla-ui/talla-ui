# Documentation Widget

This folder contains the source code for the documentation widget that is displayed in the top-right hand side corner.

The widget loads the search content index from `/assets/ref.json`, which is updated independently using the `docgen` tool, included in this same repository.

## Building from source

To build a new `docwidget` bundle, run `npm install` in this folder. The bundle is automatically stored in the root `assets` folder.

## TODO

To be able to translate this website, the widget needs to know the currently selected locale, and update links accordingly (assuming reference content for different languages resides in different sub folders of `/docs`).
