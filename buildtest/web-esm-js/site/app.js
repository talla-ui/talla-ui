import { useWebContext } from "./lib/talla-web.es2015.esm.min.js";
import { MainActivity } from "./main.js";

useWebContext().addActivity(new MainActivity(), true);
