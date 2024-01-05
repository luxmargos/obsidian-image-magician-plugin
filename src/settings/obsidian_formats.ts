// Markdown files: md
// Image files: avif, bmp, gif, jpeg, jpg, png, svg, webp
// Audio files: flac, m4a, mp3, ogg, wav, webm, 3gp
// Video files: mkv, mov, mp4, ogv, webm
// PDF files: pdf

export const OBSIDIAN_NATIVE_IMAGE_FORMATS_OLD: string[] = [
	// image
	"bmp",
	"gif",
	"jpeg",
	"jpg",
	"png",
	"svg",
	"webp",
];

export const OBSIDIAN_NATIVE_IMAGE_FORMATS_1_5_3: string[] = [
	// image
	"avif",
	"bmp",
	"gif",
	"jpeg",
	"jpg",
	"png",
	"svg",
	"webp",
];
// https://help.obsidian.md/Files+and+folders/Accepted+file+formats
export const WARN_LIST_OLD: string[] = [
	"md",
	...OBSIDIAN_NATIVE_IMAGE_FORMATS_OLD,
	// audio
	"flac",
	"m4a",
	"mp3",
	"ogg",
	"wav",
	"webm",
	"3gp",
	//video
	"mkv",
	"mov",
	"mp4",
	"ogv",
	"webm",
	//etc
	"pdf",
];

export const WARN_LIST_1_5_3: string[] = [
	"md",
	//image
	...OBSIDIAN_NATIVE_IMAGE_FORMATS_1_5_3,
	//audio
	"flac",
	"m4a",
	"mp3",
	"ogg",
	"wav",
	"webm",
	"3gp",
	//video
	"mkv",
	"mov",
	"mp4",
	"ogv",
	"webm",
	//etc
	"pdf",
];
