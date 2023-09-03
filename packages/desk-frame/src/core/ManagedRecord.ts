import { ManagedList } from "./ManagedList.js";
import { ManagedObject } from "./ManagedObject.js";

/**
 * A class that can be used to describe data models based on {@link ManagedObject}
 *
 * @description
 * For the most part, ManagedRecord objects behave exactly like {@link ManagedObject} instances. The ManagedRecord class only adds two features on top of the functionality offered by {@link ManagedObject}:
 *
 * - A static {@link ManagedRecord.create create()} method, which constructs a new instance (without any arguments), and then applies a given set of properties.
 * - Methods for finding parent records (instances of ManagedRecord), and siblings in a {@link ManagedList}.
 *
 * @example
 * // Create a ManagedRecord that holds other records
 * class MyItem extends ManagedRecord {
 *   name = "";
 *   readonly list = this.attach(new MangedList<MyItem>());
 * }
 *
 * let item = MyItem.create({ name: "root" });
 * item.list.add(
 *   MyItem.create({ name: "one" }),
 *   MyItem.create({ name: "two" })
 * );
 * item.list.first().name // => "one"
 * item.list.first().getParentRecord() // => item
 * item.list.first().getNextSibling()?.name // => "two"
 *
 * @hideconstructor
 */
export class ManagedRecord extends ManagedObject {
	/**
	 * Creates a new instance of this class, with the provided property values
	 * - This method can be called both on {@link ManagedRecord} itself, as well as on a subclass; in both cases, the return type includes class properties and any other properties provided.
	 *
	 * @example
	 * // Create new record using the base class
	 * let r = ManagedRecord.create({ foo: "bar" });
	 * r.foo // => "bar"
	 *
	 * // Create new record using a subclass
	 * class MyRecord extends ManagedRecord {
	 *   foo = "";
	 * }
	 * let myRecord = MyRecord.create({ foo: "bar" });
	 * myRecord.foo // => "bar"
	 */
	static create<
		TRecord extends ManagedRecord,
		T extends ManagedRecord.PartialProperties<TRecord> | {},
	>(this: { new (): TRecord }, properties?: T): TRecord & T {
		let result = new this() as any;
		if (properties) {
			for (let p in properties) {
				result[p] = properties[p] as any;
			}
		}
		return result;
	}

	/**
	 * Returns the parent record (or parent's parent, etc.) that's an instance of the provided class
	 * - If no class is provided, the closest ManagedRecord parent is returned, if any.
	 */
	getParentRecord<T extends ManagedRecord>(
		ParentClass?: ManagedObject.Constructor<T>,
	): T | undefined {
		return ManagedRecord.whence.call(ParentClass || ManagedRecord, this) as any;
	}

	/**
	 * Returns the next record in a parent list, if any
	 * - If this record isn't directly contained by an (attached) ManagedList, or if this record is the last item, this method returns undefined.
	 */
	getNextSibling<TRecord = this>(): TRecord | undefined {
		let parent = ManagedObject.whence(this);
		if (parent instanceof ManagedList) {
			let sibling = parent.take(2, this)[1];
			if (sibling instanceof ManagedRecord) {
				return sibling as any;
			}
		}
	}

	/**
	 * Returns the previous record in a parent list, if any
	 * - If this record isn't directly contained by an (attached) ManagedList, or if this record is the first item, this method returns undefined.
	 */
	getPreviousSibling<TRecord = this>(): TRecord | undefined {
		let parent = ManagedObject.whence(this);
		if (parent instanceof ManagedList) {
			let s = parent.takeLast(2, this);
			if (s.length > 1 && s[0] instanceof ManagedRecord) {
				return s[0] as any;
			}
		}
	}
}

export namespace ManagedRecord {
	/** Type definition for the set of properties passed to {@link ManagedRecord.create()} */
	export type PartialProperties<TRecord extends ManagedRecord> = Partial<
		Pick<
			TRecord,
			{
				[k in keyof TRecord]: TRecord[k] extends Function ? never : k;
			}[keyof TRecord]
		>
	>;
}
