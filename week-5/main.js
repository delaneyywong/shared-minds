import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBLgyhmVYfIT9cQss8B3_3GvTJmja04Vi4",
    authDomain: "sharedminds-project-1.firebaseapp.com",
    projectId: "sharedminds-project-1",
    storageBucket: "sharedminds-project-1.firebasestorage.app",
    messagingSenderId: "525795225053",
    appId: "1:525795225053:web:7b727e412441ba00d81a34",
    measurementId: "G-WESFNNG9HJ"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function sendMessage() {
    const name = document.getElementById("name").value;
    const message = document.getElementById("message").value;
  
    await addDoc(collection(db, "messages"), {
      name: name,
      message: message,
      timestamp: Date.now()
    });
  }
  
  window.sendMessage = sendMessage;

  const messagesDiv = document.getElementById("messages");

onSnapshot(collection(db, "messages"), (snapshot) => {
  messagesDiv.innerHTML = "";

  snapshot.forEach((doc) => {
    const data = doc.data();
    const div = document.createElement("div");
    div.innerText = data.name + ": " + data.message;
    messagesDiv.appendChild(div);
  });
});