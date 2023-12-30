import { TAbstractFile, TFile } from "obsidian";
import { MainPluginContext } from "./context";
import { genExportPath } from "./export_settings";
import { findValutFile } from "./vault_util";
import * as pb from "path-browserify";
import { ImgkPluginSettings, SettingsUtil } from "./settings/settings";
import { ImgkRuntimeExportSettings } from "./settings/settings_as_func";
import { debug } from "loglevel";
import { exportImage } from "./exporter";

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

	fullScan(forcedExport: boolean) {
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
				this.runExport(file as TFile, settings, forcedExport);
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

	runExport(
		file: TFile,
		settings: ImgkRuntimeExportSettings,
		forcedExport: boolean
	) {
		const contEl = this.createExportElement();
		exportImage(
			this.context,
			contEl,
			file,
			undefined,
			settings,
			forcedExport
		)
			.then((path) => {
				debug("export complate : ", file.path, "=>", path);
			})
			.catch((err) => {
				debug(err);
			})
			.finally(() => {
				contEl.remove();
			});
	}

	onCreate(file: TAbstractFile) {
		if (this.isPaused) {
			return;
		}

		const autoExports = this.getSettingsUtil().findRuntimeAutoExports(file);
		for (const settings of autoExports) {
			this.runExport(file as TFile, settings, false);
		}
	}

	onModify(file: TAbstractFile) {
		if (this.isPaused) {
			return;
		}

		const autoExports = this.getSettingsUtil().findRuntimeAutoExports(file);
		for (const settings of autoExports) {
			this.runExport(file as TFile, settings, false);
		}
	}

	onRename(file: TAbstractFile, oldPath: string) {
		if (this.isPaused) {
			return;
		}

		if (!this.getSettings().trackRename) {
			return;
		}

		debug("on rename : ", oldPath, "->", file.path);

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
				oldPath,
				undefined
			)?.dst.path;

			if (!existingExportedFilePath) {
				continue;
			}

			const existingExportedFile = findValutFile(
				context,
				existingExportedFilePath
			);
			if (!existingExportedFile) {
				continue;
			}

			const newExportedFileNPath = genExportPath(
				settings.data,
				file,
				undefined
			)?.dst.path;

			if (!newExportedFileNPath) {
				continue;
			}

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
			const exportedFilePath = genExportPath(
				settings.data,
				file,
				undefined
			)?.dst.path;

			if (!exportedFilePath) {
				continue;
			}

			const exportedFile = findValutFile(this.context, exportedFilePath);
			if (!exportedFile) {
				continue;
			}

			debug("delete  : ", exportedFile.path);

			this.context.plugin.app.vault
				.delete(exportedFile)
				.then(() => {
					debug("delete complete");
				})
				.catch((err) => {
					debug(err);
				});
		}
	}

	onDelete(file: TAbstractFile) {
		if (this.isPaused) {
			return;
		}

		if (!this.getSettings().trackDelete) {
			return;
		}
		debug("on delete : ", file.path);

		this.deleteGroupFiles(file as TFile);
	}
}
