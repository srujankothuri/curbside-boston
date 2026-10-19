import { el } from "./dom.js";

// Shows a confirmation dialog and resolves to true if the person confirms.
export function confirmAction({ title, message, confirmLabel }) {
  return new Promise((resolve) => {
    const dialog = el(
      "dialog",
      { className: "confirm-dialog", "aria-labelledby": "confirm-title" },
      el("h2", { id: "confirm-title" }, title),
      el("p", {}, message),
      el(
        "form",
        { method: "dialog", className: "dialog-actions" },
        el(
          "button",
          { className: "btn btn-secondary", value: "cancel" },
          "Cancel"
        ),
        el(
          "button",
          { className: "btn btn-primary", value: "confirm" },
          confirmLabel
        )
      )
    );

    dialog.addEventListener("close", () => {
      resolve(dialog.returnValue === "confirm");
      dialog.remove();
    });

    document.body.append(dialog);
    dialog.showModal();
  });
}
