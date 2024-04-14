import { ListActivity } from "./ListActivity.js";
import { useWebContext } from "./lib/desk-framework-web.es2018.esm.min.js";

useWebContext().addActivity(new ListActivity(), true);
