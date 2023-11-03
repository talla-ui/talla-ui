import {
	app,
	Service,
	ManagedObject,
	ServiceContext,
	Activity,
	Observer,
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
		class ObserverService extends Service {
			id = "Test.Observer";
			observer = this.observeService("Test.Observed");
		}
		class ObservedService extends Service {
			id = "Test.Observed";
			foo = 1;
		}
		let svc = new ObservedService();
		let obs = new ObserverService();
		app.services.add(obs);
		expect(obs.observer.observed).toBeUndefined();
		app.services.add(svc);
		expect(obs.observer.observed).toBe(svc);
		svc.unlink();
		obs.unlink();
		expect(obs.observer.observed).toBeUndefined();
	});

	test("Observe single service, using function in activity", (t) => {
		class ObservedService extends Service {
			id = "Test.Observed";
			foo = 1;
		}
		class MyActivity extends Activity {
			observer = this.observeService("Test.Observed", (service, event) => {
				if (event) t.count("event");
				if (service) t.count("service");
				else t.count("unlink");
			});
		}
		let svc = new ObservedService();
		let act = new MyActivity();
		expect(act.observer.observed).toBeUndefined();
		app.services.add(svc);
		expect(act.observer.observed).toBe(svc);
		svc.emitChange();
		svc.unlink();
		expect(act.observer.observed).toBeUndefined();
		act.unlink();
		t.expectCount("event").toBe(1);
		t.expectCount("service").toBe(2);
		t.expectCount("unlink").toBe(1);
	});

	test("Stop observing by unlinking activity", (t) => {
		class ObservedService extends Service {
			id = "Test.Observed";
			foo = 1;
		}
		class MyActivity extends Activity {
			observer = this.observeService("Test.Observed", () => {});
		}
		let svc = new ObservedService();
		let act = new MyActivity();
		app.services.add(svc);
		expect(act.observer.observed).toBe(svc);
		act.unlink();
		expect(act.observer.observed).toBeUndefined();
		svc.unlink();
	});

	test("Observe single service, custom observer", (t) => {
		class ObservedService extends Service {
			id = "Test.Observed";
			foo = 1;
		}
		class ObservedServiceObserver extends Observer<ObservedService> {
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
		class MyActivity extends Activity {
			observer = this.observeService(
				"Test.Observed",
				new ObservedServiceObserver(),
			);
		}
		let svc = new ObservedService();
		app.services.add(svc);
		let act = new MyActivity();

		// trigger observer handlers
		svc.foo = 123;
		svc.emitChange();
		svc.unlink();
		act.unlink();

		// check that all handlers were called
		t.expectCount("observe").toBe(1);
		t.expectCount("foo").toBe(1);
		t.expectCount("change").toBe(1);
		t.expectCount("unlink").toBe(1);
	});

	test("Observe service changes", (t) => {
		class ChangedService extends Service {
			id = "Test.Changed";
			foo = 1;
		}
		class ChangedServiceObserver extends Observer<ChangedService> {
			// called when service found/changed:
			override observe(service: ChangedService) {
				t.count("observe");
				return super.observe(service).observeProperty("foo");
			}
			onFooChange() {
				t.count("foo");
			}
		}
		class MyActivity extends Activity {
			observer = this.observeService(
				"Test.Changed",
				new ChangedServiceObserver(),
			);
		}

		let act = new MyActivity();
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
		act.unlink();

		// check that all handlers were called
		t.expectCount("observe").toBe(3);
		t.expectCount("foo").toBe(2);

		// clear services
		app.services.clear();
	});
});
