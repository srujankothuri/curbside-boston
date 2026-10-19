import { el } from "../shared/dom.js";
import { renderLayout } from "../shared/layout.js";
import { CATEGORIES, CONDITIONS } from "../shared/lists.js";
import { fillSelect, fillNeighborhoodSelect } from "../shared/selectOptions.js";
import { fetchItem, createItem, updateItem } from "./api.js";

const FLASH_KEY = "curbside-flash";
const MAX_LENGTH = { title: 60, street: 80, description: 300 };

const form = document.querySelector("#item-form");
const heading = document.querySelector("#form-heading");
const intro = document.querySelector("#form-intro");
const submitButton = document.querySelector("#submit-button");
const formStatus = document.querySelector("#form-status");
const description = form.elements.description;
const descriptionCount = document.querySelector("#description-count");

const itemId = new URLSearchParams(window.location.search).get("id");
const isEditing = Boolean(itemId);

// ---------- Field errors ----------

function setFieldError(name, message) {
  const errorElement = document.querySelector(`#${name}-error`);
  const field = form.elements[name];
  const controls = field instanceof RadioNodeList ? [...field] : [field];

  errorElement.textContent = message || "";
  errorElement.hidden = !message;
  controls.forEach((control) => {
    if (message) control.setAttribute("aria-invalid", "true");
    else control.removeAttribute("aria-invalid");
  });
}

function clearErrors() {
  [
    "postedBy",
    "title",
    "category",
    "condition",
    "neighborhood",
    "street",
    "description",
  ].forEach((name) => setFieldError(name, ""));
  formStatus.replaceChildren();
}

function showErrors(errors) {
  Object.entries(errors).forEach(([name, message]) =>
    setFieldError(name, message)
  );
  const firstName = Object.keys(errors)[0];
  const first = form.elements[firstName];
  const target = first instanceof RadioNodeList ? first[0] : first;
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
    postedBy: form.elements.postedBy.value,
    title: form.elements.title.value.trim(),
    category: form.elements.category.value,
    condition: form.elements.condition.value,
    neighborhood: form.elements.neighborhood.value,
    street: form.elements.street.value.trim(),
    description: description.value.trim(),
  };
}

// Same rules as the server, so most mistakes are caught before sending.
function validate(fields) {
  const errors = {};
  if (!fields.postedBy) errors.postedBy = "Choose who's posting.";
  if (!fields.title) errors.title = "Enter a title.";
  else if (fields.title.length > MAX_LENGTH.title) {
    errors.title = `Keep the title to ${MAX_LENGTH.title} characters or fewer.`;
  }
  if (!fields.category) errors.category = "Choose a category.";
  if (!fields.condition) errors.condition = "Choose a condition.";
  if (!fields.neighborhood) errors.neighborhood = "Choose a neighborhood.";
  if (!fields.street) errors.street = "Enter a street or cross street.";
  else if (fields.street.length > MAX_LENGTH.street) {
    errors.street = `Keep the location to ${MAX_LENGTH.street} characters or fewer.`;
  }
  if (fields.description.length > MAX_LENGTH.description) {
    errors.description = `Keep the description to ${MAX_LENGTH.description} characters or fewer.`;
  }
  return errors;
}

function updateDescriptionCount() {
  descriptionCount.textContent = `${description.value.length} / ${MAX_LENGTH.description}`;
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
        { className: "btn btn-secondary", href: "curb-board.html" },
        "Back to the Curb Board"
      )
    )
  );
}

async function loadItemForEditing() {
  heading.textContent = "Edit item";
  intro.textContent = "Update the details, then save your changes.";
  submitButton.textContent = "Save changes";
  document.title = "Edit item | Curbside Boston";

  try {
    const item = await fetchItem(itemId);
    if (!item.isOwner) {
      replaceFormWith("You can only edit items you posted from this browser.");
      return;
    }
    form.elements.postedBy.value = item.postedBy;
    form.elements.title.value = item.title;
    form.elements.category.value = item.category;
    form.elements.condition.value = item.condition;
    form.elements.neighborhood.value = item.neighborhood;
    form.elements.street.value = item.street;
    description.value = item.description || "";
    updateDescriptionCount();
    form.hidden = false;
  } catch (error) {
    replaceFormWith(
      error.status === 404
        ? "This item no longer exists. It may have been deleted."
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
      await updateItem(itemId, fields);
      sessionStorage.setItem(FLASH_KEY, "Your changes are saved.");
    } else {
      await createItem(fields);
      sessionStorage.setItem(FLASH_KEY, "Your item is posted.");
    }
    window.location.href = "curb-board.html";
  } catch (error) {
    if (error.fieldErrors) showErrors(error.fieldErrors);
    else showFormMessage(error.message);
    submitButton.disabled = false;
    submitButton.textContent = idleLabel;
  }
}

// ---------- Start ----------

renderLayout("Curb Board");
fillSelect(form.elements.category, CATEGORIES, "Choose a category");
fillSelect(form.elements.condition, CONDITIONS, "Choose a condition");
fillNeighborhoodSelect(form.elements.neighborhood, "Choose a neighborhood");

description.addEventListener("input", updateDescriptionCount);
form.addEventListener("submit", handleSubmit);

if (isEditing) {
  form.hidden = true;
  loadItemForEditing();
} else {
  updateDescriptionCount();
}
