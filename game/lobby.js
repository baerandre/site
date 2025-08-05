// lobby.js
import {
  collection, doc, setDoc, getDoc, onSnapshot,
  updateDoc, serverTimestamp, deleteDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";

const SPIEL_ID = "hauptspiel";
let userId = localStorage.getItem("userId") || null;
let userName = "";
let istHost = false;

async function beitreten() {
  const nameInput = document.getElementById("nameInput");
  const name = nameInput.value.trim();
  if (!name) return alert("Bitte gib einen Namen ein.");

  if (!userId) {
    userId = "user_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("userId", userId);
  }

  const spielerRef = doc(db, "spiele", SPIEL_ID, "spieler", userId);
  await setDoc(spielerRef, {
    name: name,
    joinedAt: serverTimestamp(),
  });

  userName = name;
  istHost = await checkObHost();

  document.getElementById("joinArea").style.display = "none";
  document.getElementById("lobbyArea").style.display = "block";
  document.getElementById("spielerName").textContent = userName;

  if (istHost) {
    document.getElementById("hostControls").style.display = "block";
  }

  liveSpielerAnzeigen();
}

async function checkObHost() {
  const snapshot = await getDoc(doc(db, "spiele", SPIEL_ID));
  if (!snapshot.exists()) {
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

// ✅ SPIEL STARTEN (Host)
async function spielStarten() {
  const kategorieInput = document.getElementById("kategorieInput");
  const kategorie = kategorieInput.value.trim();
  if (!kategorie) return alert("Bitte gib eine Kategorie ein.");

  // 1. Spieler holen
  const spielerSnapshot = await getDocs(collection(db, "spiele", SPIEL_ID, "spieler"));
  const ids = [];
  spielerSnapshot.forEach(doc => ids.push(doc.id));

  // 2. Impostor wählen
  const impostorId = ids[Math.floor(Math.random() * ids.length)];

  // 3. Rollen speichern
  for (const id of ids) {
    const rolle = id === impostorId ? "impostor" : "innocent";
    await updateDoc(doc(db, "spiele", SPIEL_ID, "spieler", id), { rolle });
  }

  // 4. Begriffe laden (nur Innocents)
  const begriffeSnap = await getDocs(collection(db, "spiele", SPIEL_ID, "begriffe"));
  const möglicheWorte = [];
  begriffeSnap.forEach(doc => {
    if (doc.id !== impostorId) {
      möglicheWorte.push(doc.data().wort);
    }
  });

  // 5. Wort wählen
  const wort = möglicheWorte[Math.floor(Math.random() * möglicheWorte.length)];

  // 6. Spielzustand speichern
  await updateDoc(doc(db, "spiele", SPIEL_ID), {
    kategorie: kategorie,
    phase: "hinweisrunde",
    impostor: impostorId,
    wort: wort
  });

  alert("Spiel wurde gestartet!");
  // Optional: Weiterleitung z. B. window.location.href = "spiel.html";
}

// ✅ LOBBY VERLASSEN
async function lobbyVerlassen() {
  if (!userId) return;
  await deleteDoc(doc(db, "spiele", SPIEL_ID, "spieler", userId));
  await deleteDoc(doc(db, "spiele", SPIEL_ID, "begriffe", userId));
  localStorage.removeItem("userId");
  alert("Du hast die Lobby verlassen.");
  location.reload(); // oder window.location.href = "index.html";
}

window.beitreten = beitreten;
window.spielStarten = spielStarten;
window.lobbyVerlassen = lobbyVerlassen;
