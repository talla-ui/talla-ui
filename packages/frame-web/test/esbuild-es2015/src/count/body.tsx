import { bound, ui } from "../../../../lib/desk-framework-web.es2015.esm.min";
import NumberCount from "./NumberCount";

export default (
	<ui.column distribute="center">
		<NumberCount count={bound.number("count")} />
		<ui.spacer height={32} />
		<ui.animate showAnimation={ui.animation.FADE_IN_DOWN}>
			<ui.row align="center">
				<ui.button onClick="CountDown">Down</ui.button>
				<ui.button onClick="CountUp">Up</ui.button>
			</ui.row>
		</ui.animate>
	</ui.column>
);
