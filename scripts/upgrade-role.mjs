#!/usr/bin/env node
/**
 * Upgrade user role in Firestore Database Learning Lab
 * 
 * Usage:
 *   node scripts/upgrade-role.mjs <UID> <ROLE>
 *   Example: node scripts/upgrade-role.mjs QnSeYKDzPbyZLjObLrNpZr4Epedg lecturer
 */

import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
if (!process.env.VITE_FIREBASE_API_KEY) {
  try {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    const lines = envContent.split('\n');
    lines.forEach(line => {
      const match = line.match(/^(VITE_FIREBASE_([A-Z0-9]+))=(.+)$/);
      if (match) {
        process.env[match[1]] = match[3].replace(/^["']|["']$/g, '');
      }
    });
  } catch (error) {
    console.error('Warning: Could not load .env file');
  }
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || '',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID || ''
};

// Validate arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('🔧 Database Learning Lab — User Role Upgrader');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/upgrade-role.mjs <USER_UID> <ROLE>');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/upgrade-role.mjs QnSeYKDzPbyZLjObLrNpZr4Epedg lecturer');
  console.log('  node scripts/upgrade-role.mjs abc123 student');
  console.log('');
  console.log('Available roles:');
  console.log('  - student (default for new users)');
  console.log('  - lecturer (requires manual approval)');
  process.exit(0);
}

const uid = args[0];
const newRole = args[1];

if (!['student', 'lecturer'].includes(newRole)) {
  console.error(`❌ Invalid role "${newRole}". Must be one of: student, lecturer`);
  process.exit(1);
}

async function upgradeUserRole() {
  // Initialize Firebase only once
  let app;
  try {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig, 'role-upgrade-tool');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    console.log('');
    console.log('Please ensure your .env file contains valid Firebase config:');
    console.log('  VITE_FIREBASE_API_KEY=...');
    console.log('  VITE_FIREBASE_AUTH_DOMAIN=...');
    console.log('  VITE_FIREBASE_PROJECT_ID=...');
    console.log('  VITE_FIREBASE_APP_ID=...');
    process.exit(1);
  }

  const db = getFirestore(app);

  console.log(`📝 Upgrading role for UID: ${uid}`);
  console.log(`New role: ${newRole}`);
  console.log('');

  try {
    // Read current document to show before/after comparison
    const userRef = doc(db, 'users', uid);
    const snapshot = await doc(db, 'users', uid).get();
    
    let oldRole = null;
    if (snapshot.exists()) {
      const data = snapshot.data();
      oldRole = data.role || 'not set';
      console.log('Current profile:');
      console.log('  uid:', data.uid);
      console.log('  displayName:', data.displayName || '(empty)');
      console.log('  email:', data.email || '(empty)');
      console.log('  role:', oldRole);
      console.log('  createdAt:', data.createdAt || '(empty)');
      console.log('');
    } else {
      console.log('⚠️ No existing document found. Creating new profile...');
      console.log('');
    }

    // Update with merge to preserve other fields
    await setDoc(userRef, {
      uid,
      role: newRole
    }, { merge: true });

    console.log('✅ Successfully updated role to:', newRole);
    console.log('');

    // Verify the update
    const verifySnapshot = await userRef.get();
    const verifyData = verifySnapshot.data();
    console.log('Verification:');
    console.log('  Current role:', verifyData?.role);
    console.log('  UID matches:', verifyData?.uid === uid);
    console.log('');

    if (verifyData?.role !== newRole) {
      console.error('⚠️ Warning: Role did not persist. Check Firestore rules.');
      process.exit(1);
    }

    console.log('🎉 Role upgrade complete!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Clear browser localStorage cache');
    console.log('     localStorage.removeItem("dblab:auth-profile:' + uid + '")');
    console.log('  2. Reload page and re-login');
    console.log('');
    console.log('If you still see the old role after reload:');
    console.log('  - Try incognito/private window');
    console.log('  - Check browser DevTools → Application → Local Storage');
    console.log('  - Delete "dblab:auth-profile:" entry manually');

  } catch (error) {
    console.error('❌ Error during upgrade:', error.message);
    console.log('');
    console.log('Common issues:');
    console.log('  - Firestore rules blocking write operation');
    console.log('  - Invalid Firebase configuration');
    console.log('  - Network connectivity problems');
    console.log('');
    console.log('Debug tip: Check browser DevTools Console for detailed errors');
    process.exit(1);
  }
}

upgradeUserRole();
