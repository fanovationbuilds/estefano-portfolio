function clamp(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function setup(root) {
  const stage = root.querySelector(".compare__stage");
  const range = root.querySelector(".compare__range");
  const beforeImg = root.querySelector(".compare__clip .compare__img");
  if (!stage || !range || !beforeImg) return;

  const setPos = (value) => {
    const pct = clamp(value);
    root.style.setProperty("--pos", String(pct));
    const rounded = Math.round(pct);
    if (Number(range.value) !== rounded) range.value = String(rounded);
    range.setAttribute("aria-valuetext", `${rounded}% before, ${100 - rounded}% after`);
  };

  const syncWidth = () => {
    beforeImg.style.width = `${stage.clientWidth}px`;
  };

  const fromClientX = (clientX) => {
    const rect = stage.getBoundingClientRect();
    if (!rect.width) return;
    setPos(((clientX - rect.left) / rect.width) * 100);
  };

  let dragging = false;

  stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragging = true;
    if (stage.setPointerCapture) stage.setPointerCapture(event.pointerId);
    fromClientX(event.clientX);
  });

  stage.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    fromClientX(event.clientX);
  });

  const endDrag = () => {
    dragging = false;
  };

  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  range.addEventListener("input", () => setPos(range.value));

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(syncWidth);
    observer.observe(stage);
  } else {
    window.addEventListener("resize", syncWidth);
  }

  syncWidth();
  setPos(range.value || 50);
}

document.querySelectorAll("[data-compare]").forEach(setup);
