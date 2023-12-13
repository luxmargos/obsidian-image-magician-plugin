import { Plugin } from "obsidian";

export type PluginContext = {
	plugin: Plugin;
};

export type TypedPluginContext<T extends Plugin> = {
	plugin: T;
};
