import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import { wasmLoader } from "esbuild-plugin-wasm";
import path from "node:path";
import fs from "node:fs";

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`;

// referenced from https://esbuild.github.io/plugins/#webassembly-plugin
let imageMagickWasmPlugin = {
	name: "imagemagick-wasm",
	setup(build) {
		// Resolve ".wasm" files to a path with a namespace
		build.onResolve({ filter: /magick\.wasm$/ }, (args) => {
			// If this is the import inside the stub module, import the
			// binary itself. Put the path in the "wasm-binary" namespace
			// to tell our binary load callback to load the binary file.
			if (args.namespace === "imagemagick-stub") {
				return {
					path: args.path,
					namespace: "imagemagick-binary",
				};
			}

			// Otherwise, generate the JavaScript stub module for this
			// ".wasm" file. Put it in the "wasm-stub" namespace to tell
			// our stub load callback to fill it with JavaScript.
			//
			// Resolve relative paths to absolute paths here since this
			// resolve callback is given "resolveDir", the directory to
			// resolve imports against.
			if (args.resolveDir === "") {
				return; // Ignore unresolvable paths
			}
			return {
				path: path.isAbsolute(args.path)
					? args.path
					: path.join(args.resolveDir, args.path),
				namespace: "imagemagick-stub",
			};
		});

		// Virtual modules in the "wasm-stub" namespace are filled with
		// the JavaScript code for compiling the WebAssembly binary. The
		// binary itself is imported from a second virtual module.
		// build.onLoad(
		// 	{ filter: /.*/, namespace: "wasm-stub" },
		// 	async (args) => ({
		// 		contents: `import wasm from ${JSON.stringify(args.path)}
		//     export default (imports) =>
		//       WebAssembly.instantiate(wasm, imports).then(
		//         result => result.instance.exports)`,
		// 	})
		// );

		build.onLoad(
			{ filter: /.*/, namespace: "imagemagick-stub" },
			async (args) => ({
				contents: `import wasm from ${JSON.stringify(args.path)}
				export default (imports)=>{
					return imports.initializeImageMagick(wasm);
				};
				`,
			})
		);

		// Virtual modules in the "wasm-binary" namespace contain the
		// actual bytes of the WebAssembly file. This uses esbuild's
		// built-in "binary" loader instead of manually embedding the
		// binary data inside JavaScript code ourselves.
		build.onLoad(
			{ filter: /.*/, namespace: "imagemagick-binary" },
			async (args) => ({
				contents: await fs.promises.readFile(args.path),
				loader: "binary",
			})
		);
	},
};

const prod = process.argv[2] === "production";

const context = await esbuild.context({
	banner: {
		js: banner,
	},
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtins,
	],
	minify: prod ? true : false,
	plugins: [imageMagickWasmPlugin],
	format: "cjs",
	// format: "esm",
	//this is mandatory for BitInt
	target: "es2020",
	// target: "es2018",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	outfile: "main.js",
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
