// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ⛔ Ersetze das durch deine echten Firebase-Daten
const firebaseConfig = {
  apiKey: "AIzaSyCddNTIlzKEN6Jc7hQTQGZXrPMHZujUhBA",
  authDomain: "impostor-91214.firebaseapp.com",
  projectId: "impostor-91214",
  storageBucket: "impostor-91214.firebasestorage.app",
  messagingSenderId: "278880540346",
  appId: "1:278880540346:web:5d07473b7ee92dd118d483"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
