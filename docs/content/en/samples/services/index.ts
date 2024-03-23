// Compile/run: npx tsc -p . && node dist

import { Activity, ConfigOptions, Service } from "@desk-framework/frame-core";
import { useWebContext } from "@desk-framework/frame-web";

{
	class AuthService extends Service {
		id = "Auth";
		isLoggedIn() {
			return false;
		}
		getAuthToken() {
			return "";
		}
	}

	// @doc-start services:activity-observe
	class MyActivity extends Activity {
		// ...

		auth = this.observeService<AuthService>("Auth", (service) => {
			this.updateAuth(service);
		});

		updateAuth(service?: AuthService) {
			// ... handle auth change
		}

		doSomething() {
			// ...use the service elsewhere:
			let authService = this.auth.observed;
			if (authService?.isLoggedIn()) {
				// ...
			}
		}
	}
	// @doc-end

	// @doc-start services:service-observe
	class APIService extends Service {
		id = "API";
		// ...

		// maintain auth token internally
		private _auth = this.observeService<AuthService>("Auth", (service) => {
			this._authToken = service?.getAuthToken() || "";
		});

		private _authToken?: string;
	}
	// @doc-end
}
{
	// @doc-start services:options
	class MyServiceOptions extends ConfigOptions {
		endpoint = "https://api.example.com";
		timeout = 5000;
	}

	class MyService extends Service {
		constructor(options?: ConfigOptions.Arg<MyServiceOptions>) {
			super();
			this.options = MyServiceOptions.init(options);
		}
		id = "Configurable";
		options: MyServiceOptions;

		// ...
	}

	// use the service as follows:
	const s1 = new MyService();

	let opts = new MyServiceOptions();
	opts.timeout = 10_000;
	const s2 = new MyService(opts);

	// or use a callback, e.g.:
	useWebContext((options) => {
		// ... note options here is also a ConfigOptions instance
	}).addService(
		new MyService((options) => {
			// ... set service specific options
			options.timeout = 10_000;
		}),
	);
	// @doc-end
}
