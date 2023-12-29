import {
	App,
	Editor,
	FileSystemAdapter,
	TAbstractFile,
	TFile,
	editorEditorField,
	editorInfoField,
	editorLivePreviewField,
} from "obsidian";

import {
	EditorView,
	ViewPlugin,
	ViewUpdate,
	Decoration,
	DecorationSet,
} from "@codemirror/view";

import { findValutFile, isTFile } from "../vault_util";
import { MainPluginContext } from "../context";
import { PIE } from "../engines/imgEngines";

import { ImgkMutationObserver } from "./mutation_ob";
import { lowerCasedExtNameWithoutDot } from "../utils/obsidian_path";
import { debug } from "loglevel";
import { uniqueId } from "lodash-es";

export function normalImgHandler(
	context: MainPluginContext,
	contentDOM: HTMLElement,
	observer?: ImgkMutationObserver,
	cmView?: EditorView
) {
	const supportedFormats =
		context.plugin.settingsUtil.getRuntimeSupportedFormats();
	const imgEls = contentDOM.querySelectorAll("img");

	const adapter = context.plugin.app.vault.adapter;
	const fsa: FileSystemAdapter | undefined =
		adapter instanceof FileSystemAdapter ? adapter : undefined;

	if (!fsa) {
		return;
	}

	const basePath = fsa.getBasePath();

	for (let i = 0; i < imgEls.length; i++) {
		const imgEl = imgEls[i];
		if (!(imgEl instanceof HTMLImageElement)) {
			continue;
		}
		const src = imgEl.getAttribute("src");
		if (!src) {
			continue;
		}

		if (!src.startsWith("app://")) {
			continue;
		}

		let srcFile: TFile | undefined | null;

		const srcUrl = new URL(src);
		let fullResPath = decodeURIComponent(srcUrl.pathname);
		const ext = lowerCasedExtNameWithoutDot(fullResPath);
		if (ext.length < 1) {
			continue;
		}

		let isSupportedExt = supportedFormats.includes(ext);
		if (!isSupportedExt) {
			continue;
		}

		const basePathIdx = fullResPath.indexOf(basePath);
		if (basePathIdx >= 0) {
			let valutRelativePath = fullResPath.substring(
				basePathIdx + basePath.length
			);

			//remove slash start
			if (valutRelativePath.startsWith("/")) {
				valutRelativePath = valutRelativePath.substring(1);
			}

			console.log("valutRelativePath", valutRelativePath);
			srcFile = findValutFile(context, valutRelativePath, true);
		}

		if (!srcFile) {
			continue;
		}

		if (!isTFile(srcFile, supportedFormats)) {
			continue;
		}

		const imgElParent = imgEl.parentElement;
		if (!imgElParent) {
			continue;
		}
		let draw = !isLatestImgDrawnElement(imgEl, srcFile);

		if (!draw) {
			debug("pass redrawing");
			continue;
		}

		const cacheString = createCacheString(srcFile);
		if (cacheString in imgCaches) {
			imgEl.src = imgCaches[cacheString];
			console.log("reuse cache");
		} else {
			drawImageOnElement(context, imgElParent, imgEl, srcFile, observer);
		}
		attachImgFollower(context, imgEl, srcFile, observer);
	}
}

export function isLatestImgDrawnElement(el: HTMLElement, file: TFile) {
	if (el.hasAttribute("data-imgk-plugin-mod-date")) {
		try {
			const modDate = Number(
				el.getAttribute("data-imgk-plugin-mod-date")
			);
			return modDate >= file.stat.mtime;
		} catch (e) {
			console.log(e);
		}
	}
	return false;
}

export function signModDate(el: HTMLElement, file: TFile) {
	el.setAttribute("data-imgk-plugin-mod-date", String(file.stat.mtime));
}

export function linkedImgHandler(
	context: MainPluginContext,
	contentDOM: HTMLElement,
	observer?: ImgkMutationObserver,
	cmView?: EditorView
) {
	// return Decoration.none;

	const internalEmbeds = contentDOM.querySelectorAll(".internal-embed");
	const supportedFormats =
		context.plugin.settingsUtil.getRuntimeSupportedFormats();

	for (let i = 0; i < internalEmbeds.length; i++) {
		const internalEmbed = internalEmbeds[i];
		if (!(internalEmbed instanceof HTMLElement)) {
			continue;
		}
		const src = internalEmbed.getAttribute("src");
		if (!src) {
			continue;
		}

		const srcFile = findValutFile(context, src, false);
		if (!srcFile) {
			continue;
		}
		if (!isTFile(srcFile, supportedFormats)) {
			continue;
		}

		let img: HTMLImageElement | null = internalEmbed.querySelector(
			"img.imgk-plugin-item"
		);

		// if (!img) {
		// 	let normalImg: HTMLImageElement | null =
		// 		internalEmbed.querySelector("img");
		// 	if (normalImg) {
		// 		img = normalImg;
		// 	}
		// }

		//apply size without redrawing
		if (img) {
			applyContainerMdSize(
				context.plugin.settings.supportMdImageSizeFormat,
				internalEmbed,
				img
			);
		}

		let draw = true;
		if (img) {
			draw = !isLatestImgDrawnElement(img, srcFile);
		} else {
			img = internalEmbed.createEl("img", {
				cls: "imgk-plugin-item",
			});
		}

		// pass redrawing
		if (!draw) {
			continue;
		}

		applyContainerMdSize(
			context.plugin.settings.supportMdImageSizeFormat,
			internalEmbed,
			img
		);

		const titleNode = internalEmbed.querySelector(".file-embed-title");
		if (titleNode && titleNode instanceof HTMLElement) {
			titleNode.style.height = "0px";
			titleNode.style.opacity = "0";
			titleNode.style.pointerEvents = "none";
		}

		// disable navigate to file on click
		if (context.plugin.settings.disbleClickToNavigate) {
			internalEmbed.onClickEvent(
				(e) => {
					console.log;
					// e.stopImmediatePropagation();
					e.stopPropagation();
					e.preventDefault();
					return false;
				},
				{
					capture: true,
					passive: false,
				}
			);
		}

		internalEmbed.classList.remove("file-embed");
		internalEmbed.classList.add("image-embed");
		internalEmbed.classList.add("media-embed");

		const cacheString = createCacheString(srcFile);
		if (cacheString in imgCaches) {
			img.src = imgCaches[cacheString];
			console.log("reuse cache");
		} else {
			drawImageOnElement(context, internalEmbed, img, srcFile, observer);
		}
		attachImgFollower(context, img, srcFile, observer);
	}
}

export function applyContainerMdSize(
	apply: boolean,
	containerEl: HTMLElement,
	targetElement: HTMLElement
) {
	if (apply) {
		// [[IMAGE | 100]] markdown will represent as container width attribute.
		const containerWidth = containerEl.getAttribute("width");
		if (containerWidth) {
			targetElement.setAttribute("width", containerWidth);
		} else {
			targetElement.removeAttribute("width");
		}
	} else {
		targetElement.removeAttribute("width");
	}
}

const imgCaches: Record<string, string> = {};
const createCacheString = (file: TFile) => {
	return `${file.path}_${file.stat.mtime}`;
};

export function drawImageOnElement(
	context: MainPluginContext,
	containerElement: HTMLElement,
	img: HTMLImageElement,
	targetFile: TFile,
	observer?: ImgkMutationObserver
) {
	//disable img click
	// img.style.pointerEvents = "none";

	signModDate(img, targetFile);

	let cv: HTMLCanvasElement | null = containerElement.querySelector(
		"canvas.imgk-plugin-item"
	);
	if (!cv) {
		cv = containerElement.createEl("canvas", {
			cls: "imgk-plugin-item",
		});
	}

	PIE.magick()
		.drawOnCanvas(context, targetFile, cv)
		.then(() => {
			cv!.toBlob((blob) => {
				if (blob) {
					const burl = URL.createObjectURL(blob);
					img!.src = burl;

					imgCaches[createCacheString(targetFile)] = burl;

					// attachImgFollower(context, img!, targetFile, observer);
				}
			});
			// img!.src = canvasElement.toDataURL();
			// canvasElement.remove();
			cv!.remove();
		})
		.catch((err) => {
			cv!.remove();
		});
}

export function attachImgFollower(
	context: MainPluginContext,
	img: HTMLImageElement,
	file: TFile,
	observer?: ImgkMutationObserver
) {
	const imgParent = img.parentElement;
	if (!imgParent) {
		return;
	}

	let imgOverlayId = img.getAttribute("data-imgk-overlay");
	if (!imgOverlayId) {
		imgOverlayId = uniqueId();
		img.setAttribute("data-imgk-overlay", imgOverlayId);
	}

	let imgOverlayEl: HTMLElement | undefined;
	let imgOverEls = imgParent.querySelectorAll("div.imgk-plugin-overlay");
	for (let i = 0; i < imgOverEls.length; i++) {
		const el = imgOverEls[i];
		if (!(el instanceof HTMLElement)) {
			continue;
		}

		if (el.getAttribute("data-imgk-overlay") === imgOverlayId) {
			imgOverlayEl = el;
			break;
		}
	}

	if (imgOverlayEl) {
		console.log("imgOverlay already exists!!");
		return;
	}

	// console.log("create overlay : ", imgOverlayId);
	imgOverlayEl = imgParent.createDiv({
		cls: "imgk-plugin-overlay",
		attr: { "data-imgk-overlay": imgOverlayId },
	});

	// imgOverlayEl = document.body.createDiv({
	// 	cls: "imgk-plugin-overlay",
	// 	attr: { "data-imgk-overlay": imgOverlayId },
	// });

	imgOverlayEl.draggable = true;
	const resPath = context.plugin.app.vault.getResourcePath(file);
	imgOverlayEl.setAttribute("src", resPath);
	imgOverlayEl.setAttribute("alt", file.path);

	imgOverlayEl.addEventListener("dragstart", (e) => {
		e.dataTransfer?.setData("line", file.path);
		e.dataTransfer?.setData("link", file.path);
		//this is important
		e.dataTransfer?.setData("text/plain", `![[${file.path}]]`);
		e.dataTransfer?.setData("src", `${file.path}`);
		e.dataTransfer?.setData("text/uri-list", file.path);
	});

	const followImg = () => {
		const newLeft = `${img.offsetLeft}px`;
		const newTop = `${img.offsetTop}px`;
		const newWidth = `${img.offsetWidth}px`;
		const newHeight = `${img.offsetHeight}px`;

		// const newLeft = `${img.getBoundingClientRect().left}px`;
		// const newTop = `${img.getBoundingClientRect().top}px`;
		// const newWidth = `${img.offsetWidth}px`;
		// const newHeight = `${img.offsetHeight}px`;

		let hasChanges = false;
		if (newLeft !== imgOverlayEl!.style.left) {
			hasChanges = true;
			imgOverlayEl!.style.left = newLeft;
		}
		if (newTop !== imgOverlayEl!.style.top) {
			hasChanges = true;
			imgOverlayEl!.style.top = newTop;
		}

		if (newWidth !== imgOverlayEl!.style.width) {
			hasChanges = true;
			imgOverlayEl!.style.width = newWidth;
		}
		if (newHeight !== imgOverlayEl!.style.height) {
			hasChanges = true;
			imgOverlayEl!.style.height = newHeight;
		}

		console.log(
			"followImg ",
			img.src,
			img,
			imgOverlayEl,
			img.getClientRects(),
			img.getBoundingClientRect(),
			img.offsetLeft,
			img.offsetTop,
			img.offsetWidth,
			img.offsetHeight,
			img.clientLeft,
			img.clientTop,
			img.clientWidth,
			img.clientHeight
		);

		return hasChanges;
	};

	let infinityLoopAvoider: boolean = false;

	img.addEventListener("touchstart", () => {
		followImg();
	});
	img.addEventListener("mouseover", () => {
		console.log("mouse over");
		followImg();
	});
	const lazyFollowImg = () => {
		followImg();

		if (infinityLoopAvoider) {
			return false;
		}

		infinityLoopAvoider = true;

		// setTimeout(followImg, 0);
		// setTimeout(followImg, 300);
		// setTimeout(followImg, 600);
		// setTimeout(() => {
		// 	infinityLoopAvoider = false;
		// }, 1001);
	};

	followImg();
	const resizeOb = new ResizeObserver((entries) => {
		lazyFollowImg();
	});
	resizeOb.observe(img);
	observer?.addListener(lazyFollowImg);

	// new ImgkMutationObserver(img, {
	// 	attributes: true,
	// }).addListener(lazyFollowImg);

	const mo = new MutationObserver(
		(mutations: MutationRecord[], observer: MutationObserver) => {
			for (const mu of mutations) {
				for (let i = 0; i < mu.removedNodes.length; i++) {
					if (mu.removedNodes[i] === img) {
						console.log("removed");
						observer.disconnect();
						imgOverlayEl?.remove();
					}
				}
			}
		}
	);

	mo.observe(imgParent, { childList: true, subtree: true });

	// new ImgkMutationObserver(imgParent, {
	// 	childList: true,
	// 	subtree: true,
	// 	attributes: true,
	// 	characterData: true,
	// }).addListener(lazyFollowImg);
}
