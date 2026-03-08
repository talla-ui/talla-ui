import { useWebContext } from "@talla-ui/web-handler";
import { MainActivity } from "./main";

useWebContext().addActivity(new MainActivity(), true);
