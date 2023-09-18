import { useWebContext } from "../lib/desk-framework-web.es2018.esm.min.js";
import { CountActivity } from "./counter.js";

useWebContext().addActivity(new CountActivity(), true);
