import {
	app,
	Service,
	ServiceObserver,
	ManagedObject,
	ServiceContext,
} from "../../../dist/index.js";
import { describe, expect, test } from "@desk-framework/frame-test";

describe("ManagedService", (scope) => {
	scope.afterEach((t) => {
		t.breakOnFail();
		expect(app.services.getAll()).toBeArray(0);
	});

	test("Service context reference", () => {
		expect(app.services).toBeInstanceOf(ServiceContext);
		expect(ManagedObject.whence(app.services)).toBe(app);
	});

	test("Register and unlink", (t) => {
		// if this fails, don't bother testing more because can't guarantee global state
		t.breakOnFail();

		class MyService extends Service {
			id = "Test.MyService";
			foo = 1;
		}
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
		class MyService extends Service {
			id = "Test.MyService";
			foo = 1;
		}
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

	test("Observe single service", () => {
		class ObservedService extends Service {
			id = "Test.Observed";
			foo = 1;
		}
		let svc = new ObservedService();
		let observed = app.services.observeService("Test.Observed");
		expect(observed.service).toBeUndefined();
		app.services.add(svc);
		expect(observed.service).toBe(svc);
		svc.unlink();
		expect(observed.service).toBeUndefined();
	});

	test("Observe single service, using function", (t) => {
		class ObservedService extends Service {
			id = "Test.Observed";
			foo = 1;
		}
		let svc = new ObservedService();
		let observed = app.services.observeService(
			"Test.Observed",
			(service, event) => {
				if (event) t.count("event");
				if (service) t.count("service");
				else t.count("unlink");
			},
		);
		expect(observed.service).toBeUndefined();
		app.services.add(svc);
		expect(observed.service).toBe(svc);
		svc.emitChange();
		svc.unlink();
		expect(observed.service).toBeUndefined();
		t.expectCount("event").toBe(1);
		t.expectCount("service").toBe(2);
		t.expectCount("unlink").toBe(1);
	});

	test("Observe single service, custom observer", (t) => {
		class ObservedService extends Service {
			id = "Test.Observed";
			foo = 1;
		}
		class ObservedServiceObserver extends ServiceObserver<ObservedService> {
			// called when service found:
			override observe(service: ObservedService) {
				t.count("observe");
				return super.observe(service).observeProperty("foo");
			}
			onFooChange(value: number) {
				t.count("foo");
				if (value !== this.observed?.foo) t.fail("foo property mismatch");
			}
			onChange() {
				t.count("change");
			}
			override handleUnlink() {
				t.count("unlink");
			}
		}
		let svc = new ObservedService();
		app.services.add(svc);
		let observer = app.services.observeService(
			"Test.Observed",
			new ObservedServiceObserver(),
		);

		// trigger observer handlers
		svc.foo = 123;
		svc.emitChange();
		svc.unlink();
		observer.stop();

		// check that all handlers were called
		t.expectCount("observe").toBe(1);
		t.expectCount("foo").toBe(1);
		t.expectCount("change").toBe(1);
		t.expectCount("unlink").toBe(1);
	});

	test("Stop observing", (t) => {
		class ObservedService extends Service {
			id = "Test.Observed";
			stop?: boolean;
		}
		class ObservedServiceObserver extends ServiceObserver<ObservedService> {
			override observe(service: ObservedService) {
				return super.observe(service).observeProperty("stop");
			}
			onStopChange(value: number) {
				t.count(String(value));
				if (value) this.stop();
			}
		}
		let observer = app.services.observeService(
			"Test.Observed",
			new ObservedServiceObserver(),
		);

		// trigger observer handlers
		let svc = new ObservedService();
		app.services.add(svc);
		svc.stop = false;
		svc.stop = true;

		// following should not be observed
		svc = new ObservedService();
		app.services.add(svc);
		svc.stop = false;
		svc.stop = true;
		svc.unlink();
		observer.stop(); // shouldn't do anything

		// check that all handlers were called
		t.expectCount("false").toBe(1);
		t.expectCount("true").toBe(1);
	});

	test("Observe service changes", (t) => {
		class ChangedService extends Service {
			id = "Test.Changed";
			foo = 1;
		}
		class ChangedServiceObserver extends ServiceObserver<ChangedService> {
			// called when service found/changed:
			override observe(service: ChangedService) {
				t.count("observe");
				return super.observe(service).observeProperty("foo");
			}
			onFooChange() {
				t.count("foo");
			}
		}
		app.services.observeService("Test.Changed", new ChangedServiceObserver());

		let svc1 = new ChangedService();
		app.services.add(svc1);
		svc1.foo = 2;
		let svc2 = new ChangedService();
		app.services.add(svc2);
		svc1.foo = 3; // not observed
		svc2.foo = 4;
		svc2.unlink();
		svc2.foo = 5; // not observed
		let svc3 = new ChangedService();
		app.services.add(svc3);

		// check that all handlers were called
		t.expectCount("observe").toBe(3);
		t.expectCount("foo").toBe(2);

		// clear services
		app.services.clear();
	});
});
