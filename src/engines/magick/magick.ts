import { asTFile } from "../../vault_util";
import { ExportFormat } from "../../exporter";
import { TAbstractFile, TFile } from "obsidian";
import { IMagickImage, ImageMagick } from "@imagemagick/magick-wasm";
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
import { fileURLToPath } from "url";

export class PluginMagickEngine implements PluginImageEngine {
	draw(
		context: MainPluginContext,
		imgFile: TFile,
		el: HTMLElement,
		imageAdjFunc?: ImageAdjFunc
	): Promise<HTMLCanvasElement> {
		return new Promise(async (resolve, reject) => {
			const cv: HTMLCanvasElement = el.createEl("canvas", {
				cls: "imgk-plugin-item",
			});
			console.log("create canvas element");

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
		return new Promise<void>(async (resolve, reject) => {
			const canvasContext: CanvasRenderingContext2D | null =
				cv.getContext("2d");

			if (!canvasContext) {
				reject(new Error(`Context error`));
				return;
			}

			const imgTFile = asTFile(context, imgFile);
			if (!imgTFile) {
				reject(new Error("Could not read file"));
				return;
			}

			try {
				const buff: ArrayBuffer =
					await context.plugin.app.vault.readBinary(imgTFile);
				const byteArr = new Uint8Array(buff);
				await ImageMagick.read(byteArr, async (img: IMagickImage) => {
					// canvasElement.width = img.width;
					// canvasElement.height = img.height;

					if (imageAdjFunc) {
						const imgSize: ImgkSize = {
							x: img.width,
							y: img.height,
						};
						const imgAdj: ImageAdj = imageAdjFunc(imgSize);
						if (imgAdj.scaleX < 0) {
							img.flop();
						}
						if (imgAdj.scaleY < 0) {
							img.flip();
						}

						if (
							imgAdj.width !== img.width ||
							imgAdj.height !== img.height
						) {
							img.resize(imgAdj.width, imgAdj.height);
						}
					}

					img.writeToCanvas(cv);
				});

				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	export(
		context: MainPluginContext,
		source: TFile,
		settings: ImgkRuntimeExportSettings,
		refElement: HTMLElement
	): Promise<void> {
		return new Promise(async (resolve, reject) => {
			const exportData = resolveExportDstInfo(
				context,
				source,
				settings.data
			);

			if (exportData.isLatest) {
				console.log("pass already exists : ", exportData.path);
				resolve();
				return;
			}

			console.log("start export", source, exportData);
			let canvasElement: HTMLCanvasElement | undefined;
			try {
				canvasElement = await this.draw(context, source, refElement);
				console.log("draw complete", source, exportData);

				await exportCanvasWithBlob(
					context,
					canvasElement,
					settings.data.format,
					settings.data.imgProps.quality,
					exportData.path,
					exportData.file
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
