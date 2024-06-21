import { useWebContext } from "@desk-framework/frame-web";
import { MainActivity } from "./main.js";

useWebContext().addActivity(new MainActivity(), true);
