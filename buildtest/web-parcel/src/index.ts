import { useWebContext } from "@desk-framework/frame-web";
import { MainActivity } from "./main";

useWebContext().addActivity(new MainActivity(), true);
