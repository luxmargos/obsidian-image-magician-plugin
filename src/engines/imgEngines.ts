import { PluginImageEngine } from "./imgEngine";

const psdEngineExts = new Set(["psd", "psb", "PSD", "PSB"]);

export class PIE {
	static magick(): PluginImageEngine {
		return this._magick;
	}

	static psd(): PluginImageEngine {
		return this._psd;
	}

	static _magick: PluginImageEngine;
	static _psd: PluginImageEngine;

	static getEngine(ext: string): PluginImageEngine {
		if (psdEngineExts.has(ext)) {
			return this.psd();
		}

		return this.magick();
	}
}
