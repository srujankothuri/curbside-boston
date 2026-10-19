import { el } from "./dom.js";
import { NEIGHBORHOOD_GROUPS } from "./lists.js";

// Fills a <select> with a placeholder option plus one option per value.
export function fillSelect(select, values, placeholder) {
  select.replaceChildren(
    el("option", { value: "" }, placeholder),
    ...values.map((value) => el("option", { value }, value))
  );
}

// Fills a <select> with neighborhoods grouped under "Boston" and "Nearby".
export function fillNeighborhoodSelect(select, placeholder) {
  const groups = Object.entries(NEIGHBORHOOD_GROUPS).map(([label, names]) =>
    el(
      "optgroup",
      { label },
      names.map((name) => el("option", { value: name }, name))
    )
  );
  select.replaceChildren(el("option", { value: "" }, placeholder), ...groups);
}
