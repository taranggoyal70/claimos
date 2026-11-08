const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
let reduced = motionPreference.matches;
let motionPaused = reduced;
document.documentElement.classList.toggle("js-motion", !reduced);

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries)
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
  },
  { threshold: 0.08 },
);
$$(".reveal").forEach((element) => observer.observe(element));

const art = $(".hero-art");
let artVisible = true;
let artStep = 0;
const artLabels = [
  "01 / Locate the property",
  "02 / Make sense of the notice",
  "03 / Find the next step",
];
const artStatuses = [
  "Your property comes first",
  "Bring the details together",
  "A clearer place to start",
];
const setArt = (step) => {
  artStep = step;
  art.dataset.scene = String(step);
  $("[data-art-label]").textContent = artLabels[step];
  $("[data-art-status]").textContent = artStatuses[step];
};
new IntersectionObserver(([entry]) => {
  artVisible = entry.isIntersecting;
}).observe(art);
const artClock = setInterval(() => {
  if (!motionPaused && !document.hidden && artVisible)
    setArt((artStep + 1) % 3);
}, 5200);
const motionButton = $(".motion-toggle");
motionButton.addEventListener("click", () => {
  motionPaused = !motionPaused;
  document.body.classList.toggle("motion-paused", motionPaused);
  motionButton.setAttribute("aria-pressed", String(motionPaused));
  motionButton.setAttribute(
    "aria-label",
    motionPaused ? "Play illustration" : "Pause illustration",
  );
  $("[data-motion-label]").textContent = motionPaused ? "Play" : "Pause";
  $("[data-motion-icon]").textContent = motionPaused ? "▷" : "Ⅱ";
});
art.addEventListener("pointermove", (event) => {
  if (reduced || motionPaused || event.pointerType === "touch") return;
  const bounds = art.getBoundingClientRect();
  art.style.setProperty(
    "--art-x",
    `${((event.clientX - bounds.left) / bounds.width - 0.5) * 9}px`,
  );
  art.style.setProperty(
    "--art-y",
    `${((event.clientY - bounds.top) / bounds.height - 0.5) * 7}px`,
  );
});
art.addEventListener("pointerleave", () => {
  art.style.setProperty("--art-x", "0px");
  art.style.setProperty("--art-y", "0px");
});

const journey = $(".journey");
const dossier = $(".dossier-stage");
const phaseButtons = $$("[data-phase-button]");
const dossierCopy = [
  "Start with the property, not the paperwork.",
  "Keep the supporting facts with the case.",
  "Your approval before any filing.",
];
let phase = 0;
let manualScrollPosition = null;
let replayTimers = [];
function stopReplay() {
  replayTimers.forEach(clearTimeout);
  replayTimers = [];
}
function setPhase(next) {
  phase = next;
  dossier.dataset.phase = String(next);
  phaseButtons.forEach((button, index) => {
    button.classList.toggle("is-active", index === next);
    button.setAttribute("aria-pressed", String(index === next));
  });
  $("[data-phase-count]").textContent = String(next + 1).padStart(2, "0");
  $("[data-dossier-status]").textContent = dossierCopy[next];
}
phaseButtons.forEach((button) =>
  button.addEventListener("click", () => {
    stopReplay();
    manualScrollPosition = scrollY;
    setPhase(Number(button.dataset.phaseButton));
  }),
);
$("[data-replay]").addEventListener("click", () => {
  stopReplay();
  manualScrollPosition = scrollY;
  setPhase(0);
  if (!reduced)
    [1, 2].forEach((step) =>
      replayTimers.push(setTimeout(() => setPhase(step), step * 2100)),
    );
});
let frameRequested = false;
function updateScroll() {
  frameRequested = false;
  const available = document.documentElement.scrollHeight - innerHeight;
  document.documentElement.style.setProperty(
    "--page-progress",
    String(available > 0 ? scrollY / available : 0),
  );
  if (
    manualScrollPosition !== null &&
    Math.abs(scrollY - manualScrollPosition) > 30
  ) {
    manualScrollPosition = null;
    stopReplay();
  }
  if (innerWidth <= 860 || reduced || manualScrollPosition !== null) return;
  const rect = journey.getBoundingClientRect();
  const range = rect.height - innerHeight + 114;
  const progress = Math.max(
    0,
    Math.min(1, (114 - rect.top) / Math.max(1, range)),
  );
  const next = progress < 0.3 ? 0 : progress < 0.67 ? 1 : 2;
  if (next !== phase) setPhase(next);
}
function queueScroll() {
  if (!frameRequested) {
    frameRequested = true;
    requestAnimationFrame(updateScroll);
  }
}
addEventListener("scroll", queueScroll, { passive: true });
addEventListener("resize", queueScroll, { passive: true });
motionPreference.addEventListener("change", (event) => {
  reduced = event.matches;
  motionPaused = reduced;
  document.documentElement.classList.toggle("js-motion", !reduced);
  document.body.classList.toggle("motion-paused", reduced);
  motionButton.setAttribute("aria-pressed", String(reduced));
  motionButton.setAttribute(
    "aria-label",
    reduced ? "Play illustration" : "Pause illustration",
  );
  $("[data-motion-label]").textContent = reduced ? "Play" : "Pause";
  $("[data-motion-icon]").textContent = reduced ? "▷" : "Ⅱ";
  stopReplay();
  queueScroll();
});
updateScroll();

const form = $("#intake-form");
const panels = $$("[data-form-step]");
const progressItems = $$(".form-progress li");
const announcement = $("[data-announcement]");
const fileInput = $("#notice-file");
let formStep = 0;
let selectedFile = null;
let savedRequest = null;
let sampleUsed = false;
const errors = {
  "property-address": ["address-error", "Enter the property’s street address."],
  "property-county": [
    "county-error",
    "Choose the county where the property is located.",
  ],
  "owner-name": ["name-error", "Enter your full name."],
  "owner-email": ["email-error", "Enter a valid email address."],
  "owner-role": ["role-error", "Choose your connection to the property."],
};
function setError(input, message) {
  const output = document.getElementById(errors[input.id][0]);
  output.textContent = message;
  input.setAttribute("aria-invalid", String(Boolean(message)));
}
for (const id of Object.keys(errors)) {
  const input = document.getElementById(id);
  input.addEventListener(
    input.tagName === "SELECT" ? "change" : "input",
    () => {
      if (input.getAttribute("aria-invalid") === "true") setError(input, "");
    },
  );
}
function validateStep() {
  let firstInvalid = null;
  for (const input of $$("[required]", panels[formStep])) {
    const valid = input.value.trim() !== "" && input.checkValidity();
    setError(input, valid ? "" : errors[input.id][1]);
    if (!valid && !firstInvalid) firstInvalid = input;
  }
  if (firstInvalid) {
    firstInvalid.focus();
    announcement.textContent =
      "Please check the highlighted details before continuing.";
    return false;
  }
  return true;
}
function updateReview() {
  $("[data-review-address]").textContent = form.elements.address.value.trim();
  $("[data-review-location]").textContent =
    `${form.elements.county.value} · Florida`;
  $("[data-review-name]").textContent = form.elements.name.value.trim();
  $("[data-review-email]").textContent = form.elements.email.value.trim();
  $("[data-review-role]").textContent =
    form.elements.relationship.selectedOptions[0].textContent;
  $("[data-review-file]").textContent = selectedFile
    ? `${selectedFile.name} (not included in download)`
    : "No notice selected";
}
function goToStep(next, focus = true) {
  formStep = next;
  panels.forEach((panel, index) => {
    panel.hidden = index !== next;
  });
  progressItems.forEach((item, index) => {
    item.classList.toggle("current", index === next);
    item.classList.toggle("complete", index < next);
    item.querySelector("span").textContent =
      index < next ? "✓" : String(index + 1);
    if (index === next) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
  $("[data-step-current]").textContent = String(next + 1).padStart(2, "0");
  $("[data-back]").hidden = next === 0;
  $("[data-next-label]").textContent =
    next === 2 ? "Save my request" : "Continue";
  $("[data-form-note]").textContent =
    next === 2
      ? "A local download. Nothing is submitted."
      : "No account or payment details needed.";
  if (next === 2) updateReview();
  if (!reduced)
    panels[next].animate(
      [
        { opacity: 0, transform: "translateY(12px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" },
    );
  if (focus) {
    const target =
      panels[next].querySelector("input,select") ||
      panels[next].querySelector("legend");
    if (target.tagName === "LEGEND") target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }
  announcement.textContent = `Step ${next + 1} of 3: ${["Property", "About you", "Review"][next]}.`;
}
function setFile(file) {
  const acceptedTypes = ["application/pdf", "image/jpeg", "image/png"];
  const acceptedExtensions = /\.(pdf|jpe?g|png)$/i;
  if (
    file &&
    ((!acceptedTypes.includes(file.type) && file.type !== "") ||
      !acceptedExtensions.test(file.name) ||
      file.size > 10 * 1024 * 1024 ||
      file.size === 0)
  ) {
    $("#file-error").textContent =
      "Choose a non-empty PDF, JPG or PNG smaller than 10 MB.";
    fileInput.value = "";
    return;
  }
  selectedFile = file || null;
  $("#file-error").textContent = "";
  $("[data-file-name]").textContent = selectedFile
    ? selectedFile.name
    : "Add a tax notice (optional)";
  $("[data-remove-file]").hidden = !selectedFile;
  announcement.textContent = selectedFile
    ? `${selectedFile.name} selected locally. Nothing has been uploaded.`
    : "Notice removed.";
}
fileInput.addEventListener("change", () => setFile(fileInput.files[0]));
$("[data-remove-file]").addEventListener("click", () => {
  fileInput.value = "";
  setFile(null);
  fileInput.focus();
});
const upload = $(".upload-field");
["dragenter", "dragover"].forEach((type) =>
  upload.addEventListener(type, (event) => {
    event.preventDefault();
    upload.classList.add("drag-over");
  }),
);
["dragleave", "drop"].forEach((type) =>
  upload.addEventListener(type, (event) => {
    event.preventDefault();
    upload.classList.remove("drag-over");
    if (type === "drop") {
      if (event.dataTransfer.files.length !== 1)
        $("#file-error").textContent = "Choose one notice at a time.";
      else setFile(event.dataTransfer.files[0]);
    }
  }),
);
$("[data-use-sample]").addEventListener("click", () => {
  form.elements.address.value = "100 Example Lane, Unit 2";
  form.elements.county.value = "Lee";
  form.elements.name.value = "Sample Homeowner";
  form.elements.email.value = "homeowner@example.com";
  form.elements.relationship.value = "owner";
  sampleUsed = true;
  Object.keys(errors).forEach((id) =>
    setError(document.getElementById(id), ""),
  );
  announcement.textContent =
    "Illustrative sample details filled in. No real property or owner is represented.";
  $("[data-use-sample]").textContent =
    "Sample details added · editable before saving";
});
$$("[data-edit]").forEach((button) =>
  button.addEventListener("click", () => goToStep(Number(button.dataset.edit))),
);
$("[data-back]").addEventListener("click", () =>
  goToStep(Math.max(0, formStep - 1)),
);
function downloadRequest() {
  if (!savedRequest) return;
  const blob = new Blob([JSON.stringify(savedRequest, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "claimos-review-request.json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validateStep()) return;
  if (formStep < 2) {
    goToStep(formStep + 1);
    return;
  }
  savedRequest = {
    type: "property_review_request",
    status: "local_draft",
    submitted: false,
    created_at: new Date().toISOString(),
    sample_details_used: sampleUsed,
    property: {
      address: form.elements.address.value.trim(),
      county: form.elements.county.value,
      state: "FL",
    },
    contact: {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      relationship: form.elements.relationship.value,
    },
    notice: selectedFile
      ? {
          filename: selectedFile.name,
          bytes: selectedFile.size,
          included: false,
        }
      : null,
    authorization: false,
    note: "Prepared in the Claim OS intake preview. Not submitted, qualified, authorized, or filed. A selected notice is not included.",
  };
  downloadRequest();
  form.hidden = true;
  $(".form-progress").hidden = true;
  $(".request-saved").hidden = false;
  $("[data-step-current]").textContent = "03";
  $("#saved-heading").focus({ preventScroll: true });
  if (!reduced)
    $(".saved-mark").animate(
      [
        { transform: "scale(.65)", opacity: 0 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: 650, easing: "cubic-bezier(.16,1,.3,1)" },
    );
  announcement.textContent =
    "Your request is prepared and the local download has started. Nothing was submitted.";
});
$("[data-download-again]").addEventListener("click", downloadRequest);
$("[data-start-over]").addEventListener("click", () => {
  form.reset();
  savedRequest = null;
  sampleUsed = false;
  setFile(null);
  Object.keys(errors).forEach((id) =>
    setError(document.getElementById(id), ""),
  );
  $(".request-saved").hidden = true;
  $(".form-progress").hidden = false;
  form.hidden = false;
  $("[data-use-sample]").textContent =
    "Just exploring? Try a sample property ↗";
  goToStep(0);
});
addEventListener("pagehide", stopReplay);
