# Cara Upgrade User Menjadi Lecturer

## Masalah
UID `QnSeYKDzPbyZLjObLrNpZr4Epedg` adalah lecturer tapi terdeteksi sebagai `student` karena role tidak bisa diubah dari client side.

## Solusi
Role `lecturer` harus di-set langsung di Firestore melalui **Firebase Console**.

### Langkah 1: Buka Firebase Console
1. Login ke [Firebase Console](https://console.firebase.google.com)
2. Pilih project Database Learning Lab
3. Navigate ke **Firestore Database**

### Langkah 2: Update User Document
1. Find document `/users/QnSeYKDzPbyZLjObLrNpZr4Epedg`
2. Edit document
3. Add/update field:
   - **Field name:** `role`
   - **Type:** String
   - **Value:** `"lecturer"`
4. Save changes

### Alternative: Using Node.js Script

If you have npm install:

```bash
node scripts/upgrade-lecturer.js QnSeYKDzPbyZLjObLrNpZr4Epedg
```

(See script below if you haven't created it yet)

### Verification

After update, logout and login again. The user should now see:
- "Lecturer Dashboard" instead of "Student View"
- Access to assignment creation tools
- Submission grading interface

---

## Technical Context

### Why Can't Client Change Role?
Security rule enforces server-side role grants:

```javascript
allow update: if signedIn() && request.auth.uid == uid &&
                request.resource.data.role == resource.data.role;
```

This prevents clients from modifying the `role` field after initial creation (only allows keeping existing role value).

### How Roles Are Granted

1. **Students**: Auto-created as `student` when they sign up
2. **Lecturers**: Manually assigned in Firestore Console or via admin API
3. **Role Cache**: Auth store caches role in localStorage (`dblab:auth-profile:{uid}`)

### Clearing Cached Role (if needed)

If role is updated but still showing as student:
```javascript
// In browser console
localStorage.removeItem('dblab:auth-profile:QnSeYKDzPbyZLjObLrNpZr4Epedg')
window.location.reload()
```

---

## Security Implications

- Lecturer role grants access to:
  - Assignment CRUD operations
  - Submission review & grading
  - Student roster viewing
  
- Never auto-assign lecturer role without verification
- Audit trail: Firestore logs all role changes
