import {
	app,
	AsyncTaskQueue,
	bound,
	JSX,
	Activity,
	UILabelStyle,
} from "../../../dist";

const MAX = 10000;

const MyLabelStyle = UILabelStyle.extend({
	fontSize: 12,
});

const ViewBody = (
	<scrollcontainer>
		<row padding={{ x: 40, y: 16 }}>
			<h1>Perf test</h1>
		</row>
		<list items={bound("items")}>
			<row height={48}>
				<label icon="@chevronNext" iconMargin={16} labelStyle={MyLabelStyle}>
					Hello, this is row %[item]
				</label>
			</row>
			<column layout={{ separator: { lineThickness: 1 } }} />
		</list>
	</scrollcontainer>
);

export class PerfActivity extends Activity {
	protected override ready() {
		this.view = new ViewBody();
		app.render(this.view);
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
