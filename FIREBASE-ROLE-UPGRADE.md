# 🔑 Cara Upgrade User Jadi Lecturer di Database Learning Lab

## 📍 Problem Statement

User dengan UID `QnSeYKDzPbyZLjObLrNpZr4Epedg` seharusnya sebagai **lecturer** tapi terdeteksi sebagai **student**.

## 🎯 Root Cause

1. Role assignment **server-side only** (security requirement)
2. Client dapat hanya membuat profile sebagai `'student'`
3. Field `role` tidak bisa diubah via app (immutable after creation)
4. Auth store cache role di localStorage → perlu clear cache setelah update

## ✅ Solution (3 Methods)

### Method 1: Firebase Console (EASIEST - RECOMMENDED)

#### Langkah-langkah:

1. **Buka Firebase Console**
   ```
   https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore/data
   ```

2. **Navigate ke Users Collection**
   - Click "Start collection" jika belum ada `/users` collection
   - Create document atau find existing document
   - Document ID = `QnSeYKDzPbyZLjObLrNpZr4Epedg`

3. **Edit Document Fields**
   
   Existing fields (should have):
   ```javascript
   {
     uid: "QnSeYKDzPbyZLjObLrNpZr4Epedg",
     displayName: "John Doe",
     email: "john@university.edu",
     role: "student",      // ← Change this!
     createdAt: "2024-01-15T10:30:00.000Z"
   }
   ```
   
   Update menjadi:
   ```javascript
   {
     uid: "QnSeYKDzPbyZLjObLrNpZr4Epedg",
     displayName: "John Doe",
     email: "john@university.edu",
     role: "lecturer",     // ✅ CHANGED FROM 'student'
     createdAt: "2024-01-15T10:30:00.000Z"
   }
   ```

4. **Save Changes**
   - Click "Update" button
   - Wait for confirmation message

5. **Clear Browser Cache & Re-login**
   ```javascript
   // In browser DevTools console (F12):
   localStorage.removeItem('dblab:auth-profile:QnSeYKDzPbyZLjObLrNpZr4Epedg')
   location.reload()
   ```

6. **Verify New Role**
   - Should now see: "Welcome back, John Doe (Lecturer)"
   - Access to Assignment Management page
   - Grading interface visible

---

### Method 2: Firebase CLI (FOR DEVELOPERS)

```bash
# Install Firebase Tools if not already installed
npm install -g firebase-tools

# Login and select your project
firebase login
firebase use YOUR_PROJECT_ID

# Export Firestore credentials (get from Firebase Console > Project Settings > Service Accounts)
firebase setup

# Use Firestore shell to update role
firebase firestore:shell

# Then in interactive shell:
const db = getFirestore();
const userRef = doc(db, 'users', 'QnSeYKDzPbyZLjObLrNpZr4Epedg');
await setDoc(userRef, {
  role: 'lecturer'
}, { merge: true });

// Exit
.exit()
```

Or directly via command line:

```bash
# Using GCloud gcp-authenticated access
firebase firestore run-update \
  --collection=users \
  --document-id=QnSeYKDzPbyZLjObLrNpZr4Epedg \
  --data='{"role":"lecturer"}'
```

---

### Method 3: Admin SDK Node.js Script

Create `scripts/upgrade-role.js`:

```javascript
#!/usr/bin/env node
// Upgrade user role programmatically

const admin = require('firebase-admin');
const serviceAccount = require('../path-to-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node scripts/upgrade-role.js <USER_UID>');
  console.error('Example: node scripts/upgrade-role.js QnSeYKDzPbyZLjObLrNpZr4Epedg');
  process.exit(1);
}

async function upgradeRole() {
  try {
    await admin.firestore().doc(`users/${userId}`).set(
      { role: 'lecturer' },
      { merge: true }
    );
    console.log(`✅ Successfully upgraded ${userId} to lecturer`);
    
    // Verify
    const snapshot = await admin.firestore().doc(`users/${userId}`).get();
    console.log('Current role:', snapshot.data()?.role);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

upgradeRole();
```

Run it:
```bash
node scripts/upgrade-role.js QnSeYKDzPbyZLjObLrNpZr4Epedg
```

---

## 🔒 Security Notes

### Why Server-Side Only?

Firestore security rules prevent client modification:

```javascript
allow update: if signedIn() 
  && request.auth.uid == uid 
  && request.resource.data.role == resource.data.role;
```

This means:
- Can read own profile ✅
- Can update non-sensitive fields ✅
- Cannot change `role` field ❌ (must stay same value)
- Only server/admin can modify role ✅

### Security Benefits

1. **Prevents privilege escalation**: Students cannot promote themselves
2. **Audit trail**: All changes logged in Firestore audit logs
3. **Enforced by rules**: Even with admin access, must use authenticated admin SDK
4. **Immutable history**: Once set to 'lecturer', cannot revert without explicit update

### What Lecturers Can Do

With `role: 'lecturer'`, user gains access to:
- ✅ Create new assignments
- ✅ Edit/publish/unpublish assignments  
- ✅ View student submissions
- ✅ Grade submissions
- ✅ Add feedback comments
- ❌ Delete other users' projects (restricted)
- ❌ Modify system settings (not available yet)

---

## ⚠️ Troubleshooting

### Issue 1: Still showing as student after update

**Cause:** Auth store cached old role

**Solution:**
```javascript
// Clear all auth-related cache
localStorage.clear();
location.reload();
```

OR specifically:
```javascript
localStorage.removeItem('dblab:auth-profile:QnSeYKDzPbyZLjObLrNpZr4Epedg');
localStorage.removeItem('dblab:ui-theme');
location.reload();
```

### Issue 2: Document not found at /users/{uid}

**Cause:** User never completed signup/profile creation

**Solution:** Create document first:
```javascript
{
  uid: "QnSeYKDzPbyZLjObLrNpZr4Epedg",
  displayName: "Your Name",
  email: "email@example.com",
  role: "lecturer",
  createdAt: "2024-01-20T00:00:00.000Z"
}
```

### Issue 3: Firebase Console shows updated but app doesn't reflect

**Cause:** Multiple browser tabs open with different sessions

**Solution:** Close ALL tabs and re-open fresh session.

---

## 📋 Quick Reference Checklist

- [ ] UID identified correctly
- [ ] Firebase Console accessed
- [ ] `/users/{uid}` document exists
- [ ] `role` field changed from `"student"` → `"lecturer"`
- [ ] Save changes confirmed
- [ ] Browser localStorage cleared
- [ ] User re-logged in
- [ ] Verified lectuerer dashboard visible
- [ ] Tested assignment creation workflow
- [ ] Tested submission review interface

---

## 🆘 Need Help?

If you encounter issues:

1. Check Firebase Console logs (`logs:firestore`)
2. Verify Firestore rules are deployed correctly
3. Ensure no firewall/proxy blocking Firebase SDK
4. Review browser console for errors
5. Check that Firebase configuration is correct

---

*Last updated: During autonomous session — v0.1.0*
