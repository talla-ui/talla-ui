import { useWebContext } from "@desk-framework/frame-web";
import { CountActivity } from "./counter";

useWebContext().addActivity(new CountActivity(), true);
