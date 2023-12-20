import {
	MarkdownPostProcessorContext,
	ViewCreator,
	WorkspaceLeaf,
} from "obsidian";
import * as psd from "./engines/psd/psd";
import * as magick from "./engines/magick/magick";
import { livePreviewExtension } from "./editor_ext/live_preview";
import { loadImageMagick } from "./engines/magick/magick_loader";
import { PIE } from "./engines/imgEngines";
import {
	DEFAULT_SETTINGS,
	ImgMagicianPluginSettings,
	SettingsUtil,
} from "./settings/settings";
import { MainPlugin, MainPluginContext } from "./context";
import { ImgkPluginSettingTab } from "./settings/settings_tab";
import { VaultHandler } from "./valut";
import { ImgkPluginFileView, VIEW_TYPE_IMGK_PLUGIN } from "./view";
import { getMarkdownPostProcessor } from "./editor_ext/post_processor";
import { Magick } from "@imagemagick/magick-wasm";

export default class ImgMagicianPlugin extends MainPlugin {
	settings: ImgMagicianPluginSettings;
	vaultHandler: VaultHandler;
	context: MainPluginContext;

	private onSettingsUpdate() {}

	async onload() {
		if (!PIE._magick) {
			// initialize magick engine
			try {
				await loadImageMagick();

				console.log(Magick.imageMagickVersion);

				// let listStr: string = "";
				// for (const fm of Magick.supportedFormats) {
				// 	if (fm.supportsReading) {
				// 		listStr += `|${fm.format}|${fm.description}||\n`;
				// 	}
				// }
				// console.log(listStr);
				PIE._magick = new magick.PluginMagickEngine();
			} catch (e) {
				console.log(e);
			}
		}

		if (!PIE._psd) {
			//initilize psd engine
			PIE._psd = new psd.PluginPsdEngine();
		}

		await this.loadSettings();

		this.context = { plugin: this };
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(
			new ImgkPluginSettingTab(this.context, () => {
				this.onSettingsUpdate();
			})
		);

		this.registerPluginExtensions();

		// Using the onLayoutReady event will help to avoid massive vault.on('create') event on startup.
		this.app.workspace.onLayoutReady(() => {
			this.handleOnLayoutReady();
			this.vaultHandler = new VaultHandler(this.context);
			this.vaultHandler.fullScan();
		});

		if (this.settings.viewTreatVerticalOverflow) {
			this.app.workspace.containerEl.classList.add(
				"imgk-plugin-treat-vertical-overflow"
			);
		}
	}

	private registerPluginExtensions() {
		const ImgkPluginViewCreator: ViewCreator = (leaf: WorkspaceLeaf) => {
			return new ImgkPluginFileView(this.context, leaf);
		};

		// register psd view
		this.registerView(VIEW_TYPE_IMGK_PLUGIN, ImgkPluginViewCreator);
		this.registerExtensions(
			this.settings.supportedFormats,
			VIEW_TYPE_IMGK_PLUGIN
		);

		// register one by one to avoid exception
		// for (const ext of this.settings.supportedFormats) {
		// 	try {
		// 		this.registerExtensions([ext], VIEW_TYPE_IMGK_PLUGIN);
		// 	} catch (e) {
		// 		console.log("error : ", e);
		// 	}
		// }
	}
	private clearPluginMods() {
		this.app.workspace.containerEl.classList.remove(
			"imgk-plugin-treat-vertical-overflow"
		);
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
					console.log("hover-link", _e);
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
		this.clearPluginMods();
	}

	getSettings(): ImgMagicianPluginSettings {
		return this.settings;
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
		this.settingsUtil = new SettingsUtil(() => this.getSettings());

		// console.log(
		// 	"loadSettings : ",
		// 	this.settings,
		// 	this.settingsUtil.getSupportedFormats()
		// );
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
