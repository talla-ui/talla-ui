import { app } from "talla-ui";

const SWAP_TIMEOUT = 500;
const BURST_LIMIT = 3;
const BURST_RESET_DELAY = 2000;
const THROTTLE_DELAY = 300;

type HistoryState = {
	_url?: string;
	_scroll?: number;
};

export function initializeSwap() {
	if (!history.state?._url) {
		let cur = window.location.href;
		history.replaceState({ _url: cur }, "", cur);
	}
	window.addEventListener("popstate", (e) => {
		if (e.state?._url) {
			swapPageAsync(e.state._url, e.state);
		} else if (!history.state?._url) {
			setTimeout(() => saveCurrent(), 10);
		}
	});
	initPage();
}

function initPage() {
	// add link event handler to swap prefetched
	let links = document.querySelectorAll('a:not([href^="http"],[href*="#"])');
	for (let elt of links) {
		elt.addEventListener("click", (e) => {
			if ((e as MouseEvent).ctrlKey || (e as MouseEvent).metaKey) return;
			e.preventDefault();
			swapPageAsync((elt as HTMLAnchorElement).href);
		});
		elt.addEventListener("mouseover", prefetch);
		elt.addEventListener("mousedown", prefetch);
	}

	// TODO: decide how to handle iframe samples, if any
	// // add iframe HTML source dynamically
	// let iframes: Iterable<HTMLIFrameElement> = document.querySelectorAll(
	// 	"iframe[data-samplejs]",
	// );
	// for (let iframe of iframes) {
	// 	let jsUrl = iframe.dataset.samplejs;
	// 	let doc = iframe.contentDocument!;
	// 	doc.write(`
	// 		<!DOCTYPE html><body></body>
	// 		<script src=\"/lib/talla-web.es2015.iife.min.js\"></script>
	// 		<script src="${jsUrl}"></script>
	// 	`);
	// 	doc.close();
	// }
}

let prefetched: { [url: string]: true | undefined } = {};
let burstCount = 0;
let burstResetTimer: unknown;
let throttleTimer: unknown;
let pendingPrefetch: string | undefined;

function prefetch(event: Event) {
	const url = (event.target as HTMLAnchorElement).href;
	if (!url || prefetched[url]) return;

	// prefetch quickly up to a limit
	clearTimeout(burstResetTimer as any);
	burstResetTimer = setTimeout(() => {
		burstCount = 0;
	}, BURST_RESET_DELAY);
	if (burstCount < BURST_LIMIT) {
		burstCount++;
		prefetched[url] = true;
		fetch(url).catch(() => {});
		return;
	}

	// if the user is moving quickly, debounce prefetches
	pendingPrefetch = url;
	if (throttleTimer) return;
	throttleTimer = setTimeout(() => {
		throttleTimer = undefined;
		if (pendingPrefetch && !prefetched[pendingPrefetch]) {
			prefetched[pendingPrefetch] = true;
			fetch(pendingPrefetch).catch(() => {});
		}
		pendingPrefetch = undefined;
	}, THROTTLE_DELAY);
}

export async function swapPageAsync(url: string, back?: HistoryState) {
	// save current scroll position
	if (!back && history.state?._url) saveCurrent();

	// load the HTML at the URL and try to swap the body
	let done = false;
	setTimeout(() => {
		if (!done) location.href = url;
		done = true;
	}, SWAP_TIMEOUT);
	try {
		let request = await fetch(url);
		if (request.ok) {
			let htmlText = await request.text();
			if (setPage(htmlText, url, back)) done = true;
		}
	} catch (err) {
		console.error(err);
	}

	// go to the URL normally
	if (!done) {
		location.href = url;
		done = true;
	}
}

function saveCurrent() {
	history.replaceState(
		{
			_url: location.href,
			_scroll: window.scrollY,
		},
		"",
		location.href,
	);
}

function setPage(text: string, url: string, back?: HistoryState) {
	let parser = new DOMParser();
	let doc = parser.parseFromString(text, "text/html");
	if (doc.body.className === "docpage") {
		if (!back) history.pushState({ _url: url }, "", url);
		let title = doc.title;
		document.title = title;
		document.documentElement.style.scrollBehavior = "initial";
		document.body.replaceWith(doc.body);
		app.renderer!.remount();
		initPage();
		(window as any).init_docspage?.();
		(window as any).init_icons?.();
		window.scrollTo(0, back?._scroll || 0);
		document.documentElement.style.scrollBehavior = "";
		return true;
	}
}
