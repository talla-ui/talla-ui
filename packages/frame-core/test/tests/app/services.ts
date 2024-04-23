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

	test("Observe single service, from service", () => {
		class ObservedService extends Service {
			id = "Test.Observed";
			foo = 1;
		}
		class ObserverService extends Service {
			constructor() {
				super();
				this.observeService<ObservedService>("Test.Observed", (service) => {
					this.observed = service;
				});
			}
			id = "Test.Observer";
			observed?: ObservedService;
		}
		let svc = new ObservedService();
		let obs = new ObserverService();
		app.services.add(obs);
		expect(obs.observed).toBeUndefined();
		app.services.add(svc);
		expect(obs.observed).toBe(svc);
		svc.unlink();
		obs.unlink();
		expect(obs.observed).toBeUndefined();
	});

	test("Observe single service, from activity", (t) => {
		class ObservedService extends Service {
			id = "Test.Observed";
			foo = 1;
		}
		class MyActivity extends Activity {
			constructor() {
				super();
				this.observeService<ObservedService>(
					"Test.Observed",
					(service, event) => {
						this.observed = service;
						if (event) t.count("event");
						if (service) t.count("service");
						else t.count("unlink");
					},
				);
			}
			observed?: ObservedService;
		}
		let svc = new ObservedService();
		let act = new MyActivity();
		expect(act.observed).toBeUndefined();
		app.services.add(svc);
		expect(act.observed).toBe(svc);
		svc.emitChange();
		svc.unlink();
		expect(act.observed).toBeUndefined();
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
			constructor() {
				super();
				this.observeService<ObservedService>("Test.Observed", (service) => {
					this.observed = service;
				});
			}
			observed?: ObservedService;
		}
		let svc = new ObservedService();
		let act = new MyActivity();
		app.services.add(svc);
		expect(act.observed).toBe(svc);
		act.unlink();
		svc.unlink();
		expect(act.observed).toBe(svc);
	});

	test("Observe service changes", (t) => {
		let idx = 0;
		class ChangedService extends Service {
			id = "Test.Changed";
			idx = ++idx;
		}
		class MyActivity extends Activity {
			constructor() {
				super();
				this.observeService<ChangedService>(
					"Test.Changed",
					(service, event) => {
						t.log("Handled:", service?.idx, event?.name);
						if (event) t.count(event.name);
						else if (service) t.count("service");
						else t.count("unlink");
					},
				);
			}
		}

		let act = new MyActivity();
		let svc1 = new ChangedService();
		app.services.add(svc1); // + service
		svc1.emit("Foo"); // + Foo
		let svc2 = new ChangedService();
		app.services.add(svc2); // + service
		svc1.emit("Foo"); // nothing!
		svc2.emit("Foo"); // + Foo
		svc2.unlink(); // + unlink
		svc2.emit("Foo"); // nothing!
		let svc3 = new ChangedService();
		app.services.add(svc3); // + service
		act.unlink();

		// check that all handlers were called
		t.expectCount("service").toBe(3);
		t.expectCount("unlink").toBe(1);
		t.expectCount("Foo").toBe(2);

		// clear services
		app.services.clear();
	});
});
