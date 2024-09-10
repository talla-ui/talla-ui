import { useWebContext } from "talla";
import { MainActivity } from "./main.js";

useWebContext().addActivity(new MainActivity(), true);
