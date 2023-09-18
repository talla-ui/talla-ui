import { RenderContext } from "@desk-framework/frame-core";
import type { TestOutputElement } from "./TestOutputElement.js";

/** An object that provides filters to match a set of output elements, to be asserted using {@link OutputAssertion} */
export interface OutputSelectFilter {
	/** The element itself, if known */
	element?: TestOutputElement;
	/** The source component that rendered the output */
	source?: RenderContext.Renderable;
	/** A type of element (string or class) */
	type?: RenderContext.RenderableClass | TestOutputElement.TypeString;
	/** True if the element must be disabled, false if it must not */
	disabled?: boolean;
	/** True if the element must be readonly, false if it must not */
	readOnly?: boolean;
	/** True if a button must be selected (pressed), false if it must not */
	pressed?: boolean;
	/** True if the element must be focused, false if it must not */
	focused?: boolean;
	/** True if the toggle must be checked, false if it must not */
	checked?: boolean;
	/** Text or label content, as an exact match or regular expression */
	text?: string | RegExp;
	/** A string representation of the element's icon content, must be an exact match */
	icon?: string;
	/** A button element's chevron direction, must be an exact match */
	chevron?: string;
	/** An image URL, must be an exact match */
	imageUrl?: string;
	/** The current input value for text fields */
	value?: string;
	/** A matching element's accessible role */
	accessibleRole?: string;
	/** A matching element's accessible label */
	accessibleLabel?: string;
	/** A set of style overrides that must be applied to a matching element (values for e.g. `bold`, `textColor`, and `background`) */
	styles?: Record<string, any>;
	/** A base style class that must be applied to a matching element (e.g. a subclass of {@link UIButtonStyle}, {@link UICellStyle}, and {@link UIToggleStyle}) */
	styleClass?: any;
}

/** Returns true if given element matches given selection criteria */
function _matchElement(select: OutputSelectFilter, elt: TestOutputElement) {
	return !(
		(select.element && elt !== select.element) ||
		(select.source && elt.output?.source !== select.source) ||
		(typeof select.type === "string" && elt.type !== select.type) ||
		(typeof select.type === "function" &&
			!(elt.output?.source instanceof select.type)) ||
		(select.disabled !== undefined && !!elt.disabled !== !!select.disabled) ||
		(select.readOnly !== undefined && !!elt.readOnly !== !!select.readOnly) ||
		(select.pressed !== undefined && !!elt.pressed !== !!select.pressed) ||
		(select.checked !== undefined && !!elt.checked !== !!select.checked) ||
		(select.focused !== undefined && !!elt.hasFocus() !== !!select.focused) ||
		(select.text !== undefined &&
			(typeof select.text === "string"
				? elt.text !== select.text
				: select.text instanceof RegExp
				? !select.text.test(elt.text || "")
				: true)) ||
		(select.icon !== undefined && elt.icon !== select.icon) ||
		(select.chevron !== undefined && elt.chevron !== select.chevron) ||
		(select.imageUrl !== undefined && elt.imageUrl !== select.imageUrl) ||
		(select.value !== undefined && elt.value !== select.value) ||
		(select.accessibleRole !== undefined &&
			elt.accessibleRole !== select.accessibleRole) ||
		(select.accessibleLabel !== undefined &&
			elt.accessibleLabel !== select.accessibleLabel) ||
		(select.styles && !elt.matchStyleValues(select.styles)) ||
		(select.styleClass !== undefined && elt.styleClass !== select.styleClass)
	);
}

/**
 * A class that provides assertion methods to be applied to a selection of rendered output elements
 * - An instance of this class is returned by the {@link TestCase.expectOutputAsync()}, {@link TestRenderer.expectOutput()}, and {@link TestRenderer.expectOutputAsync()} methods. Use these methods to create new assertions based on the currently rendered (test) output.
 */
export class OutputAssertion {
	/** Creates a new assertion based on given elements, optionally filtered using given selection criteria */
	constructor(elements: TestOutputElement[], select?: OutputSelectFilter) {
		if (select) {
			let selected: TestOutputElement[] = [];
			let match = _matchElement.bind(this, select);
			for (let elt of elements) {
				if (match(elt)) selected.push(elt);
				else selected.push(...elt.querySelect(match));
			}
			this.elements = selected;
		} else {
			this.elements = elements;
		}
	}

	/** The elements to be asserted */
	readonly elements: ReadonlyArray<TestOutputElement>;

	/**
	 * Returns a new {@link OutputAssertion} for any elements that are contained by the current set of elements (i.e. container content), directly or indirectly, which match the given selection filter
	 */
	containing(select: OutputSelectFilter) {
		let content: TestOutputElement[] = [];
		for (let elt of this.elements) {
			if (elt.content) content.push(...elt.content);
		}
		return new OutputAssertion(content, select);
	}

	/**
	 * Returns the currently matched output element, if there's only one
	 * @error This method throws an error if the current selection consists more than one element, or none at all.
	 */
	getSingle() {
		if (!this.elements.length) throw Error("Output does not match");
		if (this.elements.length > 1)
			throw Error("Output matches more than one element");
		return this.elements[0]!;
	}

	/**
	 * Returns the component that rendered the currently matched output element, if there's only one
	 * @error This method throws an error if the current selection consists of more than one element, or none at all.
	 */
	getSingleComponent<TRenderable extends RenderContext.Renderable>(
		type: RenderContext.RenderableClass<TRenderable>,
	): TRenderable {
		let elements = this.elements.filter(
			(elt) => elt.output?.source instanceof type,
		);
		if (!elements.length) throw Error("Component does not match");
		if (elements.length > 1)
			throw Error("Components match more than one element");
		return elements[0]!.output!.source as any;
	}

	/**
	 * Asserts that any output elements were matched at all
	 * @param description The description of the output, used as part of the error message if the assertion fails
	 * @returns The current {@link OutputAssertion} instance
	 */
	toBeRendered(description?: string) {
		if (!this.elements.length) {
			throw Error(
				"Output isn't rendered" + (description ? ": " + description : ""),
			);
		}
		return this;
	}

	/**
	 * Asserts that no elements were matched at all
	 * @param description The description of the output, used as part of the error message if the assertion fails
	 * @returns The current {@link OutputAssertion} instance
	 */
	toBeEmpty(description?: string) {
		if (this.elements.length) {
			throw Error(
				"Output isn't empty" + (description ? ": " + description : ""),
			);
		}
		return this;
	}
}
