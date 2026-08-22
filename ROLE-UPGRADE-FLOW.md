# 🔀 Flow Diagram: User Role Upgrade Process

## Current State → Desired State

```
┌─────────────────────────────────────────────────────────┐
│  PROBLEM                                                  │
│  UID: QnSeYKDzPbyZLjObLrNpZr4Epedg                      │
│  Expected: Lecturer                                       │
│  Actual: Student                                          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  ROOT CAUSE                                             │
│                                                         │
│  Why?                                                   │
│  • Auth flow auto-creates user with role='student'     │
│  • Firestore rules prevent client-side role changes    │
│  • Role field is immutable after initial creation      │
│  • Must be set server-side or admin-only               │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  SOLUTION FLOW                                          │
│                                                         │
│  ┌──────────────┐                                       │
│  │ Firebase     │                                       │
│  │ Console      │ ← Recommended (easiest)              │
│  └──────┬───────┘                                       │
│         │                                                │
│         ▼                                                │
│  Find document: /users/QnSeYKDzPbyZLjObLrNpZr4Epedg     │
│         │                                                │
│         ▼                                                │
│  Edit field: role = "lecturer"                          │
│         │                                                │
│         ▼                                                │
│  Save & exit                                             │
│         │                                                │
│         ▼                                                │
│  Clear browser cache:                                    │
│  localStorage.removeItem('dblab:auth-profile:{uid}')    │
│         │                                                │
│         ▼                                                │
│  Re-login                                               │
│         │                                                │
│         ▼                                                │
│  ✅ Verified as lecturer                                 │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  VERIFICATION                                           │
│                                                         │
│  Check these work:                                     │
│  • Assignment creation form                           │
│  • Submission grading panel                           │
│  • Student roster view                                │
│  • Published assignments listing                      │
└─────────────────────────────────────────────────────────┘
```

## Technical Details

### Authentication Flow

```
User Login (Google/Email)
        ↓
Firebase Auth SDK
        ↓
AuthStore.initAuth()
        ↓
fetchProfile(uid) from Firestore
        ↓
Check profile.role field
        ↓
Cache in localStorage
        ↓
Render UI based on role
```

### Security Architecture

```
┌─────────────────────────────────────────────────┐
│ Client-Side                                      │
│ ┌──────────────────────────────────────────┐   │
│ │ UserProfileComponent                     │   │
│ │ ┌────────────────────────────────────┐  │   │
│ │ │ uid: string                        │  │   │
│ │ │ displayName: string                │  │   │
│ │ │ email: string                      │  │   │
│ │ │ role: 'student' | 'lecturer' ❗   │  │   │
│ │ │ created_at: timestamp              │  │   │
│ │ └────────────────────────────────────┘  │   │
│ └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                    ↓ READ ONLY
┌─────────────────────────────────────────────────┐
│ Firestore Rules                                  │
│ ┌──────────────────────────────────────────┐   │
│ │ Users Collection                          │   │
│ │ ┌────────────────────────────────────┐  │   │
│ │ │ /users/{uid}                       │  │   │
│ │ ├────────────────────────────────────┤  │   │
│ │ │ Allow read:                          │  │   │
│ │ │   if auth.uid == uid                 │  │   │
│ │ ├────────────────────────────────────┤  │   │
│ │ │ Allow create:                        │  │   │
│ │ │   if role == 'student'               │  │   │
│ │ ├────────────────────────────────────┤  │   │
│ │ │ Allow update:                        │  │   │
│ │ │   IF: new_role == old_role          │  │   │
│ │ │   (role immutable!)                  │  │   │
│ │ └────────────────────────────────────┘  │   │
│ └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                    ↓ ADMIN ACCESS
┌─────────────────────────────────────────────────┐
│ Server-Side Tools                               │
│ ┌──────────────────────────────────────────┐   │
│ │ Firebase Admin SDK                        │   │
│ │ - Bypasses security rules                 │   │
│ │ - Direct Firestore access                 │   │
│ │ - Can modify any field                    │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ OR                                              │
│                                                 │
│ ┌──────────────────────────────────────────┐   │
│ │ Firebase Console (Manual)                │   │
│ │ - GUI interface                           │   │
│ │ - No code required                        │   │
│ │ - Immediate effect                        │   │
│ └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Decision Tree

```
Is user supposed to be student?
├─ YES → ✅ Nothing to do
│
└─ NO → Should they be lecturer?
       ├─ YES → Update role via Firebase Console
       │         │
       │         ├─ Success? → Verify dashboard access
       │         └─ Failed?  → Check Firestore rules
       │
       └─ Other role? → Not supported yet
                         │
                         └─ Contact admin to add role type
```

## Common Scenarios

### Scenario A: New Lecturer Hired
```
1. Create account (auto as 'student')
2. HR notifies IT department
3. Admin updates Firestore document
4. User logs out/in
5. ✅ Now has lecturer dashboard
```

### Scenario B: Wrong Role Assigned
```
1. User accidentally created as 'student'
2. Corrects via Firebase Console
3. Clears browser cache
4. Re-authenticates
5. ✅ Role updated
```

### Scenario C: Cache Issue Persists
```
1. Role updated in Firestore ✓
2. Still shows as student after reload ✗
3. Solution: Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
4. Or clear all storage:
   Settings → Site Settings → Storage → Clear data
5. Or use incognito mode
6. ✅ Fresh session with correct role
```

## Monitoring & Troubleshooting

### Symptoms → Solutions

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Shows "student" after Firestore update | Browser cache stale | Clear localStorage + reload |
| Error when loading assignments | Firestore rules not deployed | Redeploy firestore.rules |
| Document `/users/{uid}` missing | User never completed signup | Create document manually |
| Multiple roles visible | Session mismatch | Close all tabs, fresh login |
| "Permission denied" error | Incorrect config | Verify VITE_FIREBASE_* vars |

---

*Flow diagram last updated during autonomous session*
