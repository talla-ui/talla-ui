import {
	app,
	Service,
	ManagedObject,
	ServiceContext,
	Activity,
} from "../../../dist/index.js";
import { describe, expect, test } from "@desk-framework/frame-test";

describe("ManagedService", (scope) => {
	scope.afterEach((t) => {
		t.breakOnFail();
		expect(app.services.getAll()).toBeArray(0);
	});

	class MyService extends Service {
		id = "Test.MyService";
		foo = 1;
	}

	test("Service context reference", () => {
		expect(app.services).toBeInstanceOf(ServiceContext);
		expect(ManagedObject.whence(app.services)).toBe(app);
	});

	test("Register and unlink", (t) => {
		// if this fails, don't bother testing more because can't guarantee global state
		t.breakOnFail();

		let svc = new MyService();
		expect(svc.isServiceRegistered()).toBe(false);
		app.addService(svc);
		expect(svc.isServiceRegistered()).toBe(true);
		expect(app.services.get("Test.MyService")).toBe(svc);
		expect(app.services.get("teST.mYSERvicE")).toBeUndefined();
		expect([...app.services.getAll()]).toBeArray([svc]);

		svc.unlink();
		expect(app.services.get("Test.MyService")).toBeUndefined();
		expect(svc.isServiceRegistered()).toBe(false);
	});

	test("Change service", () => {
		let svc1 = new MyService();
		app.services.add(svc1);
		expect([...app.services.getAll()]).toBeArray([svc1]);
		app.services.add(svc1);
		expect([...app.services.getAll()]).toBeArray([svc1]);
		let svc2 = new MyService();
		app.services.add(svc2);
		expect(app.services.get("Test.MyService")).toBe(svc2);
		expect(svc1.isServiceRegistered()).toBe(false);
		expect(svc2.isServiceRegistered()).toBe(true);
		svc2.unlink();
		expect([...app.services.getAll()]).toBeArray(0);
	});

	test("Observe single service, after adding", () => {
		let svc = new MyService();
		app.services.add(svc);
		let observer = app.services.observe<MyService>("Test.MyService");
		expect(observer).toHaveProperty("service").toBe(svc);
		observer.unlink();
		expect(observer).toHaveProperty("service").toBeUndefined();
		app.services.clear();
	});

	test("Observe single service, before adding", () => {
		let svc = new MyService();
		let observer = app.services.observe<MyService>("Test.MyService");
		expect(observer).toHaveProperty("service").toBeUndefined();
		app.services.add(svc);
		expect(observer).toHaveProperty("service").toBe(svc);
		svc.unlink();
		expect(observer).toHaveProperty("service").toBeUndefined();
		observer.unlink();
	});

	test("Observe service change", () => {
		let svc1 = new MyService();
		let svc2 = new MyService();
		app.services.add(svc1);
		let observer = app.services.observe<MyService>("Test.MyService");
		expect(observer).toHaveProperty("service").toBe(svc1);
		app.services.add(svc2);
		expect(observer).toHaveProperty("service").toBe(svc2);
		observer.unlink();
		app.services.clear();
	});

	test("Listen for service events, after adding", (t) => {
		let svc = new MyService();
		app.services.add(svc); // + service
		let observer = app.services.observe<MyService>(
			"Test.MyService",
			(service, event) => {
				if (service && service !== svc) t.fail("Service mismatch");
				if (service) t.count("service");
				else t.count("unlinked");
				if (event) t.count(event.name);
			},
		);
		svc.emit("Foo"); // + service, + Foo
		svc.unlink(); // + unlinked
		observer.unlink();
		t.expectCount("service").toBe(2);
		t.expectCount("unlinked").toBe(1);
		t.expectCount("Foo").toBe(1);
	});

	test("Listen for service events, before adding, then change", (t) => {
		let svc1 = new MyService();
		let svc2 = new MyService();
		let observer = app.services.observe<MyService>(
			"Test.MyService",
			(service, event) => {
				if (service === svc1) t.count("svc1");
				else if (service === svc2) t.count("svc2");
				else if (!service) t.count("unlinked");
				if (event) t.count(event.name);
			},
		);
		app.services.add(svc1); // + svc1
		svc1.emit("Foo"); // + svc1, + Foo
		app.services.add(svc2); // + svc2
		svc2.emit("Bar"); // + svc2, + Bar
		svc2.unlink(); // + unlinked
		observer.unlink();
		t.expectCount("svc1").toBe(2);
		t.expectCount("svc2").toBe(2);
		t.expectCount("unlinked").toBe(1);
		t.expectCount("Foo").toBe(1);
		t.expectCount("Bar").toBe(1);
	});

	test("Observe service from activity", (t) => {
		let svc = new MyService();
		app.services.add(svc); // + service
		class MyActivity extends Activity {
			myService = this.attach(
				app.services.observe<MyService>(
					"Test.MyService",
					(svc) => svc && this.update(),
				),
			);
			update() {
				// note: this.myService may not actually be set yet here
				t.count("update");
			}
		}
		let act = new MyActivity();
		expect(act.myService).toHaveProperty("service").toBe(svc);
		svc.emitChange();
		t.expectCount("update").toBe(2);
		act.unlink();
		expect(act.myService).toHaveProperty("service").toBeUndefined();
		expect(act.myService.isUnlinked()).toBe(true);
		svc.unlink();
	});
});
