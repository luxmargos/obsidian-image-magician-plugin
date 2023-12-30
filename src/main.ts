import {
	FileSystemAdapter,
	MarkdownPostProcessorContext,
	Modal,
	TFile,
	ViewCreator,
	WorkspaceLeaf,
	normalizePath,
} from "obsidian";
import * as psd from "./engines/psd/psd";
import * as magick from "./engines/magick/magick";
import { livePreviewExtension } from "./editor_ext/live_preview";
import { loadImageMagick } from "./engines/magick/magick_loader";
import { PIE } from "./engines/imgEngines";
import {
	DEFAULT_SETTINGS,
	ImgkPluginSettings,
	SettingsUtil,
} from "./settings/settings";
import { MainPlugin, MainPluginContext } from "./context";
import { ImgkPluginSettingTab } from "./settings/settings_tab";
import { VaultHandler } from "./valut_handler";
import { ImgkPluginFileView, VIEW_TYPE_IMGK_PLUGIN } from "./view";
import { getMarkdownPostProcessor } from "./editor_ext/post_processor";
import { Magick } from "@imagemagick/magick-wasm";
import { ImgkPluginSettingsDialog } from "./dialogs/plugin_settings_dialog";
import { PluginName } from "./consts/main";
import { debug, info, log, setDefaultLevel, setLevel } from "loglevel";
import { error } from "console";
import { ImgkMutationObserver } from "./editor_ext/mutation_ob";
import { handleImg } from "./editor_ext/img_post_processor";
import { ImgkPluginExportDialog } from "./dialogs/export_opt_dialog";
import { asTFile, isTFile } from "./vault_util";

export default class ImgMagicianPlugin extends MainPlugin {
	settings: ImgkPluginSettings;
	vaultHandler: VaultHandler;
	context: MainPluginContext;

	private onSettingsUpdate(newSettings: ImgkPluginSettings) {
		return new Promise<void>(async (resolve, reject) => {
			try {
				await this.saveSettings(newSettings);
				await this.cleanup();
				await this.postInit();
				this.vaultHandler.fullScan(false);

				resolve();
			} catch (err) {
				reject(err);
			}
		});
	}

	/** TODO: Save instant export settings  */
	notifyInstantExportSettingsUpdate = () => {};

	private postInit() {
		return new Promise<void>(async (resolve, reject) => {
			try {
				this.registerPluginExtensions();

				if (this.settings.viewTreatVerticalOverflow) {
					this.app.workspace.containerEl.classList.add(
						"imgk-plugin-treat-vertical-overflow"
					);
				}

				this.vaultHandler?.updateSettings();
				this.vaultHandler?.resume();

				resolve();
			} catch (err) {
				reject(err);
			}
		});
	}

	private cleanup() {
		return new Promise<void>(async (resolve, reject) => {
			try {
				this.vaultHandler.stop();
				this.app.workspace.containerEl.classList.remove(
					"imgk-plugin-treat-vertical-overflow"
				);

				resolve();
			} catch (err) {
				reject(err);
			}
		});
	}

	private logImageMagickVersion() {
		info(Magick.imageMagickVersion);
	}
	private dumpImageMagickFormats() {
		let listStr: string = "";
		for (const fm of Magick.supportedFormats) {
			if (fm.supportsReading) {
				listStr += `|${fm.format}|${fm.description}||\n`;
			}
		}
		debug(listStr);
	}

	_mainObserver: ImgkMutationObserver;

	get mainObserver(): ImgkMutationObserver {
		return this._mainObserver;
	}

	async onload() {
		// setDefaultLevel("DEBUG");
		// setDefaultLevel("INFO");
		// setLevel("INFO");
		setLevel("DEBUG");

		this._mainObserver = new ImgkMutationObserver(document.body, {
			childList: true,
			subtree: true,
		});

		if (!PIE._magick) {
			// initialize magick engine
			try {
				await loadImageMagick();
				this.logImageMagickVersion();
				// this.dumpImageMagickFormats();
				PIE._magick = new magick.PluginMagickEngine();
			} catch (e) {
				info(e);
			}
		}

		if (!PIE._psd) {
			//initilize psd engine
			PIE._psd = new psd.PluginPsdEngine();
		}
		this.context = { plugin: this };

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(
			new ImgkPluginSettingTab(this.context, (newSettings) => {
				this.onSettingsUpdate(newSettings);
			})
		);

		await this.loadSettings();

		const ImgkPluginViewCreator: ViewCreator = (leaf: WorkspaceLeaf) => {
			return new ImgkPluginFileView(this.context, leaf);
		};

		// register imgk view
		this.registerView(VIEW_TYPE_IMGK_PLUGIN, ImgkPluginViewCreator);

		// Using the onLayoutReady event will help to avoid massive vault.on('create') event on startup.
		this.app.workspace.onLayoutReady(() => {
			this.vaultHandler = new VaultHandler(this.context);
			this.vaultHandler.fullScan(false);
		});

		await this.postInit();

		this.app.workspace.onLayoutReady(() => {
			this.handleOnLayoutReady();
		});

		// new ImgkPluginSettingsDialog(this.context, (newSettings) => {
		// 	this.onSettingsUpdate(newSettings);
		// }).open();

		this.addCommand({
			id: "imgk-plugin-export-image",
			name: "Open image export dialog",

			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					return false;
				}

				const isSupported = this.settingsUtil.isExportSupportedFormat(
					activeFile.extension
				);
				if (checking) {
					return isSupported;
				}

				if (!isSupported) {
					return false;
				}

				new ImgkPluginExportDialog(
					this.context,
					this.context.plugin.settingsUtil.getSettingsRef(),
					this.context.plugin.settingsUtil.getIntantExport(),
					activeFile
				).open();

				return true;
			},
		});

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (!isTFile(file)) {
					return;
				}
				const tFile = file as TFile;
				const isSupported = this.settingsUtil.isExportSupportedFormat(
					tFile.extension
				);

				if (!isSupported) {
					return;
				}

				menu.addItem((item) => {
					item.setTitle("Open image export dialog")
						.setIcon("image")
						.onClick(async () => {
							new ImgkPluginExportDialog(
								this.context,
								this.context.plugin.settingsUtil.getSettingsRef(),
								this.context.plugin.settingsUtil.getIntantExport(),
								tFile
							).open();
						});
				});
			})
		);
	}

	private failedExts: string[] = [];
	private passedExts: string[] = [];

	private registerPluginExtensions() {
		const extsLowerCase = [
			...this.settings.supportedFormats.map((value) =>
				value.toLowerCase()
			),
		]
			.filter(
				(item, itemIndex, selfArr) =>
					selfArr.indexOf(item) === itemIndex
			)
			.filter((item, itemIndex, selfArr) => {
				// skip already attempted extensions
				return (
					!this.passedExts.includes(item) &&
					!this.failedExts.includes(item)
				);
			});

		const newPassedExts: string[] = [];
		const newFailedExts: string[] = [];
		// register one by one to avoid exception
		for (const ext of extsLowerCase) {
			try {
				this.registerExtensions([ext], VIEW_TYPE_IMGK_PLUGIN);
				newPassedExts.push(ext);
			} catch (e) {
				newFailedExts.push(ext);
			}
		}

		const extsUpperCase: string[] = [];
		// register as upper case too
		for (const ext of newPassedExts) {
			try {
				const upperCasedExt = ext.toUpperCase();
				this.registerExtensions([upperCasedExt], VIEW_TYPE_IMGK_PLUGIN);

				extsUpperCase.push(upperCasedExt);
			} catch (e) {}
		}

		this.passedExts.push(...newPassedExts);
		this.passedExts.push(...extsUpperCase);
		this.failedExts.push(...newFailedExts);

		this.settingsUtil.setRuntimeSupportedFormats(new Set(this.passedExts));

		if (newFailedExts.length > 0) {
			const errorDialog = new Modal(this.app);
			errorDialog.titleEl.setText(
				`${PluginName}: Warning on plugin startup`
			);
			errorDialog.contentEl.setText(
				`Some file extensions, such as "[${newFailedExts.join(
					", "
				)}]" have failed to register in the obsidian app. The plugin will not support viewing them. Consider changing the ${PluginName} plugin settings.`
			);
			errorDialog.open();
		}
	}

	private handleOnLayoutReady() {
		// this.setupHoverLink();
		this.setupMarkdownPostProcessor();
		this.setupLivePreview();
	}

	/**
	 * Handle live preview in live edit mode
	 */
	setupLivePreview() {
		this.registerEditorExtension([livePreviewExtension(this.context)]);
	}

	setupMarkdownPostProcessor() {
		this.registerMarkdownPostProcessor(
			getMarkdownPostProcessor(this.context)
		);
	}

	setupHoverLink() {
		// internal-link quick preview
		// this.registerHoverLinkSource(VIEW_TYPE_PSD, {
		// 	defaultMod: false,
		// 	display: "PSD Support Plugin",
		// });

		try {
			// internal-link quick preview
			this.registerEvent(
				//@ts-ignore
				this.app.workspace.on("hover-link", (_e: any) => {
					debug("hover-link", _e);
				})
			);

			//I think this is alternative for hover-link event, but don't know how to use it.
			// this.registerHoverLinkSource()
			// this.registerHoverLinkSource(VIEW_TYPE_PSD, {
			// 	defaultMod: false,
			// 	display: VIEW_TYPE_PSD,
			// });
		} catch (err) {}
	}

	onunload() {
		this._mainObserver.disconnect();
		this.cleanup()
			.then(() => {})
			.catch((err) => {});
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
		this.settingsUtil = new SettingsUtil(this.settings);
	}

	async saveSettings(newSettings: ImgkPluginSettings) {
		this.settings = newSettings;
		this.settingsUtil = new SettingsUtil(this.settings);
		await this.saveData(newSettings);
	}
}
