import { App, Plugin, PluginManifest } from "obsidian";
import { ImgkPluginSettings, SettingsUtil } from "./settings/settings";

export type PluginContext = {
	plugin: Plugin;
};

export type TypedPluginContext<T extends Plugin> = {
	plugin: T;
};

export class MainPlugin extends Plugin {
	settings: ImgkPluginSettings;
	settingsUtil: SettingsUtil;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
	}
}

export type MainPluginContext = TypedPluginContext<MainPlugin>;
