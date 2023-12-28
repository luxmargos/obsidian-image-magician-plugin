import Psd from "@webtoon/psd";
import { asTFile, asTFileOrThrow, findValutFile } from "../../vault_util";
import { TFile } from "obsidian";
import {
	PluginImageEngine,
	exportCanvasWithBlob,
	resolveExportDstInfo,
} from "../imgEngine";
import { MainPluginContext } from "../../context";
import { ImgkExportSettings, ImgkSize } from "../../settings/settings";
import {
	ImageAdj,
	ImageAdjFunc,
	ImgkRuntimeExportSettings,
} from "../../settings/settings_as_func";
import { parse } from "path";

export class PluginPsdEngine implements PluginImageEngine {
	draw(
		context: MainPluginContext,
		imgFile: TFile,
		el: HTMLElement,
		imageAdjFunc?: ImageAdjFunc
	): Promise<HTMLCanvasElement> {
		return new Promise(async (resolve, reject) => {
			let cv: HTMLCanvasElement | null = el.querySelector(
				"canvas.imgk-plugin-item"
			);
			if (!cv) {
				cv = el.createEl("canvas", { cls: "imgk-plugin-item" });
				console.log("create canvas element");
			} else {
				console.log("reuse canvas element");
			}

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
				const parsedPsd = Psd.parse(buff);

				let imgAdj: ImageAdj = {
					width: parsedPsd.width,
					height: parsedPsd.height,
					scaleX: 1,
					scaleY: 1,
				};

				if (imageAdjFunc) {
					const imgSize: ImgkSize = {
						x: parsedPsd.width,
						y: parsedPsd.height,
					};
					imgAdj = imageAdjFunc(imgSize);
				}

				const compositeBuffer = await parsedPsd.composite();
				const imageData = new ImageData(
					compositeBuffer,
					imgAdj.width,
					imgAdj.height
				);

				// canvasElement.width = parsedPsd.width;
				// canvasElement.height = parsedPsd.height;
				canvasContext.putImageData(imageData, 0, 0);
				canvasContext.scale(imgAdj.scaleX, imgAdj.scaleY);

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
		refElement: HTMLElement
	): Promise<void> {
		return new Promise<void>(async (resolve, reject) => {
			const exportDstInfo = resolveExportDstInfo(
				context,
				sourceFile,
				settings.data
			);

			if (exportDstInfo.isLatest) {
				resolve();
				return;
			}

			let canvasElement: HTMLCanvasElement | undefined;
			try {
				canvasElement = await this.draw(
					context,
					sourceFile,
					refElement
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
				resolve();
			} catch (e) {
				canvasElement?.remove();
				reject(e);
			}
		});
	}
}
