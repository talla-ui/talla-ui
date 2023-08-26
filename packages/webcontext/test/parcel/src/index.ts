import { useWebContext } from "@desk-framework/webcontext";
import { CountActivity } from "./counter";

useWebContext().addActivity(new CountActivity(), true);
