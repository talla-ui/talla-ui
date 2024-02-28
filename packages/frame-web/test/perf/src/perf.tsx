import { app, AsyncTaskQueue, bound, Activity, ui } from "../../../dist";

const MAX = 10000;

const MyLabelStyle = ui.style.LABEL.extend({
	fontSize: 12,
});

const ViewBody = (
	<ui.scroll>
		<ui.row padding={{ x: 40, y: 16 }}>
			<ui.label style={ui.style.LABEL_TITLE}>Perf test</ui.label>
		</ui.row>
		<ui.list items={bound("items")}>
			<ui.row height={48}>
				<ui.label
					icon={ui.icon.CHEVRON_NEXT}
					iconMargin={16}
					style={MyLabelStyle}
				>
					Hello, this is row %[item]
				</ui.label>
			</ui.row>
			<ui.column layout={{ separator: { lineThickness: 1 } }} />
		</ui.list>
	</ui.scroll>
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
