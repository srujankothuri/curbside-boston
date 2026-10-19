import { el } from "./dom.js";

const NAV_LINKS = [
  { href: "curb-board.html", label: "Curb Board" },
  { href: "wanted-board.html", label: "Wanted Board" },
];

const REPO_URL = "https://github.com/srujankothuri/curbside-boston";
const COURSE_URL =
  "https://johnguerra.co/classes/webDevelopment_online_fall_2026/";

function renderHeader(currentPage) {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const links = NAV_LINKS.map((link) =>
    el(
      "li",
      {},
      el(
        "a",
        {
          href: link.href,
          "aria-current": link.label === currentPage ? "page" : null,
        },
        link.label
      )
    )
  );

  header.replaceChildren(
    el(
      "div",
      { className: "container" },
      el(
        "a",
        { className: "brand", href: "index.html" },
        el("img", { src: "favicon.svg", alt: "", width: "30", height: "30" }),
        "Curbside Boston"
      ),
      el(
        "nav",
        { className: "site-nav", "aria-label": "Main" },
        el("ul", {}, links)
      )
    )
  );
}

function renderFooter() {
  const footer = document.querySelector(".site-footer");
  if (!footer) return;

  footer.replaceChildren(
    el(
      "div",
      { className: "container" },
      el(
        "p",
        {},
        "Curbside Boston, built by Kothuri Venkata Srujan and Lakshmana Kontemukkula for ",
        el("a", { href: COURSE_URL }, "CS 5610 Web Development"),
        "."
      ),
      el(
        "ul",
        {},
        el("li", {}, el("a", { href: REPO_URL }, "GitHub repo")),
        el(
          "li",
          {},
          el("a", { href: `${REPO_URL}/blob/main/LICENSE` }, "MIT License")
        )
      )
    )
  );
}

// currentPage is "Curb Board", "Wanted Board", or null for the Home page.
export function renderLayout(currentPage) {
  renderHeader(currentPage);
  renderFooter();
}
