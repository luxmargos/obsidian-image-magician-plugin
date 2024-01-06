import { TFile, normalizePath } from "obsidian";

import { EditorView } from "@codemirror/view";

import { findValutFile, isTFile } from "../vault_util";
import { MainPluginContext } from "../context";
import { PIE } from "../engines/imgEngines";

import { ImgkMutationObserver } from "./mutation_ob";
import { lowerCasedExtNameWithoutDot } from "../utils/obsidian_path";
import { debug } from "loglevel";
import { isEqual, uniqueId } from "lodash-es";
import { getCache, setCache } from "../img_cache";
import { ImgkPluginVaultBasedPathOptions } from "../settings/setting_types";

export function normalImgHandler(
	context: MainPluginContext,
	contentDOM: HTMLElement,
	observer?: ImgkMutationObserver,
	cmView?: EditorView
) {
	const settingsUtil = context.plugin.settingsUtil;
	const settings = settingsUtil.getSettingsRef();
	if (
		!settings.renderMarkdownImgTag &&
		!settings.vaultBasedPathSupporter.enabled
	) {
		return;
	}

	const supportedFormats = settingsUtil.getRuntimeSupportedFormats();
	const imgEls = contentDOM.querySelectorAll("img");

	for (let i = 0; i < imgEls.length; i++) {
		const imgEl = imgEls[i];

		if (settings.vaultBasedPathSupporter.enabled) {
			processVaultBasedPath(
				context,
				imgEl,
				settings.vaultBasedPathSupporter
			);
		}

		if (settings.renderMarkdownImgTag) {
			handleImg(context, supportedFormats, imgEl, observer, cmView);
		}
	}
}

const regexExpInlineLink = /\!?\[\[(.*)\]\]/;

export const processVaultBasedPath = (
	context: MainPluginContext,
	imgEl: HTMLImageElement,
	options: ImgkPluginVaultBasedPathOptions
) => {
	const src = imgEl.getAttribute("src");
	if (!src) {
		return;
	}

	let srcUrl: URL | undefined;
	try {
		srcUrl = new URL(src);
	} catch (err) {}

	//skip protocol string
	if (srcUrl) {
		return;
	}

	let srcPath: string = "";
	if (options.inlineLink) {
		const inlineLinkMatch = src.match(regexExpInlineLink);
		if (inlineLinkMatch && inlineLinkMatch.length > 1) {
			srcPath = inlineLinkMatch[1];
		}
	}

	if (!srcPath && options.plainText) {
		srcPath = src;
	}

	if (srcPath) {
		const srcFile = findValutFile(context, srcPath, false);
		if (srcFile) {
			const srcResPath =
				context.plugin.app.vault.getResourcePath(srcFile);
			debug(`processVaultBasedPath: ${srcUrl} => ${srcResPath}`);
			imgEl.src = srcResPath;
		}
	}
};

export const handleImg = (
	context: MainPluginContext,
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

	// desktop = "app://"
	// ios = "capacitor://"
	// android = ?
	if (src.indexOf("://") < 0) {
		return;
	}

	let srcUrl: URL | undefined;
	try {
		srcUrl = new URL(src);
	} catch (err) {}

	if (!srcUrl) {
		return;
	}

	if (context.plugin.baseResourcePathIdx < 0) {
		return;
	}

	let srcFile: TFile | undefined | null;
	let fullResPath = decodeURIComponent(srcUrl.pathname);

	if (fullResPath.length < context.plugin.baseResourcePathIdx) {
		return;
	}

	const ext = lowerCasedExtNameWithoutDot(fullResPath);
	if (ext.length < 1) {
		return;
	}

	let isSupportedExt = supportedFormats.has(ext);
	if (!isSupportedExt) {
		return;
	}

	let valutRelativePath = normalizePath(
		fullResPath.substring(context.plugin.baseResourcePathIdx)
	);

	srcFile = findValutFile(context, valutRelativePath, true);

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
		return;
	}

	const cache = getCache(srcFile);
	if (cache) {
		imgEl.src = cache;
	} else {
		drawImageOnElement(context, imgElParent, imgEl, srcFile);
	}

	if (context.plugin.settingsUtil.getSettingsRef().overrideDragAndDrop) {
		attachImgFollower(context, imgEl, srcFile, observer);
	}
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
	if (
		!context.plugin.settingsUtil.getSettingsRef().renderMarkdownInlineLink
	) {
		return;
	}

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
			if (!titleNode.classList.contains("imgk-plugin-hidden")) {
				titleNode.classList.add("imgk-plugin-hidden");
			}
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

		if (context.plugin.settingsUtil.getSettingsRef().overrideDragAndDrop) {
			attachImgFollower(context, img, srcFile, observer, internalEmbed);
		}
	}
}

function syncAttr(attr: string, srcEl: HTMLElement, dstEl: HTMLElement) {
	if (srcEl.hasAttribute(attr)) {
		const srcValue = srcEl.getAttribute(attr);
		if (srcValue !== null && srcValue !== undefined) {
			if (
				!dstEl.hasAttribute(attr) ||
				dstEl.getAttribute(attr) !== srcValue
			) {
				dstEl.setAttribute(attr, srcValue);
			}
		} else if (dstEl.hasAttribute(attr)) {
			dstEl.removeAttribute(attr);
		}
	} else if (dstEl.hasAttribute(attr)) {
		dstEl.removeAttribute(attr);
	}
}
export function applyContainerMdSize(
	followWidthAndHeight: boolean,
	containerEl: HTMLElement,
	targetElement: HTMLElement
) {
	if (followWidthAndHeight) {
		syncAttr("width", containerEl, targetElement);
		syncAttr("height", containerEl, targetElement);
	} else {
		if (targetElement.hasAttribute("width")) {
			targetElement.removeAttribute("width");
		}
		if (targetElement.hasAttribute("height")) {
			targetElement.removeAttribute("height");
		}
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

	PIE.getEngine(targetFile.extension)
		.drawOnCanvas(context, targetFile, cv)
		.then(() => {
			setImgTagImageWithCache(
				context.plugin.settingsUtil.getSettingsRef().useBlob,
				targetFile,
				img,
				cv!
			)
				.then(() => {
					cv!.remove();
				})
				.catch((err) => {
					cv!.remove();
				});
		})
		.catch((err) => {
			cv!.remove();
		});
}

export const setImgTagImageWithCache = (
	useBlob: boolean,
	file: TFile,
	imgEl: HTMLImageElement,
	canvasEl: HTMLCanvasElement
): Promise<void> => {
	return new Promise((resolve, reject) => {
		try {
			if (useBlob) {
				canvasEl.toBlob((blob) => {
					if (blob) {
						const burl = URL.createObjectURL(blob);
						imgEl.src = burl;
						setCache(file, burl);
					}
					resolve();
				});
			} else {
				const dataUrl: string = canvasEl.toDataURL();
				imgEl.src = dataUrl;
				setCache(file, dataUrl);
				resolve();
			}
		} catch (err) {
			resolve();
		}
	});
};

export function attachImgFollower(
	context: MainPluginContext,
	img: HTMLImageElement,
	file: TFile,
	observer?: ImgkMutationObserver,
	additionalClickerHTML?: HTMLElement
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

	if (additionalClickerHTML) {
		additionalClickerHTML.onClickEvent(
			(e) => {
				// imgOverlayEl!.click();
				// img.click();
				// e.stopImmediatePropagation();
				e.stopPropagation();
				// e.preventDefault();

				return false;
			},
			{
				capture: true,
				passive: false,
			}
		);
	}
	imgOverlayEl.draggable = true;
	const resPath = context.plugin.app.vault.getResourcePath(file);
	imgOverlayEl.setAttribute("src", resPath);
	imgOverlayEl.setAttribute("alt", file.path);

	imgOverlayEl.addEventListener("dragstart", (e) => {
		// e.dataTransfer?.setData("line", file.path);
		// e.dataTransfer?.setData("link", file.path);
		// e.dataTransfer?.setData("embeddable", file.path);
		//this is important
		e.dataTransfer?.setData("text/plain", `![[${file.path}]]`);
		// e.dataTransfer?.setData("src", `${file.path}`);
		e.dataTransfer?.setData("text/uri-list", file.path);
		// e.dataTransfer?.setData("file", file.path);
		// e.dataTransfer?.setData("files", file.path);
	});

	//pasthrough click event to img tag to Trigger Image Toolkit. For now, this works
	//about to <img> tag. Not works for inline link.
	imgOverlayEl.addEventListener("click", (evt) => {
		img.click();
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

		const offsetWidth = img.offsetWidth;
		const offsetHeight = img.offsetHeight;

		//detect html element is scaled!
		if (imgRect.width !== offsetWidth || imgRect.height !== offsetHeight) {
			const scaleX = offsetWidth / imgRect.width;
			const scaleY = offsetHeight / imgRect.height;

			imgRect.x = imgRect.x * scaleX;
			imgRect.y = imgRect.y * scaleY;
			imgRect.width = imgRect.width * scaleX;
			imgRect.height = imgRect.height * scaleY;
		}

		if (lastUsedImgRect && isEqual(lastUsedImgRect, imgRect)) {
			return;
		}

		lastUsedImgRect = imgRect;

		const newLeft = `${imgRect.x}px`;
		const newTop = `${imgRect.y}px`;
		const newWidth = `${imgRect.width}px`;
		const newHeight = `${imgRect.height}px`;

		// /skip : obsidian. This code is intentionally designed for dynamic positioning.
		imgOverlayEl!.style.left = newLeft;
		// /skip : obsidian. This code is intentionally designed for dynamic positioning.
		imgOverlayEl!.style.top = newTop;
		// /skip : obsidian. This code is intentionally designed for dynamic positioning.
		imgOverlayEl!.style.width = newWidth;
		// /skip : obsidian. This code is intentionally designed for dynamic positioning.
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

	img.addEventListener("load", (evt) => {
		checkAndRunFollowImg();
	});
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
