//#region scripts/static-docs/guided-browser.ts
const guide = document.querySelector("#try-a-change");
if (guide) {
	const get = (selector) => guide.querySelector(selector);
	const review = get("[data-review]"), proposal = get("[data-proposal]"), reset = get("[data-reset]"), status = get("[data-status]"), keep = get("[data-keep]"), dialog = guide.querySelector("dialog");
	const items = Array.from(guide.querySelectorAll("[data-item]"));
	const original = status.textContent;
	let selected;
	review.hidden = false;
	review.addEventListener("click", () => {
		review.hidden = true;
		proposal.hidden = false;
		status.textContent = "Proposed change. Your reading list is unchanged.";
		keep.focus();
	});
	keep.addEventListener("click", () => {
		proposal.hidden = true;
		review.hidden = false;
		review.textContent = "Review again";
		status.textContent = "Original kept. Both items and the editor are unchanged.";
		review.focus();
	});
	get("[data-approve]").addEventListener("click", () => {
		proposal.hidden = true;
		reset.hidden = false;
		for (const item of items) item.querySelector("button").hidden = false;
		status.textContent = "Approved editor. Both items remain. Try removing one.";
		items[0]?.querySelector("button")?.focus();
	});
	for (const item of items) item.querySelector("button").addEventListener("click", () => {
		selected = item;
		status.textContent = "Confirm or cancel removal of this sample item.";
		get("[data-subject]").textContent = item.querySelector("span").textContent;
		dialog.returnValue = "cancel";
		dialog.showModal();
		dialog.querySelector("button")?.focus();
	});
	dialog.addEventListener("close", () => {
		if (!selected) return;
		if (dialog.returnValue === "remove") {
			selected.hidden = true;
			status.textContent = "Item removed from this sample.";
			(items.find((i) => !i.hidden)?.querySelector("button") ?? reset).focus();
		} else {
			status.textContent = "Removal canceled. Your item remains.";
			selected.querySelector("button")?.focus();
		}
		selected = void 0;
	});
	reset.addEventListener("click", () => {
		for (const item of items) {
			item.hidden = false;
			item.querySelector("button").hidden = true;
		}
		reset.hidden = true;
		review.hidden = false;
		review.textContent = "Review the change";
		status.textContent = original;
		guide.querySelector("details").open = false;
		review.focus();
	});
}
//#endregion
//#region packages/docs-content/src/search.ts
const searchTokens = (s) => [...new Set(s.replace(/[A-Z]/g, (c) => c.toLowerCase()).split(/[^a-z0-9]+/).filter(Boolean))];
function searchContent(index, input) {
	const query = searchTokens(input);
	if (!query.length) return [];
	return index.filter((e) => query.every((t) => e.titleTokens.includes(t) || e.headingTokens.includes(t) || e.bodyTokens.includes(t))).map((e) => ({
		e,
		rank: [
			e.titleTokens,
			e.headingTokens,
			e.bodyTokens
		].map((field) => query.filter((t) => field.includes(t)).length)
	})).toSorted((a, b) => b.rank[0] - a.rank[0] || b.rank[1] - a.rank[1] || b.rank[2] - a.rank[2] || a.e.order - b.e.order).slice(0, 20).map(({ e }) => ({
		id: e.id,
		slug: e.slug,
		title: e.title,
		excerpt: e.excerpt
	}));
}
function validBrowserQuery(value) {
	return value.isWellFormed() && Array.from(value).length <= 128 && new TextEncoder().encode(value).length <= 512 && !/[\u0000-\u001f\u007f]/.test(value);
}
//#endregion
//#region scripts/static-docs/browser.ts
function isSearchData(value) {
	if (typeof value !== "object" || value === null || !("index" in value) || !("emptyText" in value) || !("noResultsText" in value) || typeof value.emptyText !== "string" || typeof value.noResultsText !== "string" || !Array.isArray(value.index) || value.index.length > 256) return false;
	return value.index.every((row) => {
		if (typeof row !== "object" || row === null) return false;
		for (const key of [
			"id",
			"slug",
			"title",
			"excerpt"
		]) if (!(key in row) || typeof row[key] !== "string") return false;
		if (!("order" in row) || !Number.isSafeInteger(row.order) || row.order < 0 || row.order > 255) return false;
		for (const key of [
			"titleTokens",
			"headingTokens",
			"bodyTokens"
		]) if (!(key in row) || !Array.isArray(row[key]) || !row[key].every((token) => typeof token === "string" && /^[a-z0-9]+$/.test(token))) return false;
		return true;
	});
}
const output = document.querySelector("#static-search-results");
if (output) {
	const base = new URL("../", import.meta.url);
	fetch(new URL("assets/search.json", base)).then((r) => {
		if (!r.ok) throw Error("search-unavailable");
		return r.json();
	}).then((input) => {
		if (!isSearchData(input)) throw Error("invalid-search-index");
		const data = input;
		const query = new URL(location.href).searchParams.get("q") ?? "";
		const searchInput = document.querySelector("#site-query");
		if (searchInput) searchInput.value = query;
		output.replaceChildren();
		const message = (text) => {
			const p = document.createElement("p");
			p.className = "docs-lead";
			p.textContent = text;
			output.append(p);
		};
		if (!validBrowserQuery(query)) {
			message("Search unavailable: invalid query.");
			return;
		}
		const hits = searchContent(data.index, query);
		if (!query.trim()) {
			message(data.emptyText);
			return;
		}
		if (!hits.length) {
			message(data.noResultsText);
			return;
		}
		const list = document.createElement("ol");
		list.className = "docs-results";
		list.setAttribute("aria-label", "Search results");
		for (const hit of hits) {
			const item = document.createElement("li"), link = document.createElement("a");
			link.href = new URL("docs/" + encodeURIComponent(hit.slug) + "/", base).href;
			for (const [kind, text] of [["title", hit.title], ["excerpt", hit.excerpt]]) {
				const span = document.createElement("span");
				span.className = "docs-result-" + kind;
				span.textContent = text;
				link.append(span);
			}
			item.append(link);
			list.append(item);
		}
		output.append(list);
	}).catch(() => {
		output.textContent = "Search is unavailable. Browse the documentation navigation or retry later.";
	});
}
//#endregion
