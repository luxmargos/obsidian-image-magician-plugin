import { App, Plugin, PluginManifest } from "obsidian";
import { ImgkPluginSettings, SettingsUtil } from "./settings/settings";
import { ImgkMutationObserver } from "./editor_ext/mutation_ob";

export type PluginContext = {
	plugin: Plugin;
};

export type TypedPluginContext<T extends Plugin> = {
	plugin: T;
};

export abstract class MainPlugin extends Plugin {
	settings: ImgkPluginSettings;
	settingsUtil: SettingsUtil;
	abstract get mainObserver(): ImgkMutationObserver;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
	}
}

export type MainPluginContext = TypedPluginContext<MainPlugin>;
