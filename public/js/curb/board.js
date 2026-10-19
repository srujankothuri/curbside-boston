import { el } from "../shared/dom.js";
import { renderLayout } from "../shared/layout.js";
import { CATEGORIES } from "../shared/lists.js";
import { confirmAction } from "../shared/confirmDialog.js";
import { fillSelect, fillNeighborhoodSelect } from "../shared/selectOptions.js";
import { fetchItems, markTaken, markAvailable, deleteItem } from "./api.js";
import { timeAgo, freshnessLabel } from "./freshness.js";

const FLASH_KEY = "curbside-flash";

const form = document.querySelector("#filters");
const neighborhoodSelect = document.querySelector("#filter-neighborhood");
const categorySelect = document.querySelector("#filter-category");
const postedSelect = document.querySelector("#filter-posted");
const takenCheckbox = document.querySelector("#filter-taken");
const bannerArea = document.querySelector("#banner-area");
const resultsCount = document.querySelector("#results-count");
const results = document.querySelector("#results");
const pagination = document.querySelector("#pagination");

let currentPage = 1;

// ---------- Filters and the page address ----------

function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  neighborhoodSelect.value = params.get("neighborhood") || "";
  categorySelect.value = params.get("category") || "";
  postedSelect.value = params.get("posted") || "";
  takenCheckbox.checked = params.get("taken") === "1";
  currentPage = Number.parseInt(params.get("page"), 10) || 1;
}

function buildParams() {
  const params = new URLSearchParams();
  if (neighborhoodSelect.value) {
    params.set("neighborhood", neighborhoodSelect.value);
  }
  if (categorySelect.value) params.set("category", categorySelect.value);
  if (postedSelect.value) params.set("posted", postedSelect.value);
  if (takenCheckbox.checked) params.set("taken", "1");
  if (currentPage > 1) params.set("page", String(currentPage));
  return params;
}

function saveStateToUrl() {
  const query = buildParams().toString();
  const url = query ? `?${query}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}

// ---------- Banners ----------

function showBanner(message, type = "success") {
  const banner = el(
    "div",
    {
      className: `banner banner-${type}`,
      role: type === "error" ? "alert" : "status",
    },
    el("span", {}, message),
    el(
      "button",
      {
        type: "button",
        className: "banner-close",
        "aria-label": "Dismiss message",
        onClick: () => banner.remove(),
      },
      "×"
    )
  );
  bannerArea.replaceChildren(banner);
}

function showFlashFromPreviousPage() {
  const message = sessionStorage.getItem(FLASH_KEY);
  if (message) {
    sessionStorage.removeItem(FLASH_KEY);
    showBanner(message);
  }
}

// ---------- Card actions ----------

async function runAction(action, successMessage) {
  try {
    await action();
    showBanner(successMessage);
  } catch (error) {
    showBanner(error.message, "error");
  }
  await loadItems();
}

async function handleMarkTaken(item) {
  const confirmed = await confirmAction({
    title: "Mark this item as taken?",
    message: `"${item.title}" will be hidden from the board, so nobody makes a wasted trip.`,
    confirmLabel: "Mark as taken",
  });
  if (confirmed) {
    await runAction(() => markTaken(item._id), "Marked as taken.");
  }
}

async function handleMarkAvailable(item) {
  await runAction(
    () => markAvailable(item._id),
    "Your item is back on the board."
  );
}

async function handleDelete(item) {
  const confirmed = await confirmAction({
    title: "Delete this item?",
    message: `"${item.title}" will be removed for good. This can't be undone.`,
    confirmLabel: "Delete",
  });
  if (confirmed) {
    await runAction(() => deleteItem(item._id), "Your post is deleted.");
  }
}

// ---------- Rendering ----------

function renderCard(item) {
  const tape = freshnessLabel(item);
  const isTaken = item.status === "taken";
  const poster =
    item.postedBy === "spotter" ? "Spotted by a neighbor" : "Left by the owner";

  const actions = [];
  if (!isTaken) {
    actions.push(
      el(
        "button",
        {
          type: "button",
          className: "btn btn-outline",
          onClick: () => handleMarkTaken(item),
        },
        "Mark as taken"
      )
    );
  }
  if (item.isOwner && isTaken) {
    actions.push(
      el(
        "button",
        {
          type: "button",
          className: "btn btn-secondary",
          onClick: () => handleMarkAvailable(item),
        },
        "Mark available again"
      )
    );
  }
  if (item.isOwner && !isTaken) {
    actions.push(
      el(
        "a",
        {
          className: "btn btn-secondary",
          href: `post-item.html?id=${encodeURIComponent(item._id)}`,
        },
        "Edit"
      )
    );
  }
  if (item.isOwner) {
    actions.push(
      el("span", { className: "spacer" }),
      el(
        "button",
        {
          type: "button",
          className: "btn btn-danger",
          onClick: () => handleDelete(item),
        },
        "Delete"
      )
    );
  }

  const classes = ["card"];
  if (item.isOwner) classes.push("card-own");
  if (isTaken) classes.push("card-muted");

  return el(
    "li",
    {},
    el(
      "article",
      { className: classes.join(" ") },
      el("span", { className: `tape ${tape.className}` }, tape.text),
      item.isOwner
        ? el("span", { className: "owner-label" }, "Your post")
        : null,
      el("h3", {}, item.title),
      el(
        "ul",
        { className: "chips", "aria-label": "Category and condition" },
        el("li", {}, item.category),
        el("li", {}, item.condition)
      ),
      el(
        "p",
        { className: "card-location" },
        el("strong", {}, item.neighborhood),
        el("span", {}, item.street)
      ),
      item.description
        ? el("p", { className: "card-description" }, item.description)
        : null,
      el(
        "p",
        { className: "card-meta" },
        `${poster}, ${timeAgo(item.createdAt)}`
      ),
      actions.length ? el("div", { className: "card-actions" }, actions) : null
    )
  );
}

function renderState(message, buttonLabel, onClick) {
  results.replaceChildren(
    el(
      "div",
      { className: "state-message" },
      el("p", {}, message),
      buttonLabel
        ? el(
            "button",
            { type: "button", className: "btn btn-secondary", onClick },
            buttonLabel
          )
        : null
    )
  );
}

function renderPagination(page, totalPages) {
  if (totalPages <= 1) {
    pagination.replaceChildren();
    return;
  }

  const goTo = (target) => {
    currentPage = target;
    saveStateToUrl();
    loadItems();
    resultsCount.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  pagination.replaceChildren(
    el(
      "button",
      {
        type: "button",
        className: "btn btn-secondary",
        disabled: page <= 1,
        onClick: () => goTo(page - 1),
      },
      "Previous"
    ),
    el(
      "span",
      { className: "pagination-status" },
      `Page ${page} of ${totalPages}`
    ),
    el(
      "button",
      {
        type: "button",
        className: "btn btn-secondary",
        disabled: page >= totalPages,
        onClick: () => goTo(page + 1),
      },
      "Next"
    )
  );
}

function renderResults(data) {
  currentPage = data.page;
  saveStateToUrl();

  if (data.total === 0) {
    resultsCount.textContent = "No items match these filters.";
    renderState(
      "Nothing here right now. Try a wider area or a longer time range.",
      "Clear filters",
      clearFilters
    );
    pagination.replaceChildren();
    return;
  }

  const first = (data.page - 1) * data.pageSize + 1;
  const last = first + data.items.length - 1;
  resultsCount.textContent = `Showing ${first} to ${last} of ${data.total.toLocaleString()} items`;

  results.replaceChildren(
    el("ul", { className: "card-grid" }, data.items.map(renderCard))
  );
  renderPagination(data.page, data.totalPages);
}

async function loadItems() {
  resultsCount.textContent = "Loading items…";
  try {
    const data = await fetchItems(buildParams());
    renderResults(data);
  } catch (error) {
    resultsCount.textContent = "";
    renderState(error.message, "Try again", loadItems);
    pagination.replaceChildren();
  }
}

function clearFilters() {
  neighborhoodSelect.value = "";
  categorySelect.value = "";
  postedSelect.value = "";
  takenCheckbox.checked = false;
  currentPage = 1;
  saveStateToUrl();
  loadItems();
}

// ---------- Start ----------

renderLayout("Curb Board");
fillNeighborhoodSelect(neighborhoodSelect, "All neighborhoods");
fillSelect(categorySelect, CATEGORIES, "All categories");
readStateFromUrl();
showFlashFromPreviousPage();

form.addEventListener("change", () => {
  currentPage = 1;
  saveStateToUrl();
  loadItems();
});

form.addEventListener("submit", (event) => event.preventDefault());

form.addEventListener("reset", (event) => {
  event.preventDefault();
  clearFilters();
});

loadItems();
