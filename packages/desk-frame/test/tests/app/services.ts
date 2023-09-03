import {
	app,
	ServiceObserver,
	ManagedObject,
	ServiceContext,
	Activity,
	Observer,
	bound,
} from "../../../dist/index.js";
import { describe, expect, test } from "@desk-framework/test";

describe("ManagedService", (scope) => {
	scope.afterEach((t) => {
		t.breakOnFail();
		expect(app.services.count).toBe(0);
	});

	test("Service context reference", () => {
		expect(app.services).toBeInstanceOf(ServiceContext);
		expect(ManagedObject.whence(app.services)).toBe(app);
	});

	test("Register and unlink", (t) => {
		// if this fails, don't bother testing more because can't guarantee global state
		t.breakOnFail();

		class MyService extends ManagedObject {
			foo = 1;
		}
		let svc = new MyService();
		app.services.set("Test.MyService", svc);
		app.services.set("Test.MyService", svc);
		expect(app.services.get("Test.MyService")).toBe(svc);
		expect(app.services.get("teST.mYSERvicE")).toBeUndefined();
		expect([...app.services.objects()]).toBeArray([svc]);

		svc.unlink();
		expect(app.services.get("Test.MyService")).toBeUndefined();
	});

	test("Change service", () => {
		class MyService extends ManagedObject {
			foo = 1;
		}
		let svc1 = new MyService();
		app.services.set("Test.MyService", svc1);
		expect([...app.services.objects()]).toBeArray([svc1]);
		let svc2 = new MyService();
		app.services.set("Test.MyService", svc2);
		expect(app.services.get("Test.MyService")).toBe(svc2);
		svc2.unlink();
		expect([...app.services.objects()]).toBeArray(0);
	});

	test("Observe single service", () => {
		class ObservedService extends ManagedObject {
			foo = 1;
		}
		let svc = new ObservedService();
		let observed = app.services.observeService("Test.Observed");
		expect(observed.service).toBeUndefined();
		app.services.set("Test.Observed", svc);
		expect(observed.service).toBe(svc);
		svc.unlink();
		expect(observed.service).toBeUndefined();
	});

	test("Observe single service, using function", (t) => {
		class ObservedService extends ManagedObject {
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
		app.services.set("Test.Observed", svc);
		expect(observed.service).toBe(svc);
		svc.emitChange();
		svc.unlink();
		expect(observed.service).toBeUndefined();
		t.expectCount("event").toBe(1);
		t.expectCount("service").toBe(2);
		t.expectCount("unlink").toBe(1);
	});

	test("Observe single service, custom observer", (t) => {
		class ObservedService extends ManagedObject {
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
		app.services.set("Test.Observed", svc);
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
		class ObservedService extends ManagedObject {
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
		app.services.set("Test.Observed", svc);
		svc.stop = false;
		svc.stop = true;

		// following should not be observed
		svc = new ObservedService();
		app.services.set("Test.Observed", svc);
		svc.stop = false;
		svc.stop = true;
		svc.unlink();
		observer.stop(); // shouldn't do anything

		// check that all handlers were called
		t.expectCount("false").toBe(1);
		t.expectCount("true").toBe(1);
	});

	test("Observe service changes", (t) => {
		class ChangedService extends ManagedObject {
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
		app.services.set("Test.Changed", svc1);
		svc1.foo = 2;
		let svc2 = new ChangedService();
		app.services.set("Test.Changed", svc2);
		svc1.foo = 3; // not observed
		svc2.foo = 4;
		svc2.unlink();
		svc2.foo = 5; // not observed
		let svc3 = new ChangedService();
		app.services.set("Test.Changed", svc3);

		// check that all handlers were called
		t.expectCount("observe").toBe(3);
		t.expectCount("foo").toBe(2);

		// clear services
		app.services.clear();
	});

	test("Reference service using bindings", (t) => {
		class MyService extends ManagedObject {
			foo = 1;
		}

		// define an activity that binds a service and its property
		class MyActivity extends Activity {
			constructor() {
				super();
				new ActivityObserver().observe(this);
				bound("services").bindTo(this, "services");
				bound("services.#Test").bindTo(this, "service");
				bound("services.#Test.foo").bindTo(this, "foo");
			}
			services?: ServiceContext;
			service?: MyService;
			foo?: number;
		}

		// observe the service property from the activity
		class ActivityObserver extends Observer<MyActivity> {
			override observe(observed: MyActivity) {
				return super.observe(observed).observeProperty("foo");
			}
			onFooChange(v: number) {
				if (v) t.count("foo");
			}
		}

		try {
			let activity = new MyActivity();
			app.addService("Test", new MyService());
			app.addActivity(activity); // service is now bound
			expect(activity.services).toBeInstanceOf(ServiceContext);
			expect(activity.service).toBeInstanceOf(MyService);
			expect(activity.foo).toBe(1);
			t.expectCount("foo").toBe(1);
		} finally {
			app.clear();
		}
	});
});
