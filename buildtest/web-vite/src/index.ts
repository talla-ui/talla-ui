import { setWebTheme, useWebContext, WebTheme } from "@talla-ui/web-handler";
import { app, UI, UIColor } from "talla-ui";
import { MainActivity } from "./main";

useWebContext();
setWebTheme(
	new WebTheme()
		.colors({
			accent: UI.colors.blue,
		})
		.darkColors({
			background: new UIColor("#111"),
			accent: UI.colors.yellow,
		})
		// Custom button style for toggle/switch buttons (extends default)
		.customStyle("button", "default", "toggleButton", {
			borderRadius: "0.5rem",
			minWidth: "0",
			"+pressed": {
				background: UI.colors.accent,
				textColor: UI.colors.accent.text(),
			},
		}),
);

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
