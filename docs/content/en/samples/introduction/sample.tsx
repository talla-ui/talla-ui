import { Activity, app, bound, ui } from "talla-ui";
import { useWebContext } from "@talla-ui/web-handler";
/** @jsx ui.jsx */

// @doc-start introduction:sample-style
// Define a label style for the large counter
const CounterLabelStyle = ui.style.LABEL.extend({
	fontSize: 36,
	bold: true,
});
//@doc-end

// @doc-start introduction:sample-view-jsx
// Define the page view using JSX
const AppPage = (
	<column>
		<label style={CounterLabelStyle}>Counter: %[count]</label>
		<row align="center">
			<button onClick="CountDown">Down</button>
			<button onClick="CountUp">Up</button>
		</row>
	</column>
);
// @doc-end

{
	// @doc-start introduction:sample-view
	// Define the page view using static method calls
	const AppPage = ui.column(
		ui.label(bound.strf("Counter: %s", "count"), CounterLabelStyle),
		ui.row(
			{ align: "center" },
			ui.button("Down", "CountDown"),
			ui.button("Up", "CountUp"),
		),
	);
	// @doc-end
	AppPage;
}
{
	ui.column(
		// @doc-start introduction:sample-inline-style-jsx
		<label style={{ bold: true, fontSize: 36 }}>Counter: %[count]</label>,
		// @doc-end
	);
}

// @doc-start introduction:sample-activity
// Define the activity
class CounterActivity extends Activity {
	// this property will be bound to the label
	count = 0;

	// when ready, show the page
	ready() {
		this.view = new AppPage();
		app.showPage(this.view);
	}

	// event handlers for both buttons
	onCountDown() {
		if (this.count > 0) this.count--;
	}
	onCountUp() {
		this.count++;
	}
}
// @doc-end

// @doc-start introduction:sample-app
useWebContext();
app.addActivity(new CounterActivity(), true);
// @doc-end
