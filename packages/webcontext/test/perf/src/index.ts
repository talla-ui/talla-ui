import { useWebContext } from "../../../dist";
import { PerfActivity } from "./perf";

(window as any).app = useWebContext().addActivity(new PerfActivity(), true);
