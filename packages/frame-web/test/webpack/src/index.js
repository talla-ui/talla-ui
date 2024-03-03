import { useWebContext } from "@desk-framework/frame-web";
import { CountActivity } from "./counter.js";

useWebContext().addActivity(new CountActivity(), true);
