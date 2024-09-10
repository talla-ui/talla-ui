import {
	app,
	Service,
	ManagedObject,
	ServiceContext,
	$services,
	binding,
} from "../../../dist/index.js";
import { describe, expect, test } from "@talla-ui/test-handler";

describe("ManagedService", (scope) => {
	scope.afterEach((t) => {
		t.breakOnFail();
		expect(app.services.getAll()).toBeArray(0);
	});

	class MyService extends Service {
		id = "Test:MyService";
		foo = 1;
	}

	class OtherService extends Service {
		id = "Test.OtherService";
		bar = 2;

		@binding($services.bind("Test:MyService"))
		myService?: MyService;
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
		expect(app.services.get("Test:MyService")).toBe(svc);
		expect(app.services.get("tEst:mYSErViCE")).toBeUndefined();
		expect([...app.services.getAll()]).toBeArray([svc]);

		svc.unlink();
		expect(app.services.get("Test:MyService")).toBeUndefined();
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
		expect(app.services.get("Test:MyService")).toBe(svc2);
		expect(svc1.isServiceRegistered()).toBe(false);
		expect(svc2.isServiceRegistered()).toBe(true);
		svc2.unlink();
		expect([...app.services.getAll()]).toBeArray(0);
	});

	test("Bind service", () => {
		let svc1 = new MyService();
		app.services.add(svc1);
		let other = new OtherService();
		app.services.add(other);
		expect(other.myService).toBe(svc1);
		svc1.unlink();
		other.unlink();
	});

	test("Bind service with event listener", (t) => {
		let svc1 = new MyService();
		app.services.add(svc1);
		let other = new OtherService();
		ManagedObject.observe(other, ["myService"], () => {
			other.myService?.listen(() => {
				t.count("update");
			});
		});
		app.services.add(other);
		svc1.emitChange();
		let svc2 = new MyService();
		app.services.add(svc2);
		svc2.emitChange();
		svc2.emitChange();
		t.expectCount("update").toBe(3);
		svc2.unlink();
		other.unlink();
	});
});
