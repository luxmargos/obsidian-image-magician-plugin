import Psd from "@webtoon/psd";
import { PluginContext } from "./app_types";
import {
	TUnionFile,
	asTFile,
	asTFileOrThrow,
	findValutFile,
} from "./vault_util";
import { FileFormat, getExportFilePath, isImageFormat } from "./exporter";
import { TFile } from "obsidian";

export const drawPsd = async (
	context: PluginContext,
	psdFile: TUnionFile,
	el: HTMLElement
): Promise<HTMLCanvasElement> => {
	const canvasElement: HTMLCanvasElement = document.createElement("canvas");
	const canvasContext: CanvasRenderingContext2D | null =
		canvasElement.getContext("2d");
	el.append(canvasElement);

	if (!canvasContext) {
		throw new Error(`Context error`);
	}

	const psdTFile = asTFile(context, psdFile);
	if (!psdTFile) {
		throw new Error("Could not read file");
	}

	const buff: ArrayBuffer = await context.plugin.app.vault.readBinary(
		psdTFile
	);
	const parsedPsd = Psd.parse(buff);

	const compositeBuffer = await parsedPsd.composite();
	const imageData = new ImageData(
		compositeBuffer,
		parsedPsd.width,
		parsedPsd.height
	);

	canvasElement.width = parsedPsd.width;
	canvasElement.height = parsedPsd.height;
	canvasContext.putImageData(imageData, 0, 0);

	return canvasElement;
};

export const exportPsdToAny = async (
	context: PluginContext,
	psdFile: TUnionFile,
	exportFormat: FileFormat,
	refElement: HTMLElement
) => {
	const psdTFile: TFile = asTFileOrThrow(context, psdFile);
	const pngPath: string = getExportFilePath(context, psdTFile, exportFormat);
	const pngFile: TFile | undefined = findValutFile(context, pngPath);

	const exportImge: boolean =
		!pngFile || psdTFile.stat.mtime > pngFile.stat.mtime;

	if (!exportImge) {
		return;
	}

	// 0-1
	const quality: number = 1;

	const canvasElement: HTMLCanvasElement = await drawPsd(
		context,
		psdFile,
		refElement
	);

	let err;

	try {
		canvasElement.toBlob(
			async (blob: Blob) => {
				const ab = await blob.arrayBuffer();

				if (!pngFile) {
					console.log("context.plugin.app.vault.createBinary");
					const tf = await context.plugin.app.vault.createBinary(
						pngPath,
						ab
					);
					console.log("png created : ", tf);
				} else {
					console.log("context.plugin.app.vault.modifyBinary");
					await context.plugin.app.vault.modifyBinary(pngFile, ab);
					console.log("png modified : ", pngFile);
				}
			},
			exportFormat.mimeType,
			quality
		);
	} catch (e) {
		err = e;
	} finally {
		canvasElement.remove();
	}

	if (err) {
		throw err;
	}
};
