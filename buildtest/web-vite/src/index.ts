import { useWebContext } from "@talla-ui/web-handler";
import { app, UI, UIColor } from "talla-ui";
import { MainActivity } from "./main";

useWebContext((options) => {
	options.colors = {
		accent: UI.colors.blue,
	};
	options.darkColors = {
		background: new UIColor("#111"),
		accent: UI.colors.yellow,
	};
});

app.addActivity(new MainActivity(), true);

// import { Activity, app, Binding, UI } from "talla-ui";

// export class SampleActivity extends Activity {
// 	// The view is a static method that uses a binding
// 	static View(v: Binding<SampleActivity>) {
// 		return UI.Column(
// 			UI.Text("Count").bold(),
// 			UI.Text(v.bind("counter")).fontSize(48),
// 			UI.Button("Increment").onClick("CountUp"),
// 		).align("center");
// 	}

// 	// The current state is represented by properties
// 	counter = 0;

// 	// Event handlers are methods with specific names
// 	onCountUp() {
// 		this.counter++;
// 	}
// }

// useWebContext();
// app.addActivity(new SampleActivity(), true);
