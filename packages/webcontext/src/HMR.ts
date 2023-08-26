import { Component, ComponentConstructor } from "typescene";

/** @internal Handler that is used to update given class when its module is updated; used with e.g. `ViewActivity`, do not call on its own */
export function autoUpdateHandler<T extends ComponentConstructor>(
  module: any,
  C: T,
  methodName: string & keyof T
) {
  if (module.hot) {
    module.hot.accept();
    let old = module.hot.data?.autoUpdate;
    setTimeout(() => {
      if (old) {
        if (C[methodName]) (C[methodName] as any)(old, C);
      }
    }, 0);
    if (C[methodName]) {
      module.hot.dispose((data: any) => {
        (data || module.hot.data).autoUpdate = C;
      });
    }
  }
}

/** @deprecated */
export namespace HMR {
  /**
   * Enable hot module reloading for given view module; does NOT work anymore.
   * @deprecated in favor of `ViewActivity.autoUpdate()`
   */
  export function enableViewReload<T extends ComponentConstructor>(
    _viewModule: any,
    ViewClass: T
  ): T {
    // nothing here
    return ViewClass;
  }
}
