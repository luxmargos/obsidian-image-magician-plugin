export class ImgkMutationObserver {
	private _callbacks: MutationCallback[] = [];
	private _observer: MutationObserver;

	constructor(target: HTMLElement, options?: MutationObserverInit) {
		this._observer = new MutationObserver(
			(mutations: MutationRecord[], observer: MutationObserver) => {
				for (const cb of this._callbacks) {
					cb(mutations, observer);
				}
			}
		);
		this._observer.observe(target, options);
	}

	addListener(callback: MutationCallback) {
		this._callbacks.push(callback);
	}
	removeListener(callback: MutationCallback) {
		this._callbacks.remove(callback);
	}
}
