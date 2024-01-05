import { App, Plugin, PluginManifest } from "obsidian";
import { SettingsUtil } from "./settings/settings";
import { ImgkMutationObserver } from "./editor_ext/mutation_ob";
import { ImgkPluginSettings } from "./settings/setting_types";

export type PluginContext = {
	plugin: Plugin;
};

export type TypedPluginContext<T extends Plugin> = {
	plugin: T;
};

export abstract class MainPlugin extends Plugin {
	settings: ImgkPluginSettings;
	settingsUtil: SettingsUtil;
	baseResourcePath: string | undefined;
	baseResourcePathIdx: number;

	abstract get mainObserver(): ImgkMutationObserver;
	public abstract onSettingsUpdate(
		newSettings: ImgkPluginSettings
	): Promise<void>;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
	}
}

export type MainPluginContext = TypedPluginContext<MainPlugin>;
