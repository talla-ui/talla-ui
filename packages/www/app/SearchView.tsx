import {
	bound,
	JSX,
	UIColor,
	UIIconResource,
	UIStyle,
} from "@desk-framework/frame-core";

const styles = {
	textField: UIStyle.TextField.extend(
		{
			dimensions: {
				width: "100%",
				minWidth: "none",
			},
			decoration: {
				background: UIColor["@clear"],
				textColor: "inherit",
				padding: { y: 4 },
				borderColor: UIColor["@separator"],
				borderThickness: { bottom: 1 },
				borderRadius: 0,
			},
		},
		{
			focused: {
				decoration: { borderColor: UIColor["@primary"] },
			},
		},
	),
	result: UIStyle.Cell.extend(
		{
			containerLayout: { gravity: "start" },
			decoration: {
				padding: { bottom: 8, x: 6 },
				borderThickness: 2,
				css: { cursor: "pointer" },
			},
		},
		{
			hover: {
				decoration: {
					background: "var(--nav-hover-background)",
				},
			},
			focused: {
				decoration: {
					borderColor: UIColor["@primary"],
					borderThickness: 2,
				},
			},
		},
	),
};

export default (
	<cell margin={{ y: 8, start: 16 }}>
		<cell padding={{ start: 8, end: 4 }}>
			<row height={40}>
				<borderlesstextfield
					style={styles.textField}
					requestFocus
					disableSpellCheck
					type="search"
					onInput="SearchInput"
					onArrowDownKeyPress="ArrowDownOnInput"
					onEnterKeyPress="GoToFirstResult"
				>
					Search...
				</borderlesstextfield>
				<iconbutton icon={UIIconResource["@close"]} onClick="Close" />
			</row>
		</cell>
		<spacer height={16} />
		<cell
			hidden={bound.boolean("!hasInput").or("!loading")}
			padding={{ y: 32 }}
		>
			<label>Loading...</label>
		</cell>
		<selection>
			<list items={bound.list("results")} maxItems={50} allowKeyboardFocus>
				<cell
					style={styles.result}
					allowFocus
					onClick="GoToResult"
					onEnterKeyPress="GoToResult"
					onArrowUpKeyPress="FocusPrevious"
					onArrowDownKeyPress="FocusNext"
				>
					<row>
						<label textStyle={{ fontWeight: 500 }} dimensions={{ shrink: 0 }}>
							{bound.string("item.title")}
						</label>
						<label decoration={{ opacity: 0.5 }}>
							{bound.string("item.showId")}
						</label>
					</row>
					<closelabel textStyle={{ fontSize: 14 }} htmlFormat>
						{bound.string("item.abstract")}
					</closelabel>
				</cell>
			</list>
		</selection>
	</cell>
);
