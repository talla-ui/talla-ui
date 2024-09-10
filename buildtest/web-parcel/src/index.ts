import { useWebContext } from "talla";
import { MainActivity } from "./main";

useWebContext().addActivity(new MainActivity(), true);
