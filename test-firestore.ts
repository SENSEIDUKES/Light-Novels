import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const q = query(collection(db, 'stories'));
  const snapshot = await getDocs(q);
  console.log('Total stories in DB:', snapshot.size);
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data().title);
  });
}

run().catch(console.error);
