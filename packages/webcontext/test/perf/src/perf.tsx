import { bound, JSX, PageViewActivity, UIIcon, UIStyle } from "../../../dist";

const MAX = 1000;

const labelStyle = UIStyle.Label.extend({
	textStyle: {
		fontSize: 12,
	},
});

const ViewBody = (
	<scrollcontainer dimensions={{ maxHeight: "100%" }}>
		<row>
			<h1>Perf test</h1>
		</row>
		<list items={bound("items")}>
			<row>
				<label icon={UIIcon.ExpandRight} style={labelStyle}>
					Hello, this is row %[item]
				</label>
			</row>
			<column layout={{ separator: { lineThickness: 1 } }} />
		</list>
	</scrollcontainer>
);

export class PerfActivity extends PageViewActivity {
	static override ViewBody = ViewBody;
	protected override async beforeActiveAsync(): Promise<void> {
		this.items = new Array(MAX);
		for (let i = 0; i < MAX; i++) {
			this.items[i] = i;
		}
		await super.beforeActiveAsync();
	}
	items?: number[];
}
