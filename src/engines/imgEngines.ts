import { PluginImageEngine } from "./imgEngine";

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
		if (ext === "psd" || ext === "psb") {
			return this.psd();
		}
		return this.magick();
	}
}
