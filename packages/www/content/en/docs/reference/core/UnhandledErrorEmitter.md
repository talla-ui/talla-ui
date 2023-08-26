# logUnhandledException

#### Example

```typescript
import { logUnhandledException } from "typescene";
myActivity.activateAsync().catch(logUnhandledException);
```

### Handling errors

To handle errors in some other way (other than logging to the console), observe events on the singleton `UnhandledErrorEmitter` instance.

```typescript
UnhandledErrorEmitter.observe(
  class {
    onEvent(e: UnhandledErrorEvent) {
      if (e.error) {
        // ... (do something with the error, e.g.
        // send to reporting service back end)
      }
    }
  }
);
```
