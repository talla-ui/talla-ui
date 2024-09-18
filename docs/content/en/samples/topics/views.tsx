// Compile/run: npx tsc -p . && node dist/views.js

import { bound } from "talla-ui";

{
	// @doc-start views:preset
	// A preset view class:
	const MyButton = ui.button({
		label: "Click me", // preset property
		hidden: bound("hideButton"), // preset binding
		onClick: "MyButtonClicked", // preset event name
	});

	// ... same as (JSX):
	<button hidden={bound("hideButton")} onClick="MyButtonClicked">
		Click me
	</button>;
	// @doc-end
}
{
	// @doc-start views:controls
	// preset a label with some text:
	const MyLabel = ui.label("Hello, world!");

	// ... now, MyLabel is a view class that can be instantiated
	let view = new MyLabel();
	view.text; // => "Hello, world!"

	// preset a text field with several properties:
	const MyTextField = ui.textField({
		placeholder: "Enter your name",
		formField: "name",
		disableSpellCheck: true,
		width: "100%",
	});

	// ... still a view class
	let tf = new MyTextField();
	tf.placeholder; // => "Enter your name"
	tf.value; // => ""
	// @doc-end
}
{
	// @doc-start views:containers
	// a single row with two controls:
	const MyRow = ui.row(
		{ padding: 8 },
		ui.label("Name:"),
		ui.textField({ formField: "name" }),
	);

	// a more complex layout:
	const Page = ui.cell(
		{
			background: ui.color.BACKGROUND,
			effect: ui.effect.SHADOW,
			borderRadius: 8,
		},
		ui.column(
			ui.label("Form", ui.style.LABEL_TITLE),
			ui.form(
				{ formContext: bound("myForm") },
				ui.row(ui.label("Name:"), ui.textField({ formField: "name" })),
				ui.button("Submit", "SubmitForm", ui.style.BUTTON_PRIMARY),
			),
		),
	);
	// @doc-end
}
{
	// @doc-start views:conditional
	ui.column(
		ui.button("Toggle content", "ToggleContent"),
		ui.conditional(
			{ state: bound("showContent") },
			ui.column(
				// ... content goes here
				// (only created and rendered when showContent is true)
				ui.label("Hello, world!"),
			),
		),
	);
	// @doc-end
}
{
	// @doc-start views:hidden
	// hide a container using a bound property:
	ui.column(
		{ hidden: bound.not("showSection") },
		// ... section content
		// (always created, but may be hidden)
	);

	// hide a subview using a conditional view:
	ui.conditional(
		{ state: bound("selectedCustomer") },
		// ... customer details:
		// (only created when selectedCustomer exists)
		ui.column(
			ui, // @doc-ignore
			// ...
		),
	);
	// @doc-end
}
{
	// @doc-start views:list
	ui.list(
		{ items: bound("myList") },
		ui.row(
			ui.label(bound("item.name")),
			ui.spacer(),
			ui.label(bound("item.price")),
		),
	);
	// @doc-end
}
{
	// @doc-start views:view-renderer
	ui.column(
		ui.renderView(
			// the view renderer references a bound view:
			// created and attached elsewhere (e.g. another activity)
			bound("detailActivity.view"),
		),
	);
	// @doc-end
}
{
	// @doc-start jsx:jsx
	const Page = (
		<cell
			background={ui.color.BACKGROUND}
			borderRadius={8}
			effect={ui.effect.SHADOW}
		>
			<column>
				<label title>Form</label>
				<form formContext={bound("myForm")}>
					<row>
						<label>Name:</label>
						<textfield formField="name" />
					</row>
					<button primary label="Submit" onClick="SubmitForm" />
				</form>
			</column>
		</cell>
	);
	// @doc-end
}

// @doc-start jsx:jsx-export
import { ui } from "talla-ui";

export default (
	<cell background={ui.color.BACKGROUND} borderRadius={8}>
		{/* ... */}
	</cell>
);
// @doc-end
