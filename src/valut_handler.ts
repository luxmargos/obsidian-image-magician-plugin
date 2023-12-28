import { FileSystemAdapter, TAbstractFile, TFile } from "obsidian";
import { MainPluginContext } from "./context";
import { genExportPath, isImageExportFormat } from "./exporter";
import { PIE } from "./engines/imgEngines";
import { findValutFile, isTFile } from "./vault_util";
import * as pb from "path-browserify";
import {
	ImgkExportSettings,
	ImgkPluginSettings,
	SettingsUtil,
} from "./settings/settings";
import { ImgkRuntimeExportSettings } from "./settings/settings_as_func";

const exportBatch = async (
	context: MainPluginContext,
	sourceFile: TFile,
	settings: ImgkRuntimeExportSettings,
	refElement: HTMLElement
) => {
	try {
		await PIE.magick().export(context, sourceFile, settings, refElement);
	} catch (err) {
		// TODO: Handle error
		console.log("error!", err);
	}
};

export class VaultHandler {
	context: MainPluginContext;
	currentSettings: ImgkPluginSettings;
	currentSettingsUtil: SettingsUtil;

	isPaused: boolean = false;

	constructor(context: MainPluginContext) {
		this.context = context;
		this.updateSettings();

		const createEvtRef = this.context.plugin.app.vault.on(
			"create",
			this.onCreate.bind(this)
		);
		const modiftEvtRef = this.context.plugin.app.vault.on(
			"modify",
			this.onModify.bind(this)
		);

		const deleteEvtRef = this.context.plugin.app.vault.on(
			"delete",
			this.onDelete.bind(this)
		);
		const renameEvtRef = this.context.plugin.app.vault.on(
			"rename",
			this.onRename.bind(this)
		);

		this.context.plugin.registerEvent(createEvtRef);
		this.context.plugin.registerEvent(modiftEvtRef);
		this.context.plugin.registerEvent(deleteEvtRef);
		this.context.plugin.registerEvent(renameEvtRef);
	}

	updateSettings() {
		this.currentSettingsUtil = this.context.plugin.settingsUtil.getClone();
		this.currentSettings = this.currentSettingsUtil.getSettingsRef();
	}

	resume() {
		this.isPaused = false;
	}
	stop() {
		this.isPaused = true;
	}
	fullScan() {
		if (this.isPaused) {
			return;
		}

		if (this.getSettingsUtil().getRuntimeAutoExports().length < 1) {
			return;
		}

		for (const file of this.context.plugin.app.vault.getFiles()) {
			const autoExports =
				this.getSettingsUtil().findRuntimeAutoExports(file);

			for (const settings of autoExports) {
				this.runExport(file as TFile, settings);
			}
		}
	}

	createExportElement = () => {
		const exportDiv = document.body.createDiv({
			cls: "imgk-export-supporter",
		});
		return exportDiv;
	};

	getSettingsUtil() {
		return this.currentSettingsUtil;
	}

	getSettings() {
		return this.currentSettings;
	}

	getSupportedFormats() {
		return this.getSettingsUtil().getRuntimeSupportedFormats();
	}

	runExport(file: TFile, settings: ImgkRuntimeExportSettings) {
		console.log("runExport : ", file);
		const contEl = this.createExportElement();
		exportBatch(this.context, file, settings, contEl)
			.then(() => {})
			.catch((err) => {
				console.log(err);
			})
			.finally(() => {
				contEl.remove();
			});
	}

	onCreate(file: TAbstractFile) {
		if (this.isPaused) {
			return;
		}
		console.log("on create : ", file);

		const autoExports = this.getSettingsUtil().findRuntimeAutoExports(file);
		for (const settings of autoExports) {
			this.runExport(file as TFile, settings);
		}
	}

	onModify(file: TAbstractFile) {
		if (this.isPaused) {
			return;
		}
		console.log("on modify : ", file);
		const autoExports = this.getSettingsUtil().findRuntimeAutoExports(file);
		for (const settings of autoExports) {
			this.runExport(file as TFile, settings);
		}
	}

	onRename(file: TAbstractFile, oldPath: string) {
		if (this.isPaused) {
			return;
		}
		// console.log("on rename : ", oldPath, "->", file);

		this.groupRename(file as TFile, oldPath)
			.then(() => {})
			.catch((err) => {});
	}

	async groupRename(file: TFile, oldPath: string) {
		const context = this.context;
		const autoExports = this.getSettingsUtil().findRuntimeAutoExports(file);
		for (const settings of autoExports) {
			const existingExportedFilePath = genExportPath(
				settings.data,
				oldPath
			).dst.path;

			const existingExportedFile = findValutFile(
				context,
				existingExportedFilePath
			);
			if (!existingExportedFile) {
				continue;
			}

			const newExportedFileNPath = genExportPath(settings.data, file).dst
				.path;

			const newExprtedFolder = pb.dirname(newExportedFileNPath);
			const newExprtedFolderExists =
				await this.context.plugin.app.vault.adapter.exists(
					newExprtedFolder
				);
			if (!newExprtedFolderExists) {
				try {
					await this.context.plugin.app.vault.createFolder(
						newExprtedFolder
					);
				} catch (e) {}
			}

			//renaming with FileManager is more safer than Valut
			await this.context.plugin.app.fileManager.renameFile(
				existingExportedFile,
				newExportedFileNPath
			);
		}
	}

	deleteGroupFiles(file: TFile) {
		const autoExports = this.getSettingsUtil().findRuntimeAutoExports(file);
		for (const settings of autoExports) {
			const exportedFilePath = genExportPath(settings.data, file).dst
				.path;

			const exportedFile = findValutFile(this.context, exportedFilePath);
			if (!exportedFile) {
				continue;
			}

			console.log("delete  : ", exportedFile.path);

			this.context.plugin.app.vault
				.delete(exportedFile)
				.then(() => {
					console.log("delete complete");
				})
				.catch((err) => {
					console.log(err);
				});
		}
	}

	onDelete(file: TAbstractFile) {
		if (this.isPaused) {
			return;
		}
		// console.log("on delete : ", file);

		this.deleteGroupFiles(file as TFile);
	}
}
