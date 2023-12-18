import { TAbstractFile } from "obsidian";
import { FileFormat, imageFormatMap } from "./exporter";
import { MagickFormat } from "@imagemagick/magick-wasm";
import { isTFile } from "./vault_util";

export const EMBED_PSD_MD_EXT = "psdembed.md";
export const EMBED_PSD_FORMAT: FileFormat = {
	mimeType: "text/md",
	ext: EMBED_PSD_MD_EXT,
	optAvoidStringFormat: true,
};

export const EXT_ALL = [
	MagickFormat.Psd.toLowerCase(),
	MagickFormat.Xcf.toLowerCase(),
	// MagickFormat.Tga.toLowerCase(),
	"tif",
	"tiff",
	"dcm",
	"dds",
	"hdr",
	"heic",
	"mng",
	"pbm",
	"pcx",
	"pfm",
	"pgm",
	"pnm",
	"ppm",
	"sgi",
	"xbm",
];

export const isImageTFile = (file: TAbstractFile) => {
	return isTFile(file, EXT_ALL);
};

// Remember to rename these classes and interfaces!
export interface ImgMagicianPluginSettings {
	exportRelativePath: boolean;
	exportDirAbs: string;
	exportDirRel: string;

	fileNamePrefix: string;
	fileNameSuffix: string;

	autoEmbedMarkdownGen: boolean;
	autoPngGen: boolean;
	autoJpgGen: boolean;
}

export const DEFAULT_SETTINGS: ImgMagicianPluginSettings = {
	exportRelativePath: true,
	exportDirAbs: "Psd Support",
	exportDirRel: "",

	fileNamePrefix: "",
	fileNameSuffix: ".exported",
	autoEmbedMarkdownGen: true,
	autoJpgGen: true,
	autoPngGen: true,
};

export class SettingsUtil {
	getExportFormats = (settings: ImgMagicianPluginSettings): FileFormat[] => {
		const exportFormats: FileFormat[] = [];
		if (settings.autoEmbedMarkdownGen) {
			exportFormats.push(EMBED_PSD_FORMAT);
		}
		if (settings.autoPngGen) {
			exportFormats.push(imageFormatMap.png);
		}
		if (settings.autoJpgGen) {
			exportFormats.push(imageFormatMap.jpg);
		}
		return exportFormats;
	};
}
