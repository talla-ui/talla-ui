import { useWebContext } from "../../../dist";
import { CountActivity } from "./counter.js";

useWebContext().addActivity(new CountActivity(), true);
