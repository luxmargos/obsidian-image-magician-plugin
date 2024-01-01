import Psd from "@webtoon/psd";
import { asTFile, asTFileOrThrow, findValutFile } from "../../vault_util";
import { TFile } from "obsidian";
import {
	ExportDstInfo,
	PluginImageEngine,
	exportCanvasWithBlob,
} from "../imgEngine";
import { MainPluginContext } from "../../context";
import { ImgkExportSettings, ImgkSize } from "../../settings/settings";
import {
	ImageAdj,
	ImageAdjFunc,
	ImgkRuntimeExportSettings,
} from "../../settings/settings_as_func";
import { debug } from "loglevel";

function resizeAndFlipImageData(
	refEl: HTMLElement | undefined | null,
	cv: HTMLCanvasElement,
	newWidth: number,
	newHeight: number,
	flipHorizontal: boolean,
	flipVertical: boolean
) {
	let canvas: HTMLCanvasElement | undefined | null;

	if (refEl) {
		canvas = refEl.createEl("canvas", {
			cls: "imgk-plugin-export-canvas",
		});
	} else {
		canvas = document.createEl("canvas", {
			cls: "imgk-plugin-export-canvas",
		});
	}

	var ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");
	if (!ctx) {
		canvas.remove();
		return;
	}

	// Set the canvas size to the scaled dimensions
	canvas.width = newWidth;
	canvas.height = newHeight;

	// // Flip the context if needed
	if (flipHorizontal || flipVertical) {
		ctx.translate(
			flipHorizontal ? newWidth : 0,
			flipVertical ? newHeight : 0
		);
		ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
	}

	ctx.drawImage(cv, 0, 0, newWidth, newHeight);

	// Get the modified ImageData from the canvas
	const imgData = ctx.getImageData(0, 0, newWidth, newHeight);
	canvas.remove();
	return imgData;
}

export class PluginPsdEngine implements PluginImageEngine {
	draw(
		context: MainPluginContext,
		imgFile: TFile,
		refEl: HTMLElement,
		imageAdjFunc?: ImageAdjFunc
	): Promise<HTMLCanvasElement> {
		return new Promise(async (resolve, reject) => {
			const cv: HTMLCanvasElement = refEl.createEl("canvas", {
				cls: "imgk-plugin-export-canvas",
			});

			try {
				await this.drawOnCanvas(context, imgFile, cv, imageAdjFunc);
				resolve(cv);
			} catch (e) {
				cv.remove();
				reject(e);
			}
		});
	}

	drawOnCanvas(
		context: MainPluginContext,
		imgFile: TFile,
		cv: HTMLCanvasElement,
		imageAdjFunc?: ImageAdjFunc
	): Promise<void> {
		return new Promise(async (resolve, reject) => {
			const canvasContext: CanvasRenderingContext2D | null =
				cv.getContext("2d");

			if (!canvasContext) {
				reject(new Error(`Context error`));
				return;
			}

			const psdTFile = asTFile(context, imgFile);
			if (!psdTFile) {
				reject(new Error("Could not read file"));
				return;
			}

			try {
				const buff: ArrayBuffer =
					await context.plugin.app.vault.readBinary(psdTFile);
				const parsedPsd: Psd = Psd.parse(buff);

				const compositeBuffer = await parsedPsd.composite();
				let imageData = new ImageData(
					compositeBuffer,
					parsedPsd.width,
					parsedPsd.height
				);

				let imgAdj: ImageAdj = {
					width: parsedPsd.width,
					height: parsedPsd.height,
					scaleX: 1,
					scaleY: 1,
				};

				cv.width = imgAdj.width;
				cv.height = imgAdj.height;
				canvasContext.putImageData(imageData, 0, 0);

				if (imageAdjFunc) {
					const imgSize: ImgkSize = {
						x: parsedPsd.width,
						y: parsedPsd.height,
					};
					imgAdj = imageAdjFunc(imgSize);
					const newImageData = resizeAndFlipImageData(
						cv.parentElement,
						cv,
						imgAdj.width,
						imgAdj.height,
						imgAdj.scaleX < 0,
						imgAdj.scaleY < 0
					);
					if (newImageData) {
						imageData = newImageData;
						cv.width = imgAdj.width;
						cv.height = imgAdj.height;
						canvasContext.putImageData(imageData, 0, 0);
					}
				}

				resolve();
			} catch (err) {
				reject(err);
			}
		});
	}

	export(
		context: MainPluginContext,
		sourceFile: TFile,
		settings: ImgkRuntimeExportSettings,
		refElement: HTMLElement,
		forcedExport: boolean,
		exportDstInfo: ExportDstInfo
	): Promise<string> {
		return new Promise<string>(async (resolve, reject) => {
			if (!forcedExport && exportDstInfo.isLatest) {
				debug(`skip export ${exportDstInfo.path}`);
				resolve(exportDstInfo.path);
				return;
			}

			let canvasElement: HTMLCanvasElement | undefined;
			try {
				canvasElement = await this.draw(
					context,
					sourceFile,
					refElement,
					settings.imageAdjFunc
				);

				await exportCanvasWithBlob(
					context,
					canvasElement,
					settings.data.format,
					settings.data.imgProps.quality,
					exportDstInfo.path,
					exportDstInfo.file
				);

				canvasElement.remove();
				resolve(exportDstInfo.path);
			} catch (e) {
				canvasElement?.remove();
				reject(e);
			}
		});
	}
}
