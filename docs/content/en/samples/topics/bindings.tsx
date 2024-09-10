// Compile/run: npx tsc -p . && node dist/bindings.js

import { bound, Activity, app, Binding, ui } from "talla";
/** @jsx ui.jsx */

{
	// @doc-start bindings:hidden
	const SampleView = (
		<column>
			<row>
				<button onClick="ToggleDetails">Toggle</button>
			</row>
			<cell hidden={bound.not("showDetails")}>
				<label>Details go here...</label>
			</cell>
		</column>
	);

	class SampleActivity extends Activity {
		showDetails?: boolean;

		ready() {
			this.view = new SampleView();
			app.showPage(this.view);
		}

		onToggleDetails() {
			this.showDetails = !this.showDetails;
		}
	}
	// @doc-end
}
{
	// @doc-start bindings:list
	const View = (
		<column>
			<list items={bound.list("customers")}>
				<row>
					<label>%[item.name]</label>
				</row>
			</list>
			<row hidden={bound("customers.count")}>
				<label>No matching customers</label>
			</row>
		</column>
	);
	// @doc-end
}
{
	// @doc-start bindings:jsx
	// A view with automatic JSX string-formatted bindings
	const View = (
		<column>
			<label>Report for %[today:local|date]</label>
			<list items={bound.list("customerTickets")}>
				<row>
					<label>%[item.name]</label>
					<label>%[item.nClosed] / %[item.total]</label>
				</row>
			</list>
		</column>
	);
	// @doc-end
}
{
	// @doc-start bindings:debug
	// add a handler before starting the application:
	Binding.debugHandler = (b) => {
		if (b.bound) {
			console.log("Bound: " + b.binding, b.value);
		} else {
			console.log("Unbound: " + b.binding);
		}
	};
	// @doc-end
}
