---
folder: topics
abstract: Learn how to use services to encapsulate global state and data in your application.
---

# Services

## Overview <!--{#overview}-->

Services are a relatively simple concept in Desk. You can register a service with the global {@link app application context} to make it available to the rest of the application, and then use it to encapsulate global state and data.

**Why?** — Rather than forcing all data to be passed around between activities, views, and data models at runtime, you can use the global app context to manage a single instance of each service during the lifetime of the application. Some data and state is inherently global to your application, and services are a good way to manage these concerns.

Depending on the complexity of your application, you might use services to manage:

- User authentication and session data
- Application settings and configuration
- API clients and data models
- Shared business logic
- Worker processes and background tasks

**Implementation** — Services are represented by classes that extend the {@link Service} class, with a read-only `id` property. After adding a service to the application context, you can retrieve it by name (i.e. the `id`), and observe its state using the {@link AppContext.services app.services} object from elsewhere in your application.

If you register a service with the same `id` value, the old service is unlinked (using {@link ManagedObject.unlink()}), and the new service is added to the application context in its place.

## Creating a service <!--{#creating}-->

To create your own service, define a class that extends the (abstract) {@link Service} class. The only required property is the `id` property, which should be a unique string that identifies the service.

- {@link Service +}

```ts
class MyService extends Service {
	readonly id = "Auth";

	// ...
}
```

> **Note:** While there are no strict rules about the format of the `id` property, it's a good idea to use a consistent naming convention for your services, and to start the ID with a capital letter.

## Registering a service <!--{#adding}-->

To register a service with the application context, use the {@link AppContext.addService app.addService()} method. This method takes an instance of the service class, and adds it to the service context immediately — i.e. the instance of {@link ServiceContext} available through `app.services`. Since the method returns the app context itself, you can chain the method call with other app context methods such as {@link AppContext.addActivity addActivity()}.

- {@link AppContext.addService}
- {@link ServiceContext +}

```ts
app.addService(new MyService());
```

> **Note:** You can register a service with the same ID multiple times, which replaces the previously registered service with the new one each time. This is a feature of the service context, and can be used to replace the global state at runtime, updating any observers that may be listening to the service by ID.

## Retrieving a service <!--{#getting}-->

To retrieve a service from the application context directly, use these methods of the `app.services` object — an instance of {@link ServiceContext}.

- {@link ServiceContext.get}
- {@link ServiceContext.getAll}

```ts
const auth = app.services.get("Auth");
const loggedIn = auth?.isAuthenticated();
if (loggedIn) {
	// ...
}
```

The `get` method only returns the current service instance, if one has been registered with the provided ID; otherwise it returns `undefined`. Use an _observer_ instead to respond to service registration, unlinking, and events as they occur (see below).

## Observing a service <!--{#observing}-->

In some cases, it's not enough to retrieve a service once and use it directly.

- If the service instance is registered at a later point, or changed throughout the lifetime of the application, or
- If the service emits (change) events that need to be handled, e.g. if an underlying data model changes, or the global state such as in the case of users being logged in or out.

Both the Activity and Service classes provide a method to add an **observer** to a service by ID.

**Observing a service from an activity** — Use the {@link Activity.observeService()} method to start observing a service from an activity. You can provide a callback function that will be called whenever the service is registered, unlinked, or emits a change event. Alternatively, provide an {@link Observer} class or object to handle other events.

- {@link Activity.observeService}

```ts
// {@sample :activity-observe}
```

**Observing a service from a service** — The {@link Service} class also provides a method to observe another service by ID. This allows you to add another service as a 'dependency' of the current service, and to respond to changes in the other service's state.

- {@link Service.observeService}

```ts
// {@sample :service-observe}
```

## Using configuration options <!--{#config}-->

While not strictly related to services, Desk provides a utility class for managing options that's well suited for use with services that are in some way configurable. The same class is used throughout the framework to manage configuration options for various classes, including the app context itself. This pattern ensures that both type information (in editor) and default options are available.

- {@link ConfigOptions +}

```ts
// {@sample :options}
```

## Further reading <!--{#further-reading}-->

Services often encapsulate data models and background tasks. Read more about how Desk supports those concepts in the following articles.

- {@link task-scheduling}
- {@link data-structures}
