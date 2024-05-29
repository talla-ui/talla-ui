import {
	$activity,
	ui,
} from "../../../../lib/desk-framework-web.es2015.esm.min";
import NumberCount from "./NumberCount";

export default (
	<column distribute="center">
		<NumberCount count={$activity.number("count")} />
		<spacer height={32} />
		<animate showAnimation={ui.animation.FADE_IN_DOWN}>
			<row align="center">
				<button onClick="CountDown">Down</button>
				<button onClick="CountUp">Up</button>
			</row>
		</animate>
	</column>
);
