import { TAbstractFile, TFile } from "obsidian";
import { MainPluginContext } from "./context";
import {
	ExportFormat,
	buildExportFilePath,
	getExportFilePath,
	isImageExportFormat,
} from "./exporter";
import { PIE } from "./engines/imgEngines";
import { findValutFile, isTFile } from "./vault_util";

const exportBatch = async (
	context: MainPluginContext,
	psdFile: TFile,
	exportFormats: ExportFormat[],
	refElement: HTMLElement
) => {
	for (const exp of exportFormats) {
		try {
			if (isImageExportFormat(exp)) {
				await PIE.magick().export(context, psdFile, exp, refElement);
			}
		} catch (err) {
			// TODO: Handle error
			// console.log("error!", err);
		}
	}
};

export class VaultHandler {
	context: MainPluginContext;
	constructor(context: MainPluginContext) {
		this.context = context;

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

	fullScan() {
		for (const file of this.context.plugin.app.vault.getFiles()) {
			if (
				!isTFile(
					file,
					this.context.plugin.settingsUtil.getSupportedFormats()
				)
			) {
				continue;
			}
			this.runExport(file as TFile);
		}
	}

	createExportElement = () => {
		const div = document.createElement("div");
		document.body.append(div);
		return div;
	};

	getSettingsUtil() {
		return this.context.plugin.settingsUtil;
	}

	getSettings() {
		return this.context.plugin.settings;
	}

	getExportFormats() {
		return this.getSettingsUtil().getExportFormats();
	}

	getSupportedFormats() {
		return this.getSettingsUtil().getSupportedFormats();
	}

	runExport(file: TFile) {
		// console.log("runExport : ", file);
		const contEl = this.createExportElement();
		exportBatch(this.context, file, this.getExportFormats(), contEl)
			.then(() => {})
			.catch((err) => {
				console.log(err);
			})
			.finally(() => {
				contEl.remove();
			});
	}

	onCreate(file: TAbstractFile) {
		// console.log("on create : ", file);
		if (!isTFile(file, this.getSupportedFormats())) {
			return;
		}
		this.runExport(file as TFile);
	}

	onModify(file: TAbstractFile) {
		// console.log("on modify : ", file);
		if (!isTFile(file, this.getSupportedFormats())) {
			return;
		}
		this.runExport(file as TFile);
	}

	onRename(file: TAbstractFile, oldPath: string) {
		// console.log("on rename : ", oldPath, "->", file);

		if (!isTFile(file, this.getSupportedFormats())) {
			return;
		}
		this.groupRename(file as TFile, oldPath);
		// this.deleteGroupFilesWithPath(oldPath);
		// this.runExport(file as TFile);
	}

	groupRename(file: TFile, oldPath: string) {
		const context = this.context;
		for (const fmt of this.getExportFormats()) {
			const exportFilePath = buildExportFilePath(context, oldPath, fmt);

			const exportedFile = findValutFile(context, exportFilePath);
			if (!exportedFile) {
				continue;
			}

			const newExportedFileNPath = getExportFilePath(
				context,
				file as TFile,
				fmt
			);

			//renaming with FileManager is more safer than Valut
			this.context.plugin.app.fileManager
				.renameFile(exportedFile, newExportedFileNPath)
				.then(() => {
					console.log("rename complete!");
				})
				.catch((err) => {
					console.log("error");
					console.log(err);
				});
		}
	}

	deleteGroupFilesWithPath(path: string) {
		for (const fmt of this.getExportFormats()) {
			const exportedFilePath = buildExportFilePath(
				this.context,
				path,
				fmt
			);

			const exportedFile = findValutFile(this.context, exportedFilePath);
			if (exportedFile) {
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
	}

	deleteGroupFiles(file: TFile) {
		for (const fmt of this.getExportFormats()) {
			const exportedFilePath = getExportFilePath(
				this.context,
				file as TFile,
				fmt
			);

			const exportedFile = findValutFile(this.context, exportedFilePath);
			if (exportedFile) {
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
	}

	onDelete(file: TAbstractFile) {
		// console.log("on delete : ", file);

		if (!isTFile(file, this.getSupportedFormats())) {
			return;
		}

		this.deleteGroupFiles(file as TFile);
	}
}
