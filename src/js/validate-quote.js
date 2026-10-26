export const JOB_TYPES = ["renovation", "carpentry", "antique-restoration", "other"];

export const SIZES = [
  "whole",
  "multi-room",
  "one-room",
  "several-pieces",
  "single-piece",
  "unsure",
];

function text(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value) {
  if (!/^[+()\d\s.-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function validateQuote(raw) {
  const errors = {};
  const name = text(raw.name);
  const phone = text(raw.phone);
  const email = text(raw.email);
  const jobType = text(raw.jobType);
  const size = text(raw.size);
  const location = text(raw.location);
  const timeline = text(raw.timeline);
  const message = String(raw.message ?? "").trim();

  if (name.length < 2) errors.name = "Enter your name.";
  else if (name.length > 120) errors.name = "Keep the name under 120 characters.";

  if (!phone && !email) {
    errors.contact = "Enter a phone number, an email address, or both.";
  }
  if (phone && !isPhone(phone)) {
    errors.phone = "Enter a phone number with at least 10 digits. Spaces, dashes, and parentheses are fine.";
  }
  if (email && !isEmail(email)) {
    errors.email = "Enter an email address like name@example.com.";
  }
  if (!JOB_TYPES.includes(jobType)) errors.jobType = "Choose a job type.";
  if (!SIZES.includes(size)) errors.size = "Choose a job size.";
  if (location.length < 3) errors.location = "Enter the neighborhood, borough, or address.";
  else if (location.length > 200) errors.location = "Keep the location under 200 characters.";
  if (timeline.length < 3) errors.timeline = "Enter a timeline, even a rough one.";
  else if (timeline.length > 200) errors.timeline = "Keep the timeline under 200 characters.";
  if (message.length < 10) errors.message = "Describe the job in a sentence or two.";
  else if (message.length > 5000) errors.message = "Keep the message under 5000 characters.";

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { name, phone, email, jobType, size, location, timeline, message },
  };
}
