import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDmrT2jTjybwF33ZceEHsK-v7opeBUx2lA",
  authDomain: "commonplace-ktchn.firebaseapp.com",
  projectId: "commonplace-ktchn",
  storageBucket: "commonplace-ktchn.firebasestorage.app",
  messagingSenderId: "1094213120783",
  appId: "1:1094213120783:web:b11b9d002340f28350847a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const CATEGORY_OPTIONS = [
  "Steeping",
  "Simmering",
  "Boiling Over",
  "Reducing",
  "Preserving",
];

const formModal = document.querySelector("#form-modal");
const openFormBtn = document.querySelector("#open-form-btn");
const closeFormBtn = document.querySelector("#close-form-btn");
const memoryForm = document.querySelector("#memory-form");
const submitBtn = document.querySelector("#submit-btn");
const formStatus = document.querySelector("#form-status");
const imagesInput = document.querySelector("#images");
const selectedImagesList = document.querySelector("#selected-images");
const recipesGrid = document.querySelector("#recipes-grid");
const emptyState = document.querySelector("#empty-state");
const categoryFilters = document.querySelector("#category-filters");
const optionRows = Array.from(document.querySelectorAll(".option-row"));

let activeCategory = "all";
let allRecipes = [];

function openForm() {
  formModal.classList.remove("hidden");
  formModal.setAttribute("aria-hidden", "false");
}

function closeForm() {
  formModal.classList.add("hidden");
  formModal.setAttribute("aria-hidden", "true");
}

function setupOptionButtons() {
  for (const row of optionRows) {
    const inputId = row.dataset.targetInput;
    const hiddenInput = document.querySelector(`#${inputId}`);
    if (!hiddenInput) continue;

    const buttons = Array.from(row.querySelectorAll(".option-btn"));
    const setActive = (value) => {
      hiddenInput.value = value;
      for (const btn of buttons) {
        btn.classList.toggle("active", btn.dataset.value === value);
      }
    };

    for (const btn of buttons) {
      btn.addEventListener("click", () => setActive(btn.dataset.value || ""));
    }

    const defaultValue = hiddenInput.value || buttons[0]?.dataset.value || "";
    setActive(defaultValue);
  }
}

function resetOptionDefaults() {
  for (const row of optionRows) {
    const inputId = row.dataset.targetInput;
    const hiddenInput = document.querySelector(`#${inputId}`);
    const firstButton = row.querySelector(".option-btn");
    if (!hiddenInput || !firstButton) continue;
    hiddenInput.value = firstButton.dataset.value || "";
    for (const btn of row.querySelectorAll(".option-btn")) {
      btn.classList.toggle("active", btn === firstButton);
    }
  }
}

function listSelectedImages() {
  selectedImagesList.innerHTML = "";
  const files = Array.from(imagesInput.files || []);

  if (files.length > 5) {
    formStatus.textContent = "Only 5 images are allowed.";
  } else {
    formStatus.textContent = "";
  }

  for (const file of files) {
    const li = document.createElement("li");
    li.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
    selectedImagesList.appendChild(li);
  }
}

async function uploadImages(files) {
  const uploadedUrls = [];
  for (const file of files) {
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
    const imageRef = ref(storage, `recipes/${safeName}`);
    await uploadBytes(imageRef, file);
    const url = await getDownloadURL(imageRef);
    uploadedUrls.push(url);
  }
  return uploadedUrls;
}

function normalizeCreatedAt(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}

function renderRecipes() {
  recipesGrid.innerHTML = "";

  const filtered = allRecipes
    .filter((recipe) => activeCategory === "all" || recipe.category === activeCategory)
    .sort((a, b) => normalizeCreatedAt(b.createdAt) - normalizeCreatedAt(a.createdAt));

  emptyState.classList.toggle("hidden", filtered.length > 0);

  for (const recipe of filtered) {
    const card = document.createElement("article");
    card.className = "memory-card";
    card.tabIndex = 0;
    card.setAttribute("aria-label", "Flip memory card to read recipe");

    card.innerHTML = `
      <div class="memory-card-inner">
        <div class="memory-card-face memory-card-front" style="background-color:${recipe.color || "#FDE2E4"}; font-family:'${recipe.font || "Caveat"}', cursive;">
          <h3 class="card-title">${escapeHTML(recipe.title || "")}</h3>
          <p class="memory-text">${escapeHTML(recipe.memory || "")}</p>
          ${
            Array.isArray(recipe.imageUrls) && recipe.imageUrls.length
              ? `<div class="card-images">${recipe.imageUrls
                  .map((url) => `<img src="${url}" alt="Memory image" loading="lazy" />`)
                  .join("")}</div>`
              : ""
          }
          <p class="flip-hint">Click or press Enter to reveal recipe.</p>
        </div>
        <div class="memory-card-face memory-card-back" style="background-color:${recipe.color || "#FDE2E4"}; font-family:'${recipe.font || "Caveat"}', cursive;">
          <div class="recipe-block">
            <h4>Ingredients</h4>
            <p>${escapeHTML(recipe.ingredients || "")}</p>
            <h4>Instructions</h4>
            <p>${escapeHTML(recipe.directions || "")}</p>
          </div>
          <p class="flip-hint">Click or press Enter to return to memory.</p>
        </div>
      </div>
    `;

    const toggleFlip = () => card.classList.toggle("flipped");
    card.addEventListener("click", toggleFlip);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleFlip();
      }
    });

    recipesGrid.appendChild(card);
  }
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function fetchRecipes() {
  const snapshot = await getDocs(collection(db, "recipes"));
  allRecipes = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
  renderRecipes();
}

openFormBtn.addEventListener("click", () => {
  formStatus.textContent = "";
  openForm();
});

closeFormBtn.addEventListener("click", closeForm);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !formModal.classList.contains("hidden")) {
    closeForm();
  }
});

imagesInput.addEventListener("change", listSelectedImages);

categoryFilters.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  activeCategory = target.dataset.category || "all";
  for (const btn of categoryFilters.querySelectorAll(".filter-btn")) {
    btn.classList.toggle("active", btn === target);
  }
  renderRecipes();
});

memoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatus.textContent = "";

  const files = Array.from(imagesInput.files || []);
  if (files.length > 5) {
    formStatus.textContent = "Please upload 5 images or fewer.";
    return;
  }

  if (!memoryForm.checkValidity()) {
    formStatus.textContent = "Please complete all required fields.";
    memoryForm.reportValidity();
    return;
  }

  const categoryChoice = memoryForm.querySelector('input[name="category"]:checked');
  if (!categoryChoice || !CATEGORY_OPTIONS.includes(categoryChoice.value)) {
    formStatus.textContent = "Please choose a valid category.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";
  formStatus.textContent = "Uploading memory artifacts...";

  try {
    const imageUrls = files.length ? await uploadImages(files) : [];
    const formData = new FormData(memoryForm);

    await addDoc(collection(db, "recipes"), {
      title: formData.get("title") || "",
      memory: formData.get("memory") || "",
      ingredients: formData.get("ingredients") || "",
      directions: formData.get("directions") || "",
      category: categoryChoice.value,
      color: formData.get("color") || "#FDE2E4",
      font: formData.get("font") || "Caveat",
      imageUrls,
      createdAt: serverTimestamp(),
    });

    formStatus.textContent = "Memory published.";
    memoryForm.reset();
    resetOptionDefaults();
    selectedImagesList.innerHTML = "";
    closeForm();
    await fetchRecipes();
  } catch (error) {
    console.error(error);
    formStatus.textContent = "Could not submit memory. Check Firebase config/rules.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Recipe";
  }
});

fetchRecipes().catch((error) => {
  console.error(error);
  formStatus.textContent =
    "Could not load memories. Check Firebase Firestore permissions/configuration.";
});

setupOptionButtons();
