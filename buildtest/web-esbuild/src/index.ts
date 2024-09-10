import { useWebContext } from "@talla-ui/web-handler";
import { MainActivity } from "./main.js";

useWebContext().addActivity(new MainActivity(), true);
