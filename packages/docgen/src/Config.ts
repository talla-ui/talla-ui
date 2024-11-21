/**
 * Configuration options
 *
 * The default options are applied to a new instance of this class. Properties will be overridden when read from a config file.
 */
export class Config {
	input: string[] = ["docs/**/*.md"];
	samples: string[] = [];
	check = false;
	checkOrphans = false;
	refFolder = "";
	docFolder = "";
	output = {
		index: {
			file: "",
			urlPrefix: "",
		},
		json: {
			file: "",
			pretty: true,
		},
		markdown: {
			path: "",
			preserveLinks: true,
			yaml: true,
		},
		html: {
			path: "",
			templates: "",
			defaultTemplate: "",
		},
	};
	assets: { [dir: string]: string } = {};
}
