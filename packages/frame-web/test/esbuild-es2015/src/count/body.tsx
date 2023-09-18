import { bound, JSX } from "../../../../lib/desk-framework-web.es2015.esm.min";
import NumberCount from "./NumberCount";

export default (
	<cell>
		<NumberCount count={bound.number("count")} />
		<spacer height={32} />
		<row align="center">
			<button onClick="CountDown">Down</button>
			<button onClick="CountUp">Up</button>
		</row>
	</cell>
);
