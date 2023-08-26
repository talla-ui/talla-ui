import { BrowserApplication } from "@typescene/webapp";
import WidgetActivity from "./activity/WidgetActivity";
import SearchService from "./service/SearchService";

// create a layer on top of the document
let layer = document.createElement("div");
layer.style.position = "fixed";
layer.style.zIndex = "1000000";
document.body.appendChild(layer);

// register the search service and load its data
let search = new SearchService();
search.register();
search.loadAsync().catch((err) => {
  console.error(err);
});

// create the widget application
class Widget extends BrowserApplication.with(WidgetActivity) {}
let widget = new Widget(layer);

// add a function and event handler to activate the activity
(window as any).showDocWidget = () => {
  widget.activate();
};
window.addEventListener("keydown", (e) => {
  if (e.key === "/") {
    widget.activate();
    e.preventDefault();
  }
});
