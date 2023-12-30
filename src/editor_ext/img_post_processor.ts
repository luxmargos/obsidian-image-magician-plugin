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
import { isEqual, uniqueId } from "lodash-es";
import { getCache, setCache } from "../img_cache";

export function normalImgHandler(
	context: MainPluginContext,
	contentDOM: HTMLElement,
	observer?: ImgkMutationObserver,
	cmView?: EditorView
) {
	const adapter = context.plugin.app.vault.adapter;
	const fsa: FileSystemAdapter | undefined =
		adapter instanceof FileSystemAdapter ? adapter : undefined;

	if (!fsa) {
		return;
	}

	const supportedFormats =
		context.plugin.settingsUtil.getRuntimeSupportedFormats();
	const imgEls = contentDOM.querySelectorAll("img");
	const basePath = fsa.getBasePath();

	for (let i = 0; i < imgEls.length; i++) {
		const imgEl = imgEls[i];
		handleImg(context, basePath, supportedFormats, imgEl, observer, cmView);
	}
}

export const handleImg = (
	context: MainPluginContext,
	basePath: string,
	supportedFormats: Set<string>,
	imgEl: HTMLElement,
	observer?: ImgkMutationObserver,
	cmView?: EditorView
) => {
	if (!(imgEl instanceof HTMLImageElement)) {
		return;
	}
	const src = imgEl.getAttribute("src");
	if (!src) {
		return;
	}

	if (!src.startsWith("app://")) {
		return;
	}

	let srcFile: TFile | undefined | null;

	const srcUrl = new URL(src);
	let fullResPath = decodeURIComponent(srcUrl.pathname);
	const ext = lowerCasedExtNameWithoutDot(fullResPath);
	if (ext.length < 1) {
		return;
	}

	let isSupportedExt = supportedFormats.has(ext);
	if (!isSupportedExt) {
		return;
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

		srcFile = findValutFile(context, valutRelativePath, true);
	}

	if (!srcFile) {
		return;
	}

	if (!isTFile(srcFile, supportedFormats)) {
		return;
	}

	const imgElParent = imgEl.parentElement;
	if (!imgElParent) {
		return;
	}
	let draw = !isLatestImgDrawnElement(imgEl, srcFile);

	if (!draw) {
		debug("pass redrawing");
		return;
	}

	const cache = getCache(srcFile);
	if (cache) {
		imgEl.src = cache;
	} else {
		drawImageOnElement(context, imgElParent, imgEl, srcFile);
	}

	attachImgFollower(context, imgEl, srcFile, observer);
};

export function isLatestImgDrawnElement(el: HTMLElement, file: TFile) {
	if (el.hasAttribute("data-imgk-plugin-mod-date")) {
		try {
			const modDate = Number(
				el.getAttribute("data-imgk-plugin-mod-date")
			);
			return modDate >= file.stat.mtime;
		} catch (e) {
			debug(e);
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

		const cache = getCache(srcFile);
		if (cache) {
			img.src = cache;
		} else {
			drawImageOnElement(context, internalEmbed, img, srcFile);
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

export function drawImageOnElement(
	context: MainPluginContext,
	containerElement: HTMLElement,
	img: HTMLImageElement,
	targetFile: TFile
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

					setCache(targetFile, burl);

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
		return;
	}

	// console.log("create overlay : ", imgOverlayId);
	imgOverlayEl = imgParent.createDiv({
		cls: "imgk-plugin-overlay",
		attr: { "data-imgk-overlay": imgOverlayId },
	});

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

	const realBoundFoundingDot = imgParent.createDiv({
		cls: "imgk-plugin-overlay-dot",
	});

	let lastUsedImgDomRect: DOMRect | undefined;
	let lastUsedParentDomRect: DOMRect | undefined;
	let lastUsedImgRect:
		| { x: number; y: number; width: number; height: number }
		| undefined;

	const followImg = () => {
		// real bounding element of absolute position
		const realLayoutBoundEl = findRealLayoutBound(realBoundFoundingDot);
		if (!realLayoutBoundEl) {
			return;
		}

		const imgDomRect = img.getBoundingClientRect();
		const parentDomRect = realLayoutBoundEl.getBoundingClientRect();

		if (lastUsedImgDomRect && lastUsedParentDomRect) {
			if (
				isEqual(imgDomRect, lastUsedImgDomRect) &&
				isEqual(parentDomRect, lastUsedParentDomRect)
			) {
				return;
			}
		}

		lastUsedImgDomRect = imgDomRect;
		lastUsedParentDomRect = parentDomRect;

		const imgRect = {
			x: imgDomRect.x - parentDomRect.x,
			y: imgDomRect.y - parentDomRect.y,
			width: imgDomRect.width,
			height: imgDomRect.height,
		};

		if (lastUsedImgRect && isEqual(lastUsedImgRect, imgRect)) {
			return;
		}

		lastUsedImgRect = imgRect;

		const newLeft = `${imgRect.x}px`;
		const newTop = `${imgRect.y}px`;
		const newWidth = `${imgRect.width}px`;
		const newHeight = `${imgRect.height}px`;

		imgOverlayEl!.style.left = newLeft;
		imgOverlayEl!.style.top = newTop;
		imgOverlayEl!.style.width = newWidth;
		imgOverlayEl!.style.height = newHeight;
	};

	followImg();

	let resizeOb: ResizeObserver;
	let additionalObDisconnector: (() => void) | undefined;
	let mainObDisconnector: (() => void) | undefined;
	const checkAndRunFollowImg = () => {
		//clear observers if img element has removed
		if (!img.isConnected) {
			if (mainObDisconnector) {
				mainObDisconnector();
			}
			if (additionalObDisconnector) {
				additionalObDisconnector();
			}
			if (resizeOb) {
				resizeOb.disconnect();
			}
			return;
		}

		if (img.isShown()) {
			followImg();
		}
	};

	resizeOb = new ResizeObserver((entries) => {
		checkAndRunFollowImg();
	});
	resizeOb.observe(img);

	additionalObDisconnector = observer?.addListener(() => {
		checkAndRunFollowImg();
	});

	mainObDisconnector = context.plugin.mainObserver.addListener(() => {
		checkAndRunFollowImg();
	});
}

const findRealLayoutBoundInner = (
	targetEl: HTMLElement,
	parentEl: HTMLElement | null | undefined,
	useRounding: boolean
): HTMLElement | undefined => {
	if (parentEl) {
		const parentBound = parentEl.getBoundingClientRect();
		const targetBound = targetEl.getBoundingClientRect();
		// console.log("compare : ", targetBound, parentBound, parentEl);

		let match = false;

		if (
			!useRounding &&
			parentBound.x === targetBound.x &&
			parentBound.y === targetBound.y
		) {
			match = true;
		}

		if (
			!match &&
			useRounding &&
			Math.round(parentBound.x) === Math.round(targetBound.x) &&
			Math.round(parentBound.y) === Math.round(targetBound.y)
		) {
			match = true;
		}
		if (match) {
			return parentEl;
		} else {
			return findRealLayoutBoundInner(
				targetEl,
				parentEl.parentElement,
				useRounding
			);
		}
	}

	return undefined;
};

const findRealLayoutBound = (targetEl: HTMLElement) => {
	let result = findRealLayoutBoundInner(
		targetEl,
		targetEl.parentElement,
		false
	);

	if (result) {
		return result;
	}

	return findRealLayoutBoundInner(targetEl, targetEl.parentElement, true);
};
