//https://github.com/dlemstra/magick-wasm/blob/HEAD/demo/demo.ts
//https://www.imagemagick.org/script/formats.php
//https://github.com/dlemstra/magick-wasm

import {
	initializeImageMagick,
	ImageMagick,
	Magick,
	MagickFormat,
	Quantum,
} from "@imagemagick/magick-wasm";
import * as fs from "fs";

//@ts-ignore : this will be handled by es-builder plugin.
import load from "../../../node_modules/@imagemagick/magick-wasm/dist/magick.wasm";
// import load from "./magick.wasm";

export const loadImageMagick = async () => {
	await load({
		initializeImageMagick,
	});
};
