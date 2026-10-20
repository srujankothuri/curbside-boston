import { el } from "../shared/dom.js";
import { renderLayout } from "../shared/layout.js";
import { CATEGORIES, NEIGHBORHOOD_GROUPS } from "../shared/lists.js";
import { fillSelect } from "../shared/selectOptions.js";
import { fetchRequest, createRequest, updateRequest } from "./api.js";

const FLASH_KEY = "curbside-wanted-flash";
const MAX_LENGTH = { title: 60, details: 300, contact: 100 };
const FIELD_NAMES = [
  "title",
  "category",
  "neighborhoods",
  "details",
  "contact",
];

const form = document.querySelector("#request-form");
const heading = document.querySelector("#form-heading");
const intro = document.querySelector("#form-intro");
const submitButton = document.querySelector("#submit-button");
const formStatus = document.querySelector("#form-status");
const neighborhoodOptions = document.querySelector("#neighborhood-options");
const details = form.elements.details;
const detailsCount = document.querySelector("#details-count");

const requestId = new URLSearchParams(window.location.search).get("id");
const isEditing = Boolean(requestId);

// ---------- Neighborhood checkboxes ----------

function renderNeighborhoodOptions() {
  const groups = Object.entries(NEIGHBORHOOD_GROUPS).map(([label, names]) =>
    el(
      "div",
      { className: "neighborhood-group" },
      el("p", { className: "neighborhood-group-label" }, label),
      el(
        "div",
        { className: "neighborhood-grid" },
        names.map((name) =>
          el(
            "label",
            { className: "check" },
            el("input", {
              type: "checkbox",
              name: "neighborhoods",
              value: name,
            }),
            name
          )
        )
      )
    )
  );
  neighborhoodOptions.replaceChildren(...groups);
}

function neighborhoodBoxes() {
  return [...form.querySelectorAll('input[name="neighborhoods"]')];
}

// ---------- Field errors ----------

function setFieldError(name, message) {
  const errorElement = document.querySelector(`#${name}-error`);
  errorElement.textContent = message || "";
  errorElement.hidden = !message;

  const controls =
    name === "neighborhoods" ? [neighborhoodOptions] : [form.elements[name]];
  controls.forEach((control) => {
    if (message) control.setAttribute("aria-invalid", "true");
    else control.removeAttribute("aria-invalid");
  });
}

function clearErrors() {
  FIELD_NAMES.forEach((name) => setFieldError(name, ""));
  formStatus.replaceChildren();
}

function showErrors(errors) {
  Object.entries(errors).forEach(([name, message]) =>
    setFieldError(name, message)
  );
  const firstName = FIELD_NAMES.find((name) => errors[name]);
  const target =
    firstName === "neighborhoods"
      ? neighborhoodBoxes()[0]
      : form.elements[firstName];
  target?.focus();
}

function showFormMessage(message) {
  formStatus.replaceChildren(
    el("div", { className: "banner banner-error", role: "alert" }, message)
  );
}

// ---------- Reading and checking the form ----------

function readFields() {
  return {
    title: form.elements.title.value.trim(),
    category: form.elements.category.value,
    neighborhoods: neighborhoodBoxes()
      .filter((box) => box.checked)
      .map((box) => box.value),
    details: details.value.trim(),
    contact: form.elements.contact.value.trim(),
  };
}

// Same rules as the server, so most mistakes are caught before sending.
function validate(fields) {
  const errors = {};
  if (!fields.title) errors.title = "Enter what you need.";
  else if (fields.title.length > MAX_LENGTH.title) {
    errors.title = `Keep this to ${MAX_LENGTH.title} characters or fewer.`;
  }
  if (!fields.category) errors.category = "Choose a category.";
  if (fields.neighborhoods.length === 0) {
    errors.neighborhoods = "Choose at least one neighborhood.";
  }
  if (fields.details.length > MAX_LENGTH.details) {
    errors.details = `Keep the details to ${MAX_LENGTH.details} characters or fewer.`;
  }
  if (!fields.contact) errors.contact = "Enter an email or phone number.";
  else if (fields.contact.length > MAX_LENGTH.contact) {
    errors.contact = `Keep this to ${MAX_LENGTH.contact} characters or fewer.`;
  }
  return errors;
}

function updateDetailsCount() {
  detailsCount.textContent = `${details.value.length} / ${MAX_LENGTH.details}`;
}

// ---------- Edit mode ----------

function replaceFormWith(message) {
  form.replaceWith(
    el(
      "div",
      { className: "state-message" },
      el("p", {}, message),
      el(
        "a",
        { className: "btn btn-secondary", href: "wanted-board.html" },
        "Back to the Wanted Board"
      )
    )
  );
}

async function loadRequestForEditing() {
  heading.textContent = "Edit request";
  intro.textContent = "Update the details, then save your changes.";
  submitButton.textContent = "Save changes";
  document.title = "Edit request | Curbside Boston";

  try {
    const request = await fetchRequest(requestId);
    if (!request.isOwner) {
      replaceFormWith(
        "You can only edit requests you posted from this browser."
      );
      return;
    }
    form.elements.title.value = request.title;
    form.elements.category.value = request.category;
    neighborhoodBoxes().forEach((box) => {
      box.checked = request.neighborhoods.includes(box.value);
    });
    details.value = request.details || "";
    form.elements.contact.value = request.contact;
    updateDetailsCount();
    form.hidden = false;
  } catch (error) {
    replaceFormWith(
      error.status === 404
        ? "This request no longer exists. It may have been deleted."
        : error.message
    );
  }
}

// ---------- Submitting ----------

async function handleSubmit(event) {
  event.preventDefault();
  clearErrors();

  const fields = readFields();
  const errors = validate(fields);
  if (Object.keys(errors).length > 0) {
    showErrors(errors);
    return;
  }

  const idleLabel = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = isEditing ? "Saving…" : "Posting…";

  try {
    if (isEditing) {
      await updateRequest(requestId, fields);
      sessionStorage.setItem(FLASH_KEY, "Your changes are saved.");
    } else {
      await createRequest(fields);
      sessionStorage.setItem(FLASH_KEY, "Your request is posted.");
    }
    window.location.href = "wanted-board.html";
  } catch (error) {
    if (error.fieldErrors) showErrors(error.fieldErrors);
    else showFormMessage(error.message);
    submitButton.disabled = false;
    submitButton.textContent = idleLabel;
  }
}

// ---------- Start ----------

renderLayout("Wanted Board");
fillSelect(form.elements.category, CATEGORIES, "Choose a category");
renderNeighborhoodOptions();

details.addEventListener("input", updateDetailsCount);
form.addEventListener("submit", handleSubmit);

if (isEditing) {
  form.hidden = true;
  loadRequestForEditing();
} else {
  updateDetailsCount();
}
