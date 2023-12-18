import {
	MarkdownPostProcessorContext,
	ViewCreator,
	WorkspaceLeaf,
} from "obsidian";
import * as psd from "./engines/psd/psd";
import * as magick from "./engines/magick/magick";
import { livePreviewExtension } from "./live_preview";
import { loadImageMagick } from "./engines/magick/magick_loader";
import { ImageMagick, Magick, MagickFormat } from "@imagemagick/magick-wasm";
import { PIE } from "./engines/imgEngines";
import {
	DEFAULT_SETTINGS,
	EMBED_PSD_MD_EXT,
	EXT_ALL,
	ImgMagicianPluginSettings,
} from "./settings";
import { MainPlugin, MainPluginContext } from "./context";
import { PsdSupportSettingTab } from "./settings_tab";
import { VaultHandler } from "./valut";
import { PsdFileView, VIEW_TYPE_PSD } from "./view";

export default class ImgMagicianPlugin extends MainPlugin {
	settings: ImgMagicianPluginSettings;
	vaultHandler: VaultHandler;
	context: MainPluginContext;

	private onSettingsUpdate() {}
	async onload() {
		// initialize magick engine
		try {
			await loadImageMagick();

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
		//initilize psd engine
		PIE._psd = new psd.PluginPsdEngine();

		await this.loadSettings();

		this.context = { plugin: this };
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(
			new PsdSupportSettingTab(this.app, this, this.onSettingsUpdate)
		);

		const PsdFileViewCreator: ViewCreator = (leaf: WorkspaceLeaf) => {
			return new PsdFileView(this.context, leaf);
		};

		// register psd view
		this.registerView(VIEW_TYPE_PSD, PsdFileViewCreator);

		// register one by one to avoid exception
		for (const ext of EXT_ALL) {
			try {
				this.registerExtensions([ext], VIEW_TYPE_PSD);
			} catch (e) {
				console.log("error : ", e);
			}
		}

		// register embed markdown
		this.registerExtensions([EMBED_PSD_MD_EXT], "markdown");

		// Using the onLayoutReady event will help to avoid massive vault.on('create') event on startup.
		this.app.workspace.onLayoutReady(() => {
			this.handleOnLayoutReady();
			this.vaultHandler = new VaultHandler(this.context);
			this.vaultHandler.fullScan();
		});
	}

	private handleOnLayoutReady() {
		this.setupHoverLink();
		this.setupMarkdownPostProcessor();
		this.setupLivePreview();
	}

	setupMarkdownPostProcessor() {
		this.registerMarkdownPostProcessor(markdownPostProcessor(this.context));
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
			this.registerHoverLinkSource(VIEW_TYPE_PSD, {
				defaultMod: false,
				display: VIEW_TYPE_PSD,
			});
		} catch (err) {}
	}

	/**
	 * Handle live preview in live edit mode
	 */
	setupLivePreview() {
		this.registerEditorExtension(livePreviewExtension(this.context));
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

const markdownPostProcessor = (_context: MainPluginContext) => {
	return async (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
		console.log("markdownPostProcessor", "el : ", el, "ctx:", ctx);
		//check to see if we are rendering in editing mode or live preview
		//if yes, then there should be no .internal-embed containers
		const embeddedItems = el.querySelectorAll(".internal-embed");

		// console.log(el);
	};
};
