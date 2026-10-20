import { el } from "../shared/dom.js";
import { renderLayout } from "../shared/layout.js";
import { CATEGORIES } from "../shared/lists.js";
import { confirmAction } from "../shared/confirmDialog.js";
import { fillSelect, fillNeighborhoodSelect } from "../shared/selectOptions.js";
import { fetchRequests, markFound, deleteRequest } from "./api.js";
import { timeAgo } from "./timeAgo.js";

const FLASH_KEY = "curbside-wanted-flash";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const form = document.querySelector("#filters");
const categorySelect = document.querySelector("#filter-category");
const neighborhoodSelect = document.querySelector("#filter-neighborhood");
const foundCheckbox = document.querySelector("#filter-found");
const bannerArea = document.querySelector("#banner-area");
const resultsCount = document.querySelector("#results-count");
const results = document.querySelector("#results");
const pagination = document.querySelector("#pagination");

let currentPage = 1;

// ---------- Filters and the page address ----------

function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  categorySelect.value = params.get("category") || "";
  neighborhoodSelect.value = params.get("neighborhood") || "";
  foundCheckbox.checked = params.get("found") === "1";
  currentPage = Number.parseInt(params.get("page"), 10) || 1;
}

function buildParams() {
  const params = new URLSearchParams();
  if (categorySelect.value) params.set("category", categorySelect.value);
  if (neighborhoodSelect.value) {
    params.set("neighborhood", neighborhoodSelect.value);
  }
  if (foundCheckbox.checked) params.set("found", "1");
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
  await loadRequests();
}

async function handleMarkFound(request) {
  const confirmed = await confirmAction({
    title: "Mark this request as found?",
    message: `"${request.title}" will be hidden from the board, so people stop offering it.`,
    confirmLabel: "Mark as found",
  });
  if (confirmed) {
    await runAction(() => markFound(request._id), "Marked as found.");
  }
}

async function handleDelete(request) {
  const confirmed = await confirmAction({
    title: "Delete this request?",
    message: `"${request.title}" will be removed for good. This can't be undone.`,
    confirmLabel: "Delete",
  });
  if (confirmed) {
    await runAction(
      () => deleteRequest(request._id),
      "Your request is deleted."
    );
  }
}

// ---------- Rendering ----------

function renderContact(contact) {
  const value = EMAIL_PATTERN.test(contact)
    ? el("a", { href: `mailto:${contact}` }, contact)
    : contact;
  return el("p", { className: "request-contact" }, "Contact: ", value);
}

function renderCard(request) {
  const isFound = request.status === "found";

  const actions = [];
  if (request.isOwner && !isFound) {
    actions.push(
      el(
        "button",
        {
          type: "button",
          className: "btn btn-outline",
          onClick: () => handleMarkFound(request),
        },
        "Mark as found"
      ),
      el(
        "a",
        {
          className: "btn btn-secondary",
          href: `post-request.html?id=${encodeURIComponent(request._id)}`,
        },
        "Edit"
      )
    );
  }
  if (request.isOwner) {
    actions.push(
      el("span", { className: "spacer" }),
      el(
        "button",
        {
          type: "button",
          className: "btn btn-danger",
          onClick: () => handleDelete(request),
        },
        "Delete"
      )
    );
  }

  const classes = ["card"];
  if (request.isOwner) classes.push("card-own");
  if (isFound) classes.push("card-muted");

  return el(
    "li",
    {},
    el(
      "article",
      { className: classes.join(" ") },
      el(
        "span",
        { className: `tape ${isFound ? "tape-closed" : "tape-open"}` },
        isFound ? `Found ${timeAgo(request.foundAt)}` : "Looking"
      ),
      request.isOwner
        ? el("span", { className: "owner-label" }, "Your post")
        : null,
      el("h3", {}, request.title),
      el(
        "ul",
        { className: "chips", "aria-label": "Category" },
        el("li", {}, request.category)
      ),
      el("p", { className: "request-label" }, "Can pick up in"),
      el(
        "ul",
        { className: "chips", "aria-label": "Pickup neighborhoods" },
        request.neighborhoods.map((name) => el("li", {}, name))
      ),
      request.details
        ? el("p", { className: "request-details" }, request.details)
        : null,
      renderContact(request.contact),
      el(
        "p",
        { className: "card-meta" },
        `Posted ${timeAgo(request.createdAt)}`
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
    loadRequests();
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
    resultsCount.textContent = "No requests match these filters.";
    renderState(
      "Nothing here right now. Try another category or neighborhood.",
      "Clear filters",
      clearFilters
    );
    pagination.replaceChildren();
    return;
  }

  const first = (data.page - 1) * data.pageSize + 1;
  const last = first + data.requests.length - 1;
  resultsCount.textContent = `Showing ${first} to ${last} of ${data.total.toLocaleString()} requests`;

  results.replaceChildren(
    el("ul", { className: "card-grid" }, data.requests.map(renderCard))
  );
  renderPagination(data.page, data.totalPages);
}

async function loadRequests() {
  resultsCount.textContent = "Loading requests…";
  try {
    const data = await fetchRequests(buildParams());
    renderResults(data);
  } catch (error) {
    resultsCount.textContent = "";
    renderState(error.message, "Try again", loadRequests);
    pagination.replaceChildren();
  }
}

function clearFilters() {
  categorySelect.value = "";
  neighborhoodSelect.value = "";
  foundCheckbox.checked = false;
  currentPage = 1;
  saveStateToUrl();
  loadRequests();
}

// ---------- Start ----------

renderLayout("Wanted Board");
fillSelect(categorySelect, CATEGORIES, "All categories");
fillNeighborhoodSelect(neighborhoodSelect, "All neighborhoods");
readStateFromUrl();
showFlashFromPreviousPage();

form.addEventListener("change", () => {
  currentPage = 1;
  saveStateToUrl();
  loadRequests();
});

form.addEventListener("submit", (event) => event.preventDefault());

form.addEventListener("reset", (event) => {
  event.preventDefault();
  clearFilters();
});

loadRequests();
