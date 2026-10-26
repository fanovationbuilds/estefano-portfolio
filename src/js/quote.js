import { QUOTE_ENDPOINT } from "./config.js";
import { validateQuote } from "./validate-quote.js";

const MAX_PHOTOS = 5;
const MAX_EDGE = 1600;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_TOTAL_BASE64 = 3_500_000;
const FIELD_IDS = [
  "name",
  "phone",
  "email",
  "contact",
  "jobType",
  "size",
  "location",
  "timeline",
  "photos",
  "message",
];

function endpointReady(url) {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/TODO|example\.com|YOUR_|changeme|paste/i.test(trimmed)) return false;
  try {
    return new URL(trimmed).protocol === "https:";
  } catch {
    return false;
  }
}

function showError(id, message) {
  const error = document.getElementById(`${id}-error`);
  const field = document.getElementById(id);
  if (!error) return;
  if (message) {
    error.hidden = false;
    error.textContent = message;
    if (field) field.setAttribute("aria-invalid", "true");
  } else {
    error.hidden = true;
    error.textContent = "";
    if (field) field.removeAttribute("aria-invalid");
  }
}

function applyErrors(errors) {
  for (const id of FIELD_IDS) showError(id, errors[id] || "");
  const phone = document.getElementById("phone");
  const email = document.getElementById("email");
  if (errors.contact) {
    if (phone && !phone.value.trim()) phone.setAttribute("aria-invalid", "true");
    if (email && !email.value.trim()) email.setAttribute("aria-invalid", "true");
  }
}

function focusFirst(errors) {
  const order = ["name", "phone", "email", "jobType", "size", "location", "timeline", "photos", "message"];
  if (errors.contact && !errors.phone && !errors.email) {
    document.getElementById("phone")?.focus();
    return;
  }
  for (const id of order) {
    if (errors[id]) {
      document.getElementById(id)?.focus();
      return;
    }
  }
}

function setStatus(message, kind) {
  const status = document.getElementById("form-status");
  status.textContent = message;
  status.classList.toggle("is-ok", kind === "ok");
  status.classList.toggle("is-pending", kind === "pending");
  status.focus();
}

function clearStatus() {
  const status = document.getElementById("form-status");
  status.textContent = "";
  status.classList.remove("is-ok", "is-pending");
}

function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error(`Could not prepare ${file.name}. Use a JPEG or PNG.`));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const result = String(reader.result || "");
            const dataBase64 = result.split(",")[1] || "";
            const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
            resolve({ name: `${baseName}.jpg`, type: "image/jpeg", dataBase64 });
          };
          reader.onerror = () => reject(new Error(`Could not prepare ${file.name}. Use a JPEG or PNG.`));
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.72,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file.name}. Use a JPEG or PNG.`));
    };
    img.src = url;
  });
}

async function readPhotos(fileList) {
  const files = [...fileList];
  if (files.length > MAX_PHOTOS) {
    throw new Error(`Choose up to ${MAX_PHOTOS} photos.`);
  }
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      throw new Error(`${file.name} is not an image. Use a JPEG or PNG.`);
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`${file.name} is too large. Use a photo under 15 MB.`);
    }
  }
  const photos = await Promise.all(files.map(resizePhoto));
  const total = photos.reduce((sum, photo) => sum + photo.dataBase64.length, 0);
  if (total > MAX_TOTAL_BASE64) {
    throw new Error("Those photos are still too large to send together. Remove one and try again.");
  }
  return photos;
}

function listPhotoNames(form) {
  const list = document.getElementById("photo-names");
  list.replaceChildren();
  for (const file of form.elements.photos.files) {
    const item = document.createElement("li");
    item.textContent = file.name;
    list.append(item);
  }
}

const form = document.querySelector("#quote-form");
if (form) {
  form.elements.photos.addEventListener("change", () => listPhotoNames(form));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearStatus();
    const result = validateQuote(Object.fromEntries(new FormData(form)));
    applyErrors(result.errors);
    const summary = document.getElementById("form-errors");

    if (!result.ok) {
      const count = Object.keys(result.errors).length;
      summary.hidden = false;
      summary.textContent = count === 1 ? "One field needs attention." : `${count} fields need attention.`;
      focusFirst(result.errors);
      return;
    }

    summary.hidden = true;
    let photos = [];
    try {
      photos = await readPhotos(form.elements.photos.files);
      showError("photos", "");
    } catch (error) {
      showError("photos", error.message);
      summary.hidden = false;
      summary.textContent = "One field needs attention.";
      document.getElementById("photos").focus();
      return;
    }

    if (!endpointReady(QUOTE_ENDPOINT)) {
      setStatus(
        "Nothing was sent. The quote form is not connected yet. Set QUOTE_ENDPOINT in js/config.js to the Google Apps Script web app URL, then submit again. Your answers are still on this page.",
        "warn",
      );
      return;
    }

    const button = form.querySelector("[type=submit]");
    button.disabled = true;
    setStatus("Sending the request.", "pending");
    try {
      const response = await fetch(QUOTE_ENDPOINT.trim(), {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({
          ...result.value,
          photos,
          submittedAt: new Date().toISOString(),
          source: "estefano-portfolio",
        }),
      });
      if (!response.ok) {
        throw new Error(`The endpoint replied with status ${response.status}.`);
      }
      const bodyText = await response.text();
      if (bodyText) {
        try {
          const parsed = JSON.parse(bodyText);
          if (parsed && parsed.ok === false) {
            throw new Error(parsed.error || "The endpoint rejected the request.");
          }
        } catch (error) {
          if (!(error instanceof SyntaxError)) throw error;
        }
      }
      form.reset();
      listPhotoNames(form);
      applyErrors({});
      setStatus("Sent. We will reply to the phone or email you entered. This page does not show a price.", "ok");
    } catch (error) {
      const detail = error && error.message ? error.message : "The request failed.";
      setStatus(
        `Nothing was confirmed. ${detail} Check the connection and QUOTE_ENDPOINT, then submit again. Your answers are still on this page.`,
        "warn",
      );
    } finally {
      button.disabled = false;
    }
  });
}
