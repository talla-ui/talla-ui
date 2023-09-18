/**
 * A base class for options objects that can be passed to a constructor or factory function
 * - This class is intended as a base class for options objects, which can be passed directly to a constructor or factory function, or initialized using a callback (configuration) function.
 * - The constructor or factory function accepting options should use the {@link init()} static method to get the options object instance, which will be created and/or initialized if necessary.
 */
export abstract class ConfigOptions {
	/**
	 * Returns an instance of the options object, from the argument passed to a constructor or factory function
	 * - If the argument is an instance of the options object, it is returned as-is
	 * - If the argument is a callback (configuration) function, it is called with a _new_ instance of the options object, and the instance is returned
	 * - If the argument is undefined, a new instance of the options object is returned
	 * @param configArg The argument that was passed to the constructor or factory function, and will be used to initialize the options object
	 * @returns
	 */
	static init<TInstance extends ConfigOptions>(
		this: new () => TInstance,
		configArg?: ConfigOptions.Arg<TInstance>,
	) {
		let result: TInstance;
		if (typeof configArg === "function") {
			configArg((result = new this()));
		} else {
			result = configArg ?? new this();
		}
		return result;
	}
}

export namespace ConfigOptions {
	export type Arg<TInstance> = TInstance | ((instance: TInstance) => void);
}
