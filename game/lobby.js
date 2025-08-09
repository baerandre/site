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
    const neuePhase = data?.phase || "wartend";

    if (aktuellePhase !== null && aktuellePhase !== neuePhase && neuePhase === "begriff_sammeln") {
      if (!istHost) window.location.href = "spiel.html";
    }
    aktuellePhase = neuePhase;
    if (aktuellePhase !== neuePhase && neuePhase === "hinweisrunde") {
  // alle (inkl. Host, falls noch hier) rüber zur Runde
  window.location.href = "runde.html";
  }
  });
}



// 🔁 PRÜFEN, OB HOST
async function checkObHost() {
  const spielDocRef = doc(db, "spiele", SPIEL_ID);
  const spielDoc = await getDoc(spielDocRef);

  // 1) Erstes Spiel-Dokument anlegen → DIESER Spieler wird Host
  if (!spielDoc.exists()) {
    await setDoc(spielDocRef, {
      erstelltAm: serverTimestamp(),
      phase: "wartend",
      host: userId
    });
    return true; // du bist Host
  }

  // 2) Prüfen, ob aktueller Host gültig ist
  const spielerSnap = await getDocs(collection(db, "spiele", SPIEL_ID, "spieler"));
  const alleSpieler = [];
  spielerSnap.forEach(d => alleSpieler.push(d.id));

  const data = spielDoc.data();
  const hostAktuell = data?.host;

  // 2a) Host fehlt oder ist nicht mehr in der Lobby → neuen Host wählen
  if (!hostAktuell || !alleSpieler.includes(hostAktuell)) {
    const neuerHost = alleSpieler[0]; // erster gelisteter Spieler
    if (neuerHost) {
      await updateDoc(spielDocRef, { host: neuerHost, phase: "wartend" });
      return neuerHost === userId;
    }
    return false; // (sollte praktisch nie passieren)
  }

  // 3) Host ist gesetzt → bist DU der Host?
  return hostAktuell === userId;
}



// 🔁 HOST ANZEIGEN
function ladeHostLive() {
  const spielRef = doc(db, "spiele", SPIEL_ID);
  onSnapshot(spielRef, async (docSnap) => {
    const data = docSnap.data();
    const hostId = data?.host || null;

    // Host-Name anzeigen
    if (hostId) {
      const hostNameDoc = await getDoc(doc(db, "spiele", SPIEL_ID, "spieler", hostId));
      const hostName = hostNameDoc.exists() ? hostNameDoc.data().name : "unbekannt";
      const el = document.getElementById("hostInfo");
      if (el) el.textContent = `👑 Host: ${hostName}`;
    }

    // Host-Controls umschalten
    const controls = document.getElementById("hostControls");
    const binIchHost = hostId === userId;
    istHost = binIchHost; // Status mitschreiben
    if (controls) controls.style.display = binIchHost ? "block" : "none";
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

  await updateDoc(doc(db, "spiele", SPIEL_ID), {
    kategorie: kategorie,
    phase: "begriff_sammeln"
  });

  // Host sofort weiterleiten
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

// ✅ ROLLEN VERGEBEN & WORT ZIEHEN (nur Host)
import { query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; // oben zu deinen Imports ergänzen

async function rollenVergebenUndStarten() {
  if (!istHost) {
    alert("Nur der Host kann die Rollen vergeben.");
    return;
  }

  // 1) Alle Spieler holen
  const spielerCol = collection(db, "spiele", SPIEL_ID, "spieler");
  const spielerSnap = await getDocs(spielerCol);
  const spielerIds = [];
  spielerSnap.forEach(d => spielerIds.push(d.id));

  if (spielerIds.length < 3) {
    alert("Mindestens 3 Spieler empfohlen, um zu starten.");
    return;
  }

  // 2) Begriffe holen
  const begriffeCol = collection(db, "spiele", SPIEL_ID, "begriffe");
  const begriffeSnap = await getDocs(begriffeCol);
  const begriffeMap = {}; // {userId: wort}
  begriffeSnap.forEach(d => begriffeMap[d.id] = (d.data()?.wort || "").trim());

  // Prüfen, ob jeder einen Begriff hat (oder zumindest 2)
  const gueltigeEintraege = Object.keys(begriffeMap).filter(id => begriffeMap[id]);
  if (gueltigeEintraege.length < Math.max(2, spielerIds.length - 1)) {
    alert("Es sind noch nicht genug Begriffe eingereicht.");
    return;
  }

  // 3) Impostor wählen
  const impostorId = spielerIds[Math.floor(Math.random() * spielerIds.length)];

  // 4) Rollen speichern
  for (const id of spielerIds) {
    const rolle = id === impostorId ? "impostor" : "innocent";
    await updateDoc(doc(db, "spiele", SPIEL_ID, "spieler", id), { rolle });
  }

  // 5) Wort ziehen (nicht vom Impostor)
  const kandidaten = gueltigeEintraege.filter(id => id !== impostorId);
  const wort = begriffeMap[kandidaten[Math.floor(Math.random() * kandidaten.length)]];

  // 6) Spiel-Dokument updaten → Start der Hinweisrunde
  await updateDoc(doc(db, "spiele", SPIEL_ID), {
    impostor: impostorId,
    wort: wort,
    phase: "hinweisrunde"
  });

  // Host direkt in die Runde schicken
  window.location.href = "runde.html";
}
window.rollenVergebenUndStarten = rollenVergebenUndStarten;

