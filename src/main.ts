import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	FileView,
	MarkdownPostProcessor,
	MarkdownPostProcessorContext,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TAbstractFile,
	TFile,
	TFolder,
	Vault,
	ViewCreator,
	WorkspaceLeaf,
} from "obsidian";
import { PluginContext, TypedPluginContext } from "./app_types";
import { TUnionFile, findValutFile, isTFile } from "./vault_util";
import {
	FileFormat,
	buildExportFilePath,
	imageFormatMap,
	getExportFilePath,
	isImageFormat,
	embedMarkDownCreator,
} from "./exporter";
import { drawPsd, exportPsdToAny } from "./psd";

type PsdSupportPluginContext = TypedPluginContext<PsdSupportPlugin>;

// Remember to rename these classes and interfaces!
interface PsdSupportPluginSettings {
	exportRelativePath: boolean;
	exportDirAbs: string;
	exportDirRel: string;

	fileNamePrefix: string;
	fileNameSuffix: string;

	autoEmbedMarkdownGen: boolean;
	autoPngGen: boolean;
	autoJpgGen: boolean;
}

const EMBED_PSD_PLUGIN_PROP = "psdsupport-plugin";
const EMBED_PSD_MD_EXT = "psdembed.md";
const EMBED_PSD_FORMAT: FileFormat = {
	mimeType: "text/md",
	ext: EMBED_PSD_MD_EXT,
	optAvoidStringFormat: true,
};

const VIEW_TYPE_PSD = "psd-view";
const EXT_PSD = "psd";
const EXT_ALL = [EXT_PSD];

const DEFAULT_SETTINGS: PsdSupportPluginSettings = {
	exportRelativePath: true,
	exportDirAbs: "Psd Support",
	exportDirRel: "",

	fileNamePrefix: "",
	fileNameSuffix: ".exported",
	autoEmbedMarkdownGen: true,
	autoJpgGen: true,
	autoPngGen: true,
};

export default class PsdSupportPlugin extends Plugin {
	settings: PsdSupportPluginSettings;

	async onload() {
		await this.loadSettings();

		const context: PsdSupportPluginContext = { plugin: this };
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new PsdSupportSettingTab(context));

		const PsdFileViewCreator: ViewCreator = (leaf: WorkspaceLeaf) => {
			return new PsdFileView(this, leaf);
		};

		// register psd view
		this.registerView(VIEW_TYPE_PSD, PsdFileViewCreator);
		this.registerExtensions(EXT_ALL, VIEW_TYPE_PSD);

		// register embed markdown
		this.registerExtensions([EMBED_PSD_MD_EXT], "markdown");

		// Using the onLayoutReady event will help to avoid massive vault.on('create') event on startup.
		this.app.workspace.onLayoutReady(() => {
			this.handleOnLayoutReady();
			new VaultHandler(context);
		});
	}

	private handleOnLayoutReady() {
		this.registerMarkdownPostProcessor(markdownPostProcessor);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class PsdFileView extends FileView {
	plugin: PsdSupportPlugin;

	constructor(plugin: PsdSupportPlugin, leaf: WorkspaceLeaf) {
		super(leaf);
		this.plugin = plugin;
		this.allowNoFile = true;
		this.navigation = true;
		console.log("leaf");
	}

	canAcceptExtension(extension: string): boolean {
		console.log("canAcceptExtension ", extension);
		return EXT_ALL.contains(extension);
	}

	getViewType(): string {
		return VIEW_TYPE_PSD;
	}

	getDisplayText(): string {
		return this.file?.basename ?? "";
	}

	onload(): void {
		console.log("onload", this.file);
	}

	onunload(): void {
		console.log("onunload");
	}
	protected onOpen(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.log("onOpen");
			resolve();
		});
	}
	protected onClose(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.log("onClose");
			resolve();
		});
	}

	onLoadFile(file: TFile): Promise<void> {
		return new Promise(async (resolve, reject) => {
			this.contentEl.empty();
			await drawPsd({ plugin: this.plugin }, file, this.contentEl);

			resolve();
		});
	}
}

const exportBatch = async (
	context: PsdSupportPluginContext,
	psdFile: TFile,
	exportFormats: FileFormat[],
	refElement: HTMLElement
) => {
	for (const exp of exportFormats) {
		if (isImageFormat(exp)) {
			await exportPsdToAny(context, psdFile, exp, refElement);
		} else if (exp.ext === EMBED_PSD_MD_EXT) {
			await embedMarkDownCreator(
				context,
				psdFile,
				exp,
				EMBED_PSD_PLUGIN_PROP
			);
		}
	}
};

const getExportFormats = (settings: PsdSupportPluginSettings): FileFormat[] => {
	const exportFormats: FileFormat[] = [];
	if (settings.autoEmbedMarkdownGen) {
		exportFormats.push(EMBED_PSD_FORMAT);
	}
	if (settings.autoPngGen) {
		exportFormats.push(imageFormatMap.png);
	}
	if (settings.autoJpgGen) {
		exportFormats.push(imageFormatMap.jpg);
	}
	return exportFormats;
};

class VaultHandler {
	context: PsdSupportPluginContext;
	constructor(context: PsdSupportPluginContext) {
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

	createExportElement = () => {
		const div = document.createElement("div");
		document.body.append(div);
		return div;
	};

	runExport(file: TFile) {
		console.log("runExport : ", file);
		const contEl = this.createExportElement();
		exportBatch(
			this.context,
			file,
			getExportFormats(this.context.plugin.settings),
			contEl
		)
			.then(() => {})
			.catch((err) => {
				console.log(err);
			})
			.finally(() => {
				contEl.remove();
			});
	}

	onCreate(file: TAbstractFile, p: PsdSupportPlugin) {
		// console.log("on create : ", file);
		if (!isTFile(file, EXT_PSD)) {
			return;
		}
		this.runExport(file as TFile);
	}

	onModify(file: TAbstractFile) {
		// console.log("on modify : ", file);
		if (!isTFile(file, EXT_PSD)) {
			return;
		}
		this.runExport(file as TFile);
	}

	onRename(file: TAbstractFile, oldPath: string) {
		// console.log("on rename : ", oldPath, "->", file);

		if (!isTFile(file, EXT_PSD)) {
			return;
		}
		this.groupRename(file as TFile, oldPath);
		// this.deleteGroupFilesWithPath(oldPath);
		// this.runExport(file as TFile);
	}

	groupRename(file: TFile, oldPath: string) {
		const context = this.context;
		for (const fmt of getExportFormats(context.plugin.settings)) {
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

			this.context.plugin.app.fileManager
				.renameFile(exportedFile, newExportedFileNPath)
				// this.context.plugin.app.vault.rename(exportedFile, newExportedFileNPath)
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
		for (const fmt of getExportFormats(this.context.plugin.settings)) {
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
		for (const fmt of getExportFormats(this.context.plugin.settings)) {
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

		if (!isTFile(file, EXT_PSD)) {
			return;
		}

		this.deleteGroupFiles(file as TFile);
	}
}

class PsdSupportSettingTab extends PluginSettingTab {
	context: PsdSupportPluginContext;

	constructor(context: PsdSupportPluginContext) {
		super(context.plugin.app, context.plugin);
		this.context = context;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setName("Setting #1").setDesc("It's a secret");
		// .addText((text) =>
		// 	text
		// 		.setPlaceholder("Enter your secret")
		// 		.setValue(this.plugin.settings.mySetting)
		// 		.onChange(async (value) => {
		// 			this.plugin.settings.mySetting = value;
		// 			await this.plugin.saveSettings();
		// 		})
		// );
	}
}

const markdownPostProcessor = async (
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext
) => {
	console.log("markdownPostProcessor", "el : ", el, "ctx:", ctx);
	//check to see if we are rendering in editing mode or live preview
	//if yes, then there should be no .internal-embed containers
	// const embeddedItems = el.querySelectorAll(".internal-embed");
	// if (embeddedItems.length === 0) {
	// 	//   tmpObsidianWYSIWYG(el, ctx);
	// 	return;
	// }

	// console.log(el);
};

/**
 * @deprecated
 */
class FieldSuggester extends EditorSuggest<string> {
	plugin: PsdSupportPlugin;
	suggestType: "psd";
	latestTriggerInfo: EditorSuggestTriggerInfo;

	constructor(plugin: PsdSupportPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		file: TFile
	): EditorSuggestTriggerInfo | null {
		console.log("onTrigger");
		if (true) {
			const sub = editor.getLine(cursor.line).substring(0, cursor.ch);
			const line = editor.getLine(cursor.line);
			console.log("sub", sub);
			console.log("line", line);
			const match = line.match(/\[.*psd/);
			console.log("match", match);
			// if (match !== undefined) {
			//   this.suggestType = 'psd';
			//   this.latestTriggerInfo = {
			// 	end: cursor,
			// 	start: {
			// 	  ch: cursor.ch - match.length,
			// 	  line: cursor.line,
			// 	},
			// 	query: match,
			//   };
			//   return this.latestTriggerInfo;
			// }
		}
		return null;
	}

	getSuggestions = (context: EditorSuggestContext) => {
		const query = context.query.toLowerCase();
		return ["psd"];
	};

	renderSuggestion(suggestion: string, el: HTMLElement): void {
		return;
	}

	selectSuggestion(suggestion: string): void {
		const { context } = this;
		if (context) {
		}
	}
}
