import { App, Plugin, PluginManifest } from "obsidian";
import { ImgMagicianPluginSettings, SettingsUtil } from "./settings";

export type PluginContext = {
	plugin: Plugin;
};

export type TypedPluginContext<T extends Plugin> = {
	plugin: T;
};

export class MainPlugin extends Plugin {
	settings: ImgMagicianPluginSettings;
	settingsUtil: SettingsUtil;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.settingsUtil = new SettingsUtil();
	}
}

export type MainPluginContext = TypedPluginContext<MainPlugin>;
