/**
 * A base class for options objects that can be passed to a constructor or factory function
 * - This class is intended as a base class for options objects, which can be passed directly to a constructor or factory function, or initialized using a callback (configuration) function.
 * - The constructor or factory function accepting options should use the {@link init()} static method to get the options object instance, which will be created and/or initialized if necessary.
 */
export abstract class ConfigOptions {
	/**
	 * Copies the property values from the provided object to this object
	 * - This method can be overridden if additional logic is required to apply object values that are passed to {@link init}.
	 */
	protected applyConfig(values: {}): this {
		return Object.assign(this, values);
	}

	/**
	 * Returns an instance of the options object, from the argument passed to a constructor or factory function
	 * - If the argument is an instance of the options object, it is returned as-is
	 * - If the argument is a callback (configuration) function, it is called with a _new_ instance of the options object, and the instance is returned
	 * - If the argument is undefined, a new instance of the options object is returned
	 * @param configArg The argument that was passed to the constructor or factory function, and will be used to initialize the options object
	 * @returns The instance, either the argument itself or a new one.
	 */
	static init<TInstance extends ConfigOptions>(
		this: new () => TInstance,
		configArg?: ConfigOptions.Arg<TInstance>,
	) {
		let result: TInstance;
		if (typeof configArg === "function") {
			configArg((result = new this()));
		} else if (configArg instanceof this) {
			result = configArg;
		} else {
			result = new this();
			if (configArg) result.applyConfig(configArg);
		}
		return result;
	}
}

export namespace ConfigOptions {
	/**
	 * Type definition for a configuration argument, either a function or an object
	 * - A configuration function is passed to a constructor or factory function, and is used to initialize the options object; alternatively, the argument can be an instance of the options object or an object with partial properties.
	 */
	export type Arg<TInstance> =
		| TInstance
		| (Partial<TInstance> & {})
		| ((instance: TInstance) => void);
}
