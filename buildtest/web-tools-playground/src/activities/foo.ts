import {
	Activity,
	ActivityRouter,
	app,
	ObservableList,
	ObservableObject,
	UIListViewEvent,
} from "talla-ui";
import { FooDetailActivity } from "./foo-detail";
import { NewFooActivity } from "./foo-new";
import { FooView, FooViewModel } from "./foo.view";

export type FooItem = ObservableObject & {
	title: string;
	quantity: number;
	weight: number;
	total: number;
};

const sampleTitles =
	`Bear Bee Bird Cat Dog Dolphin Duck Elephant Fox Frog Giraffe Goat
	Gorilla Horse Lion Monkey Moose Mouse Owl Panda Parrot Penguin Pig
	Rabbit Rat Shark Sheep Skunk Sloth Snake Spider Tiger Turtle Wolf
	Zebra`.split(/\s+/);

export class FooActivity extends Activity implements FooViewModel {
	static View = FooView;

	constructor() {
		super();
		for (let title of sampleTitles) {
			let quantity = Math.floor(Math.random() * 10);
			let weight = Math.floor(Math.random() * 100);
			let total = quantity * weight;
			this.items.add(
				Object.assign(new ObservableObject(), {
					title,
					quantity,
					weight,
					total,
				}),
			);
		}
	}

	title = "Foo";
	navigationPath = "foo";

	items = new ObservableList<FooItem>();

	protected onGoToItem(e: UIListViewEvent<FooItem>) {
		let item = e.data.listViewItem;
		app.log.debug("Navigating to item", item.title);
		this.navigateAsync(`foo/${item.title}`);
	}

	protected async onNewItem() {
		let dialog = new NewFooActivity();
		this._router.add(dialog, true);
		for await (let _ of dialog.listenAsync()) {
			// Wait for dialog to unlink
		}
		app.log.debug("Adding new item");
		if (dialog.item) this.items.insert(dialog.item, this.items.first());
	}

	matchNavigationPath(path: string) {
		if (
			path !== this.navigationPath &&
			!path.startsWith(this.navigationPath + "/")
		)
			return false;
		let remainder = path.slice(this.navigationPath.length + 1);
		let item = this.items.find((i) => i.title === remainder);
		return () => {
			if (item) this._router.replace(new FooDetailActivity(item), true);
			else this._router.clear();
		};
	}

	private _router = this.attach(new ActivityRouter());
}
