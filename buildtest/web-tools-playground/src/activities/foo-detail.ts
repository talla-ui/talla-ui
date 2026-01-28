import { Activity } from "talla-ui";
import { FooItem } from "./foo";
import { FooDetailView } from "./foo-detail.view";

export class FooDetailActivity extends Activity {
	static View = FooDetailView;

	constructor(public item: FooItem) {
		super();
		this.title = item.title;
	}
}
