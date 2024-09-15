// Compile/run: npx tsc -p . && node dist/event-handling.js

import {
	Activity,
	ManagedEvent,
	ManagedObject,
	Observer,
	Service,
	UIListView,
	UITextField,
	ViewEvent,
	app,
	bound,
	ui,
} from "talla";

class MyObject extends ManagedObject {}

{
	// @doc-start event-handling:emit
	const myObject = new ManagedObject();
	myObject.emit("MyEvent", { someData: "Hello" });

	// same as this:
	const myEvent = new ManagedEvent("MyEvent", myObject, { someData: "Hello" });
	myObject.emit(myEvent);
	// @doc-end
}
{
	// @doc-start event-handling:emitChange
	const myObject = new ManagedObject();
	myObject.emitChange();

	// same as this:
	const myEvent = new ManagedEvent("Change", myObject, { change: myObject });
	myObject.emit(myEvent);
	// @doc-end
}
{
	// @doc-start event-handling:listen
	const myObject = new MyObject();
	myObject.listen((event) => {
		console.log("Listened: " + event.name); // @doc-ignore
		if (event.name === "SomeEvent") {
			// ... do something
		}
	});
	// @doc-end

	myObject.emit("Test");
	myObject.emitChange();
}
{
	async () => {
		const myObject = new MyObject();

		// @doc-start event-handling:listen-async
		for await (let event of myObject.listen()) {
			if (event.name === "SomeEvent") {
				// ...handle SomeEvent
			}
		}
		// ... (code here runs after object is unlinked, or `break`)
		// @doc-end
	};
}
{
	class SomeDialogActivity extends Activity {
		async sample() {
			// @doc-start event-handling:listen-async-unlink
			// show a dialog activity and wait for it to be unlinked:
			let myDialog = this.attach(new SomeDialogActivity());
			await myDialog.activateAsync();
			for await (let _ of myDialog.listen());
			// @doc-end
		}
	}
}
{
	// @doc-start event-handling:attach-callback
	// Handle change events on an attached object:
	class ParentObject extends ManagedObject {
		readonly object = this.attach(new MyObject(), (object, event) => {
			if (event) {
				// ... handle change event here
				console.log("Change event: " + event.name); // @doc-ignore
			}
		});
	}
	// @doc-end

	let p = new ParentObject();
	p.object.emitChange();
	p.object.emitChange("Named");
	p.object.emit("NotAChange"); // not logged
}
{
	// @doc-start event-handling:observer
	class MyObserver extends Observer<MyObject> {
		// ... add methods here, see below
	}

	let myObject = new MyObject();
	new MyObserver().observe(myObject);
	// @doc-end
}
{
	// @doc-start event-handling:observer-events
	// Handle change events using an observer:
	class MyObserver extends Observer<MyObject> {
		protected handleEvent(event: ManagedEvent) {
			// ... handle any event here
			// `this.observed` is the object being observed
		}

		// If handleEvent is not overridden, handle events by name:
		onSomeEvent(event: ManagedEvent) {
			// ... handle SomeEvent here
		}
	}

	let myObject = new MyObject();
	new MyObserver().observe(myObject);
	myObject.emit("SomeEvent");
	// @doc-end
}
{
	// @doc-start event-handling:observer-attach
	// Handle change events using an observer:
	class MyObjectObserver extends Observer<MyObject> {
		onSomeEvent(event: ManagedEvent) {
			// ... handle SomeEvent here
			console.log("Observed event: " + event.name); // @doc-ignore
		}
	}

	class ParentObject extends ManagedObject {
		readonly object = this.attach(new MyObject(), new MyObjectObserver());
	}
	// @doc-end

	let p = new ParentObject();
	p.object.emit("SomeEvent");
}
{
	// @doc-start event-handling:service-callback
	class AuthService extends Service {
		id = "Auth";
		// ... service implementation
	}

	class MyActivity extends Activity {
		// Observe service changes:
		auth = this.observeService<AuthService>("Auth", (service, event) => {
			if (service) {
				// ... handle service registered, updated OR changed here
				console.log("Auth service update"); // @doc-ignore
			} else {
				// ... handle unlinked service here
				console.log("Auth service unlinked"); // @doc-ignore
			}
		});

		// If necessary, use the observed service elsewhere too:
		exampleMethod() {
			const authService = this.auth.observed;
			// ... use authService here (may be undefined)
		}
	}
	// @doc-end

	let svc = new AuthService();
	app.addService(svc);
	let act = new MyActivity();
	svc.unlink();
	act.unlink();
}
{
	// @doc-start event-handling:observer-properties
	class MyObject extends ManagedObject {
		foo = "bar";
		doSomething() {
			this.foo = "baz";
		}
	}

	class MyObjectObserver extends Observer<MyObject> {
		// Override observe() to observe foo:
		observe(observed: MyObject) {
			return super.observe(observed).observeProperty("foo");
		}

		// Handle foo changes:
		onFooChange(foo: string) {
			// ...
			console.log("Foo changed: " + foo); // @doc-ignore
		}
	}

	// create object and observer:
	let myObject = new MyObject();
	new MyObjectObserver().observe(myObject);
	// @doc-end

	myObject.doSomething();
}
{
	// @doc-start event-handling:view-events
	// Use event names in the view:
	const View = ui.cell(
		// ...
		ui.row(
			ui.textField({
				placeholder: "Enter text",
				onFocusIn: "InputFocusIn",
				onEnterKeyPress: "ConfirmInput",
			}),
			ui.button("Confirm", "ConfirmInput"),
		),
	);

	// Handle events in the activity, by name:
	class MyActivity extends Activity {
		// ...

		onInputFocusIn(event: ViewEvent<UITextField>) {
			// ...
			// => event.source is typed as UITextField
		}
		onConfirmInput(event: ViewEvent) {
			// ...
			// => or otherwise, as a View object
		}
	}
	// @doc-end
}
{
	class MyItem extends ManagedObject {}

	// @doc-start event-handling:view-delegate
	// Use events from within a list:
	const View = ui.cell(
		// ...
		ui.list(
			{ items: bound("items") },
			ui.row(
				// ...
				ui.button("Delete", "DeleteItem"),
			),
		),
	);

	// Handle delegated events in the activity
	class MyActivity extends Activity {
		// ...

		onDeleteItem(event: ViewEvent) {
			let item = UIListView.getSourceItem(event.source, MyItem);
			// ...
		}
	}
	// @doc-end
}

console.log("Done");
