import { app, AsyncTaskQueue, bound, Activity, ui } from "../../../dist";

const MAX = 10000;

const MyLabelStyle = ui.style.LABEL.extend({
	fontSize: 12,
});

const ViewBody = (
	<scroll>
		<row padding={{ x: 40, y: 16 }}>
			<label style={ui.style.LABEL_TITLE}>Perf test</label>
		</row>
		<list items={bound("items")}>
			<row height={48}>
				<label icon={ui.icon.CHEVRON_NEXT} iconMargin={16} style={MyLabelStyle}>
					Hello, this is row %[item]
				</label>
			</row>
			<column layout={{ separator: { lineThickness: 1 } }} />
		</list>
	</scroll>
);

export class PerfActivity extends Activity {
	protected override ready() {
		this.view = new ViewBody();
		app.showPage(this.view);
	}
	protected override async beforeActiveAsync() {
		this.items = new Array(MAX);
		for (let i = 0; i < MAX; i++) {
			this.items[i] = i;
		}
		let startTime = Date.now();
		function checkQueue() {
			app.renderer?.schedule(
				((task: AsyncTaskQueue.Task) => {
					if (task.queue.count > 10) checkQueue();
					else {
						console.log(
							"Queue stopped after " + (Date.now() - startTime) + "ms",
						);
					}
				}) as any,
				true,
			);
		}
		checkQueue();
		await super.beforeActiveAsync();
	}
	items?: number[];
}
