// Compile/run: npx tsc -p . && node dist/data-structures.js

import {
	Activity,
	ManagedList,
	ManagedObject,
	ManagedRecord,
	Service,
	bound,
	ui,
} from "talla";
/** @jsx ui.jsx */

{
	// @doc-start data-structures:record
	class PersonRecord extends ManagedRecord {
		id?: string = undefined;
		name = "";
		// ...
	}

	let p1 = new PersonRecord();
	let p2 = PersonRecord.create({ id: "123", name: "Alice" });
	// @doc-end
}
{
	class ItemRecord extends ManagedRecord {}

	// @doc-start data-structures:list-catalog
	class CatalogService extends Service {
		readonly id = "Catalog";

		findItemById(id: string) {
			// use `find()` or an internal index to find the item
		}

		// ...

		// catalog with all items loaded in memory
		private readonly _items = this.attach(
			new ManagedList().restrict(ItemRecord),
		);
	}
	// @doc-end
}

class OrderCustomerRecord extends ManagedRecord {}
class OrderItemRecord extends ManagedRecord {}

// @doc-start data-structures:list-subrecords
class OrderRecord extends ManagedRecord {
	id = "";

	// use a denormalized customer record:
	customer?: OrderCustomerRecord = undefined;

	// use an attached list of denormalized order items:
	readonly items = this.attach(new ManagedList().restrict(OrderItemRecord));
}
// @doc-end

// @doc-start data-structures:view-model
class CustomerOrderViewModel extends ManagedObject {
	// keep track of visible orders, which can be bound in the view
	// (not necessarily attached, if these are sourced elsewhere)
	readonly list = new ManagedList().restrict(OrderRecord);

	// ... methods to initialize, filter, sort, and paginate
}

// in an activity:
class CustomerActivity extends Activity {
	customerOrders = this.attach(new CustomerOrderViewModel());

	// ... initialization and event handling
}

// now, in a view:
export default (
	<column>
		<label title>Orders</label>
		<list items={bound.list("customerOrders.list")}>
			<row>
				<label>Order %[item.id]</label>
				{/* ... */}
			</row>
		</list>
	</column>
);
// @doc-end
