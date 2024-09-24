// Compile/run: npx tsc -p . && node dist/activities.js

import { Activity, ManagedObject, NavigationTarget, app, ui } from "talla-ui";

{
	const MyView = ui.cell({});

	// @doc-start activities:showing-views
	class MyActivity extends Activity {
		ready() {
			this.view = new MyView();
			app.showPage(this.view);
		}
	}
	// @doc-end
}
{
	// @doc-start activities:lifecycle
	class MyActivity extends Activity {
		protected async beforeActiveAsync() {
			// 1. this is called while activating
			// (awaited, may cancel activation)
		}
		protected async afterActiveAsync() {
			// 2. this is called after activating
			// (awaited)
		}
		protected ready() {
			// 3. this is called after 'afterActiveAsync()'
			// (synchronously)
		}
		protected async beforeInactiveAsync() {
			// 4. this is called while deactivating
			// (awaited, may cancel deactivation)
		}
		protected async afterInactiveAsync() {
			// 5. this is called after deactivating
			// (awaited)
		}
		protected beforeUnlink() {
			// 6. this is called by 'unlink()' before unlinking
			// (synchronously)
		}
	}
	// @doc-end
}
{
	class ReportOutput extends ManagedObject {}
	const MyView = ui.cell({});

	// @doc-start activities:routing
	class MyActivity extends Activity {
		navigationPageId = "reports";

		// example: use a view model to expose the current state
		report?: ReportOutput = undefined;

		ready() {
			// note that this runs before the below method
			// (if needed, you can show an empty state first,
			// and show another view only from the below,
			// or even use a new attached activity)
			this.view = new MyView();
			app.showPage(this.view);
		}

		// handle navigation detail updates:
		async handleNavigationDetailAsync(detail: string) {
			let [type, period] = detail.split("/");
			if (type === "sales") {
				// create a sales report ...
			} else if (type === "inventory") {
				// create an inventory report ...
			} else {
				// show empty state
			}
		}
	}
	// @doc-end
}
{
	// @doc-start activities:navigate
	class SidebarActivity extends Activity {
		ready() {
			// ... show a sidebar view
		}

		async navigateAsync(target: NavigationTarget) {
			// called when a button is clicked within the view,
			// handle navigation here and close the sidebar:
			await super.navigateAsync(target);
			await this.deactivateAsync();
		}
	}
	// @doc-end
}
{
	// @doc-start activities:schedule
	class MyActivity extends Activity {
		// ...

		refreshQueue = this.createActiveTaskQueue({ throttleDelay: 10_000 }).add(
			() => this.refreshDataAsync(),
		);

		async refreshDataAsync() {
			try {
				// ... refresh data from server,
				// at most every 10s while active
			} finally {
				this.refreshQueue.add(this.refreshDataAsync.bind(this));
			}
		}
	}
	// @doc-end
}
