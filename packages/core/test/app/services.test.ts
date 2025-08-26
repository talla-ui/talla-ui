import { useTestContext } from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { Activity, app, ObservableObject } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Adding a service adds it to the list", () => {
	let service = new ObservableObject();
	app.addService(service);
	expect(app.services.toArray()).toContain(service);
});

test("Finding a service by type", () => {
	class MyService extends ObservableObject {}
	class MyOtherService extends ObservableObject {}
	let service = new MyService();
	let otherService = new MyOtherService();
	app.addService(service);
	app.addService(otherService);
	expect(app.getService(MyService)).toBe(service);
	expect(app.getService(MyOtherService)).toBe(otherService);
});

test("Finding a service by type, not found", () => {
	expect(() => app.getService(ObservableObject)).toThrow(/Service not found/);
});

test("Observing a service", () => {
	class MyService extends ObservableObject {}
	let service = new MyService();
	app.addService(service);
	let changes: any[] = [];
	class MyActivity extends Activity {
		readonly myService = this.observe(app.getService(MyService), (service) => {
			changes.push(service);
		});
	}
	let activity = new MyActivity();
	expect(activity.myService).toBe(service);
	service.emitChange();
	expect(changes).toEqual([service, service]);
});
