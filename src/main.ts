import {
	FileSystemAdapter,
	Modal,
	Platform,
	Plugin,
	TAbstractFile,
	TFile,
	ViewCreator,
	WorkspaceLeaf,
} from "obsidian";
import * as psd from "./engines/psd/psd";
import * as magick from "./engines/magick/magick";
import { livePreviewExtension } from "./editor_ext/live_preview";
import { loadImageMagick } from "./engines/magick/magick_loader";
import { PIE } from "./engines/imgEngines";
import {
	DEFAULT_INSTANT_EXPORT_SETTINGS,
	DEFAULT_SETTINGS,
	SettingsUtil,
	migrageFolderDeterminer,
} from "./settings/settings";
import { MainPlugin, MainPluginContext } from "./context";
import { ImgkPluginSettingTab } from "./settings/settings_tab";
import { VaultHandler } from "./valut_handler";
import { ImgkPluginFileView, VIEW_TYPE_IMGK_PLUGIN } from "./view";
import { getMarkdownPostProcessor } from "./editor_ext/post_processor";
import { Magick } from "@imagemagick/magick-wasm";

import { PluginFullName, PluginName } from "./consts/main";
import log, { debug, info, setLevel } from "loglevel";

import { ImgkMutationObserver } from "./editor_ext/mutation_ob";

import { ImgkPluginExportDialog } from "./dialogs/export_opt_dialog";
import { asTFile, isTFile } from "./vault_util";
import { t } from "./i18n/t";
import { clearCaches } from "./img_cache";
import { cloneDeep } from "lodash-es";
import {
	ImgkFolderDeterminer,
	ImgkPluginSettings,
} from "./settings/setting_types";
import fileUrl from "file-url";
import { logLevelMobilePatcher } from "./utils/log_utils";
import packageJson from "../package.json";

export default class ImgMagicianPlugin extends MainPlugin {
	settings: ImgkPluginSettings;
	vaultHandler: VaultHandler;
	context: MainPluginContext;
	baseResourcePath: string | undefined;
	baseResourcePathIdx: number;

	public onSettingsUpdate(newSettings: ImgkPluginSettings) {
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

				if (this.settings.excalidrawStretchEmbed) {
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
				debug("cleanup");
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
		this.baseResourcePathIdx = -1;
		setLevel("INFO");

		//for development
		// if (process.env.NODE_ENV === "development") {
		// 	setLevel("DEBUG");
		// 	logLevelMobilePatcher(this);
		// 	debug("DEV MODE");
		// } else {
		// 	setLevel("INFO");
		// }

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

		if (!PIE._magick) {
			const errorDialog = new Modal(this.app);
			errorDialog.titleEl.setText(
				`${PluginFullName}: ${t("ERROR_PLUGIN_START_UP")}`
			);
			errorDialog.contentEl.setText(t("ERROR_IMAGE_MAGICK_LOAD_FAILED"));
			errorDialog.open();
			return;
		}

		if (!PIE._psd) {
			//initilize psd engine
			PIE._psd = new psd.PluginPsdEngine();
		}
		this.context = { plugin: this };

		this._mainObserver = new ImgkMutationObserver(document.body, {
			childList: true,
			subtree: true,
		});

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
			this.handleOnLayoutReady()
				.then(() => {})
				.catch(() => {});
		});

		//DEBUG
		// new ImgkPluginSettingsDialog(this.context, (newSettings) => {
		// 	this.onSettingsUpdate(newSettings);
		// }).open();

		this.addCommand({
			id: "export-image",
			name: t("OPEN_IMAGE_EXPORT_DIALOG"),

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

		this.addCommand({
			id: "process-auto-export",
			name: t("PROCESS_AUTO_EXPORT_SETTINGS"),
			callback: () => {
				this.vaultHandler.fullScan(false);
			},
		});

		this.addCommand({
			id: "process-auto-export-forced",
			name: t("PROCESS_AUTO_EXPORT_SETTINGS_FORCED"),
			callback: () => {
				this.vaultHandler.fullScan(true);
			},
		});

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				const tFile = asTFile(file);
				if (!tFile) {
					return;
				}

				const isSupported = this.settingsUtil.isExportSupportedFormat(
					tFile.extension
				);

				if (!isSupported) {
					return;
				}

				menu.addItem((item) => {
					item.setTitle(t("OPEN_IMAGE_EXPORT_DIALOG"))
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
				`${PluginFullName}: ${t("WARN_PLUGIN_START_UP")}`
			);
			errorDialog.contentEl.setText(
				t("FORMAT_FAILED_EXT_LIST")
					.replace("${list}", newFailedExts.join(", "))
					.replace("${name}", PluginName)
			);
			errorDialog.open();
		}
	}

	private async findBaseResourcePath(): Promise<string | undefined> {
		let result: string | undefined;
		let retryCount = 0;

		while (retryCount < 3) {
			retryCount += 1;
			const testFileName = `__ImageMagicianPluginBasePathFinder__${retryCount}`;

			let testAbstractFile: TAbstractFile | null | undefined =
				this.app.vault.getAbstractFileByPath(testFileName);

			if (testAbstractFile && !isTFile(testAbstractFile)) {
				continue;
			}

			let removeTestFile = false;

			if (!testAbstractFile) {
				try {
					testAbstractFile = await this.app.vault.create(
						testFileName,
						""
					);
					removeTestFile = true;
				} catch (err) {}
			}

			if (!testAbstractFile) {
				continue;
			}

			let testFile: TFile | undefined = asTFile(testAbstractFile);
			const loopFinisher = async () => {
				if (removeTestFile) {
					try {
						await this.app.vault.delete(testAbstractFile!);
					} catch (err) {}
				}
			};
			if (!testFile) {
				await loopFinisher();
				continue;
			}

			const resPath = this.app.vault.getResourcePath(testFile);
			const basePathIdx = resPath.indexOf(testFileName);
			let basePath: string = "";
			if (basePathIdx >= 0) {
				basePath = resPath.substring(0, basePathIdx);
			}

			if (basePath) {
				result = basePath;
				await loopFinisher();
				break;
			} else {
				await loopFinisher();
				continue;
			}
		}

		if (result) {
			try {
				const url = new URL(result);
				result = decodeURIComponent(url.pathname);
			} catch (err) {}
		}

		return result;
	}

	private handleOnLayoutReady(): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				this.baseResourcePathIdx = -1;
				if (
					Platform.isDesktopApp &&
					// /skip: obsidian. The plugin will bypass errors, handling them on a case-by-case basis, whether it's on desktop or mobile
					this.app.vault.adapter instanceof FileSystemAdapter
				) {
					this.baseResourcePath =
						this.app.vault.adapter.getBasePath();

					debug("Reveal BasePath with Desktop");
				} else {
					try {
						if (
							//@ts-ignore
							this.app.vault.adapter["getBasePath"] &&
							//@ts-ignore
							typeof this.app.vault.adapter["getBasePath"] ===
								"function"
						) {
							debug("Reveal BasePath with Func");
							const getBasePathFunc =
								//@ts-ignore
								this.app.vault.adapter.getBasePath;
							this.baseResourcePath = getBasePathFunc();
						}
					} catch (err) {}
				}

				if (this.baseResourcePath) {
					try {
						const fileUrlString = fileUrl(this.baseResourcePath);
						const url = new URL(fileUrlString);
						this.baseResourcePath = url.pathname;
					} catch (e) {}

					if (this.baseResourcePath) {
						this.baseResourcePathIdx =
							this.baseResourcePath?.length ?? -1;
					}
				}

				if (this.baseResourcePathIdx < 0) {
					debug("Reveal BasePath manually");
					this.baseResourcePath = await this.findBaseResourcePath();
					this.baseResourcePathIdx =
						this.baseResourcePath?.length ?? -1;
				}

				debug(
					"FINAL BASE PATH : ",
					this.baseResourcePath,
					this.baseResourcePathIdx
				);
			} catch (err) {}

			try {
				// this.setupHoverLink();
				this.setupMarkdownPostProcessor();
				this.setupLivePreview();
			} catch (err) {}

			resolve();
		});
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

	/**
	 * TODO
	 */
	setupHoverLink() {
		// internal-link quick preview
		// this.registerHoverLinkSource(VIEW_TYPE_IMGK_PLUGIN, {
		// 	defaultMod: false,
		// 	display: PluginName,
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
			// this.registerHoverLinkSource(VIEW_TYPE_IMGK_PLUGIN, {
			// 	defaultMod: false,
			// 	display: VIEW_TYPE_IMGK_PLUGIN,
			// });
		} catch (err) {}
	}

	onunload() {
		this.saveSettings(this.settings);
		this._mainObserver.disconnect();
		this.cleanup()
			.then(() => {})
			.catch((err) => {});
	}

	async loadSettings() {
		const savedData = await this.loadData();

		this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);
		//MINGRATION
		//Legacy
		if (this.settings.version === undefined) {
		} else {
		}
		//

		migrageFolderDeterminer(
			this.settings.instantExport.pathOpts,
			ImgkFolderDeterminer.Relative
		);

		for (const autoExportSettings of this.settings.autoExportList) {
			migrageFolderDeterminer(
				autoExportSettings.pathOpts,
				ImgkFolderDeterminer.AbsoluteAndReflectFolderStructure
			);
		}

		this.settings.version = packageJson.version;
		//END OF MIGRATION

		this.settingsUtil = new SettingsUtil(this.settings);
	}

	/**
	 * TODO: this is not clarified
	 */
	async saveSettings(newSettings: ImgkPluginSettings) {
		this.settings = newSettings;

		//overwrite instantExport as default
		this.settings.instantExport = cloneDeep(
			DEFAULT_INSTANT_EXPORT_SETTINGS
		);
		debug("saveSettings", this.settings);

		this.settingsUtil = new SettingsUtil(this.settings);
		clearCaches();

		await this.saveData(this.settings);
	}
}
