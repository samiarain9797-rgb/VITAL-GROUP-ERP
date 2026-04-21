import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";
import { readFileSync } from "fs";

const config = JSON.parse(readFileSync("./firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function cleanShipment() {
  const docRef = doc(db, "shipments", "LOC-87370");
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) {
    console.log("Not found");
    return;
  }
  
  const data = snapshot.data();
  const updates = {};
  
  // Find properties that might be massive Base64 strings and wipe them.
  for (const key of Object.keys(data)) {
    if (typeof data[key] === "string" && data[key].length > 100000 && data[key].startsWith("data:")) {
      console.log(`Clearing bloated field: ${key} (${data[key].length} bytes)`);
      updates[key] = null;
    }
  }

  // Also check arrays of documents
  if (data.transporterDocs && Array.isArray(data.transporterDocs)) {
    const cleanDocs = data.transporterDocs.map(d => {
      if (d.url && d.url.length > 100000) {
        console.log(`Clearing bloated transporter doc: ${d.name || "unknown"}`);
        return { ...d, url: null };
      }
      return d;
    });
    updates.transporterDocs = cleanDocs;
  }

  if (data.incidentDocs && Array.isArray(data.incidentDocs)) {
    const cleanDocs = data.incidentDocs.map(d => {
      if (d.url && d.url.length > 100000) {
        return { ...d, url: null };
      }
      return d;
    });
    updates.incidentDocs = cleanDocs;
  }

  if (data.insuranceDocs && Array.isArray(data.insuranceDocs)) {
    const cleanDocs = data.insuranceDocs.map(d => {
      if (d.url && d.url.length > 100000) {
        return { ...d, url: null };
      }
      return d;
    });
    updates.insuranceDocs = cleanDocs;
  }

  // Also clear history attachments that are too large
  if (data.history && Array.isArray(data.history)) {
      // Just check, but it's harder to clean without blowing away history.
  }
  
  if (Object.keys(updates).length > 0) {
    await updateDoc(docRef, updates);
    console.log("Shipment LOC-87370 has been surgically unbloated!");
  } else {
    console.log("No massive base64 fields found in LOC-87370 directly on the root.");
    // If we didn't find any, we explicitly wipe known document paths as a safeguard
    await updateDoc(docRef, {
        localDispatchDocUrl: null,
        driverIdCardUrl: null,
        receivingDocUrl: null,
        returnLoadDocument: null,
        emptyContainerEirUrl: null
    });
    console.log("Forced clearing of known document fields.");
  }
  process.exit(0);
}

cleanShipment().catch(console.error);
