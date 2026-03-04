// Firebase initialization using the provided configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// Use the Firebase database configuration that is already provided
const firebaseConfig = {
  apiKey: "AIzaSyDHt3vGnGq_6JBVH_00ecdwnK780wg_h8Y",
  authDomain: "sharedminds-project-2.firebaseapp.com",
  projectId: "sharedminds-project-2",
  storageBucket: "sharedminds-project-2.firebasestorage.app",
  messagingSenderId: "490708693269",
  appId: "1:490708693269:web:f4ab969b334c5cca6bf91c",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const authBtn = document.getElementById("auth-btn");
const userInfo = document.getElementById("user-info");
const userNameEl = document.getElementById("user-name");
const boardEl = document.getElementById("board");
const authBanner = document.getElementById("auth-banner");

let currentUser = null;

const CATEGORIES = [
  { id: "animal", label: "Favorite Animal", hint: "Dogs, cats, red pandas..." },
  { id: "color", label: "Favorite Color", hint: "Hex codes welcome too." },
  { id: "food", label: "Favorite Food", hint: "Comfort meals or late-night snacks." },
  { id: "movie", label: "Favorite Movie", hint: "What do you rewatch endlessly?" },
  { id: "restaurant", label: "Favorite Restaurant", hint: "Local spots or chains." },
  { id: "season", label: "Favorite Season", hint: "Spring, summer, fall, winter..." },
  { id: "sport", label: "Favorite Sport", hint: "To watch or to play." },
  { id: "boardgame", label: "Favorite Board Game", hint: "Catan, Monopoly, Game of Life..." },
];

// Keep track of list containers per category so we can render into them
const listElementsByCategory = {};

function showAuthBanner(show) {
  if (!authBanner) return;
  authBanner.classList.toggle("auth-banner--hidden", !show);
}

// Build one sticky note for each category
function buildBoard() {
  CATEGORIES.forEach((category, index) => {
    const sticky = document.createElement("article");
    sticky.className = "sticky";

    // Give each sticky a different color accent
    const palette = ["sticky--orange", "sticky--blue", "sticky--pink", "sticky--green"];
    sticky.classList.add(palette[index % palette.length]);

    const pin = document.createElement("div");
    pin.className = "sticky__pin";

    const title = document.createElement("h2");
    title.className = "sticky__title";
    title.textContent = category.label;

    const subtitle = document.createElement("p");
    subtitle.className = "sticky__subtitle";
    subtitle.textContent = category.hint;

    const list = document.createElement("div");
    list.className = "sticky__list";

    const form = document.createElement("form");
    form.className = "sticky__form";
    form.dataset.categoryId = category.id;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "sticky__input";
    input.placeholder = "Add your favorite...";
    input.autocomplete = "off";

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn btn--primary sticky__submit";
    submit.textContent = "Add";

    const hint = document.createElement("p");
    hint.className = "sticky__hint";
    hint.textContent = "Sign in to add your favorite to this list.";

    form.appendChild(input);
    form.appendChild(submit);

    sticky.appendChild(pin);
    sticky.appendChild(title);
    sticky.appendChild(subtitle);
    sticky.appendChild(list);
    sticky.appendChild(form);
    sticky.appendChild(hint);

    boardEl.appendChild(sticky);

    // Store the list so we can render into it from Firestore listeners
    listElementsByCategory[category.id] = list;

    // Handle submitting a new favorite for this category
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) return;

      if (!currentUser) {
        showAuthBanner(true);
        setTimeout(() => showAuthBanner(false), 2000);
        return;
      }

      try {
        await addDoc(collection(db, "favorites"), {
          category: category.id,
          value,
          userId: currentUser.uid,
          userName: currentUser.displayName || "Anonymous",
          timestamp: serverTimestamp(),
        });
        input.value = "";
      } catch (error) {
        console.error("Error adding favorite:", error);
        alert("Could not save your favorite. Please try again.");
      }
    });
  });
}

function renderFavorites(categoryId, docs) {
  const listEl = listElementsByCategory[categoryId];
  if (!listEl) return;

  listEl.innerHTML = "";

  if (!docs.length) {
    const empty = document.createElement("p");
    empty.className = "sticky__hint";
    empty.textContent = "No favorites yet. Be the first!";
    listEl.appendChild(empty);
    return;
  }

  docs.forEach((docSnap) => {
    const data = docSnap.data();
    const item = document.createElement("div");
    item.className = "favorite";

    const nameSpan = document.createElement("span");
    nameSpan.className = "favorite__name";
    nameSpan.textContent = `${data.userName || "Anonymous"}:`;

    const valueSpan = document.createElement("span");
    valueSpan.className = "favorite__value";
    valueSpan.textContent = data.value;

    item.appendChild(nameSpan);
    item.appendChild(valueSpan);

    listEl.appendChild(item);
  });
}

// Listen in real time for each category's favorites
function attachCategoryListeners() {
  CATEGORIES.forEach((category) => {
    const q = query(
      collection(db, "favorites"),
      where("category", "==", category.id),
      orderBy("timestamp", "desc"),
    );

    onSnapshot(
      q,
      (snapshot) => {
        renderFavorites(category.id, snapshot.docs);
      },
      (error) => {
        console.error(`Error listening to ${category.id} favorites:`, error);
      },
    );
  });
}

// Authentication handlers

authBtn.addEventListener("click", async () => {
  if (currentUser) {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
    return;
  }

  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Error signing in:", error);
    alert("Sign-in failed. Please try again.");
  }
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (user) {
    authBtn.textContent = "Sign out";
    userInfo.classList.remove("user-info--hidden");
    userNameEl.textContent = user.displayName || "Unknown user";
  } else {
    authBtn.textContent = "Sign in with Google";
    userInfo.classList.add("user-info--hidden");
    userNameEl.textContent = "";
  }
});

// Initial page setup
buildBoard();
attachCategoryListeners();
