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

// 🔁 BEITRETEN
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
  ladeKategorieLive();
  ladeHostLive();
  beobachtePhaseUndLeiteWeiter();
}

// 🔁 PHASENÄNDERUNG BEOBACHTEN UND WEITERLEITEN
function beobachtePhaseUndLeiteWeiter() {
  const spielRef = doc(db, "spiele", SPIEL_ID);
  let aktuellePhase = null;

  onSnapshot(spielRef, (docSnap) => {
    const data = docSnap.data();
    const neuePhase = data?.phase;

    // Nur reagieren, wenn Phase sich ändert
    if (aktuellePhase !== neuePhase && neuePhase === "begriff_sammeln") {
      if (!istHost) {
        console.log("→ Spiel startet – Weiterleitung zu spiel.html");
        window.location.href = "spiel.html";
      }
    }
    aktuellePhase = neuePhase;
  });
}

// 🔁 PRÜFEN, OB HOST
async function checkObHost() {
  const spielDocRef = doc(db, "spiele", SPIEL_ID);
  const spielDoc = await getDoc(spielDocRef);

  // Falls Spiel-Dokument fehlt, ist das der erste Spieler → Host
  if (!spielDoc.exists()) {
    await setDoc(spielDocRef, {
      erstelltAm: serverTimestamp(),
      phase: "wartend" // neue Standardphase
    });
    return true;
  }

  // Host vorhanden? → prüfen, ob aktiv
  const spielerSnap = await getDocs(collection(db, "spiele", SPIEL_ID, "spieler"));
  const alleSpieler = [];
  spielerSnap.forEach(doc => alleSpieler.push(doc.id));

  // Wurde bereits ein Host markiert?
  const currentData = spielDoc.data();
  if (!currentData.host || !alleSpieler.includes(currentData.host)) {
    // Host fehlt oder ist weg → neuen Host setzen (erster in Liste)
    const neuerHost = alleSpieler[0];
    await updateDoc(spielDocRef, { host: neuerHost });
  }

  return currentData.host === userId;
}

// 🔁 HOST ANZEIGEN
function ladeHostLive() {
  const spielRef = doc(db, "spiele", SPIEL_ID);
  onSnapshot(spielRef, async (docSnap) => {
    const data = docSnap.data();
    if (data?.host) {
      const hostNameDoc = await getDoc(doc(db, "spiele", SPIEL_ID, "spieler", data.host));
      const hostName = hostNameDoc.exists() ? hostNameDoc.data().name : "unbekannt";
      const el = document.getElementById("hostInfo");
      if (el) el.textContent = `👑 Host: ${hostName}`;
    }
  });
}

// 🔁 LOBBY LIVE AKTUALISIEREN
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

// ✅ SPIEL STARTEN
async function spielStarten() {
  const kategorieInput = document.getElementById("kategorieInput");
  const kategorie = kategorieInput.value.trim();
  if (!kategorie) return alert("Bitte gib eine Kategorie ein.");

  if (!istHost) {
    alert("Nur der Host kann das Spiel starten.");
    return;
  }

  // Setze Kategorie und Spielphase
  await updateDoc(doc(db, "spiele", SPIEL_ID), {
    kategorie: kategorie,
    phase: "begriff_sammeln"
  });

  // Host wird sofort weitergeleitet
  window.location.href = "spiel.html";
}

// ✅ LOBBY VERLASSEN
async function lobbyVerlassen() {
  if (!userId) {
    alert("Keine gültige Benutzer-ID gefunden.");
    return;
  }

  try {
    await deleteDoc(doc(db, "spiele", SPIEL_ID, "spieler", userId));
    await deleteDoc(doc(db, "spiele", SPIEL_ID, "begriffe", userId));
    localStorage.removeItem("userId");
    alert("Du hast die Lobby verlassen.");
    window.location.reload();
  } catch (err) {
    console.error("Fehler beim Verlassen der Lobby:", err);
    alert("Fehler beim Verlassen. Bitte versuche es erneut.");
  }
}

// 🔁 KATEGORIE LIVE LADEN
function ladeKategorieLive() {
  const spielRef = doc(db, "spiele", SPIEL_ID);

  onSnapshot(spielRef, (docSnap) => {
    const data = docSnap.data();
    if (data?.kategorie) {
      const kategorieAnzeigen = document.getElementById("kategorieAnzeige");
      if (kategorieAnzeigen) {
        kategorieAnzeigen.textContent = `📘 Kategorie: ${data.kategorie}`;
      }
    }
  });
}

window.beitreten = beitreten;
window.spielStarten = spielStarten;
window.lobbyVerlassen = lobbyVerlassen;
