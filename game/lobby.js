// lobby.js
import {
  collection, doc, setDoc, getDoc, onSnapshot, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";

// 🔒 Raum-ID (fester Raum, da du nur einen brauchst)
const SPIEL_ID = "hauptspiel";

// 🧠 Session-Cache
let userId = localStorage.getItem("userId") || null;
let userName = "";
let istHost = false;

async function beitreten() {
  const nameInput = document.getElementById("nameInput");
  const name = nameInput.value.trim();
  if (!name) return alert("Bitte gib einen Namen ein.");

  // Erzeuge User-ID, falls neu
  if (!userId) {
    userId = "user_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("userId", userId);
  }

  // Spielerobjekt im Firestore speichern
  const spielerRef = doc(db, "spiele", SPIEL_ID, "spieler", userId);
  await setDoc(spielerRef, {
    name: name,
    joinedAt: serverTimestamp(),
  });

  userName = name;
  istHost = await checkObHost();

  // UI umschalten
  document.getElementById("joinArea").style.display = "none";
  document.getElementById("lobbyArea").style.display = "block";
  document.getElementById("spielerName").textContent = userName;
  if (istHost) {
    document.getElementById("hostControls").style.display = "block";
  }

  // Spieler live anzeigen
  liveSpielerAnzeigen();
}

async function checkObHost() {
  const spielerCollection = collection(db, "spiele", SPIEL_ID, "spieler");
  const snapshot = await getDoc(doc(db, "spiele", SPIEL_ID));
  if (!snapshot.exists()) {
    // Wenn Spiel-Dokument noch nicht existiert, wird dieser Spieler der Host
    await setDoc(doc(db, "spiele", SPIEL_ID), {
      erstelltAm: serverTimestamp()
    });
    return true;
  }
  return false;
}

function liveSpielerAnzeigen() {
  const spielerListe = document.getElementById("spielerListe");
  const spielerRef = collection(db, "spiele", SPIEL_ID, "spieler");

  onSnapshot(spielerRef, (snapshot) => {
    spielerListe.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement("div");
      div.className = "spieler";
      div.textContent = data.name;
      spielerListe.appendChild(div);
    });
  });
}

async function spielStarten() {
  const kategorieInput = document.getElementById("kategorieInput");
  const kategorie = kategorieInput.value.trim();
  if (!kategorie) return alert("Bitte gib eine Kategorie ein.");

  await updateDoc(doc(db, "spiele", SPIEL_ID), {
    phase: "begriff_sammeln",
    kategorie: kategorie
  });

  alert("Spiel gestartet!");
  // Hier kannst du dann auf die Spiel-Seite weiterleiten, z. B.:
  // window.location.href = "spiel.html";
}

window.beitreten = beitreten;
window.spielStarten = spielStarten;
