import { TFile } from "obsidian";
import { ImgkRuntimeExportSettings } from "./settings/settings_as_func";
import { resolveExportDstInfo } from "./engines/imgEngine";
import { MainPluginContext } from "./context";
import { PIE } from "./engines/imgEngines";

export const exportImage = (
	context: MainPluginContext,
	refEl: HTMLElement,
	file: TFile,
	specificDst: string | undefined,
	settings: ImgkRuntimeExportSettings,
	forcedExport: boolean
): Promise<string> => {
	return new Promise(async (resolve, reject) => {
		const exportData = resolveExportDstInfo(
			context,
			file,
			settings.data,
			specificDst
		);

		if (!exportData) {
			reject(new Error("There are no export data"));
			return;
		}

		PIE.magick()
			.export(context, file, settings, refEl, forcedExport, exportData)
			.then((path) => {
				resolve(path);
			})
			.catch((err) => {
				reject(err);
			});
	});
};
