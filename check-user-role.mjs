import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import readline from 'readline';

// Load Firebase config
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  appId: process.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

try {
  const app = initializeApp(firebaseConfig, 'role-check');
  const db = getFirestore(app);
  const uid = "QnSeYKDzPbyZLjObLrNpZr4Epedg";
  
  console.log(`Checking user profile for UID: ${uid}`);
  
  const userRef = doc(db, 'users', uid);
  const snapshot = await getDoc(userRef);
  
  if (!snapshot.exists()) {
    console.log("❌ User document NOT found!");
    console.log("Solution: Create document at /users/QnSeYKDzPbyZLjObLrNpZr4Epedg");
    console.log("Fields needed:");
    console.log("  - uid: string (required)");
    console.log("  - role: string ('student' or 'lecturer')");
    console.log("  - displayName: string");
    console.log("  - email: string");
    console.log("  - createdAt: ISO timestamp");
    process.exit(1);
  }
  
  const data = snapshot.data();
  console.log("✅ User document EXISTS");
  console.log("\nCurrent fields:");
  Object.entries(data).forEach(([key, value]) => {
    console.log(`  ${key}: ${value} (${typeof value})`);
  });
  
  if (data.role === 'lecturer') {
    console.log("\n🎉 Role is CORRECTLY set to 'lecturer'");
    console.log("If still showing as student, clear localStorage cache and reload.");
  } else if (data.role === 'student') {
    console.log("\n⚠️ Role is 'student' - UPGRADE NEEDED");
    console.log("Run: firebase firestore update users/${uid} '{\"role\":\"lecturer\"}'");
  } else {
    console.log(`\n⚠️ Unexpected role: ${data.role}`);
  }
  
} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
