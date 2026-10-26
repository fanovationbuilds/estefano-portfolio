import assert from "node:assert/strict";
import test from "node:test";
import { validateQuote } from "../src/js/validate-quote.js";

const valid = {
  name: "Ada Lopez",
  phone: "(212) 555-0199",
  email: "ada@example.com",
  jobType: "carpentry",
  size: "single-piece",
  location: "Brooklyn",
  timeline: "This spring",
  message: "One bathroom vanity cabinet, paint to match the existing trim.",
};

test("accepts a complete quote", () => {
  const result = validateQuote(valid);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, {});
  assert.equal(result.value.phone, "(212) 555-0199");
});

test("accepts phone only or email only", () => {
  assert.equal(validateQuote({ ...valid, email: "" }).ok, true);
  assert.equal(validateQuote({ ...valid, phone: "" }).ok, true);
});

test("requires at least one way to reply", () => {
  const result = validateQuote({ ...valid, phone: " ", email: "" });
  assert.equal(result.ok, false);
  assert.match(result.errors.contact, /phone number/i);
});

test("rejects a short or messy phone and a bad email", () => {
  const result = validateQuote({ ...valid, phone: "555-0199", email: "not-an-email" });
  assert.match(result.errors.phone, /10 digits/);
  assert.match(result.errors.email, /email address/);
});

test("rejects missing choices, a short message, and a one-letter name", () => {
  const result = validateQuote({
    ...valid,
    name: " A ",
    jobType: "",
    size: "kitchen",
    location: "NY",
    timeline: "no",
    message: "too short",
  });
  assert.ok(result.errors.name);
  assert.ok(result.errors.jobType);
  assert.ok(result.errors.size);
  assert.ok(result.errors.location);
  assert.ok(result.errors.timeline);
  assert.ok(result.errors.message);
});

test("collapses whitespace and accepts a formatted phone", () => {
  const result = validateQuote({ ...valid, name: "  Ada   Lopez  ", phone: "+1 212-555-0199" });
  assert.equal(result.ok, true);
  assert.equal(result.value.name, "Ada Lopez");
});

test("rejects an oversized message", () => {
  const result = validateQuote({ ...valid, message: "word ".repeat(1200) });
  assert.match(result.errors.message, /5000/);
});
