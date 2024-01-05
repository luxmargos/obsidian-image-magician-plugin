export type ExportFormat = {
	display?: string;
	mimeType: string;
	ext: string;
};

export const ExportFormatPng: ExportFormat = {
	display: "PNG",
	mimeType: "image/png",
	ext: "png",
};

export const ExportFormatJpg: ExportFormat = {
	display: "JPEG",
	mimeType: "image/jpeg",
	ext: "jpg",
};

export const ExportFormatWebp: ExportFormat = {
	display: "WEBP",
	mimeType: "image/webp",
	ext: "webp",
};

export const exportFormatMap: Record<"png" | "jpg" | "webp", ExportFormat> = {
	png: ExportFormatPng,
	jpg: ExportFormatJpg,
	webp: ExportFormatWebp,
};

export const exportFormatList: ExportFormat[] = [
	ExportFormatPng,
	ExportFormatJpg,
	ExportFormatWebp,
];

export type ExportPathData = {
	src: {
		name: string;
		nameWithoutExt: string;
		ext: string;
	};
	dst: {
		path: string;
		name: string;
	};
};
