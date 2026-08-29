# 🔥 Firebase Emulator Setup Guide

## 📋 Prerequisites Check

### 1. Install JDK 21+ (Required for Firebase Emulator)
```bash
# Homebrew (recommended)
brew install openjdk@21

# Set environment variable
export JAVA_HOME=$(/usr/local/opt/openjdk@21/bin/java -version 2>&1 | grep -o '/.*')
```

Verify:
```bash
java -version
# Should show Java 21 or higher
```

---

## 🚀 Quick Start Options

### Option A: Manual (Recommended for Learning)

**Terminal 1:** Start Firebase Emulators
```bash
firebase emulators:start --project demo-dblab
```

Expected output:
```
✔  All emulators ready!
▶  Firestore emulator running at: localhost:8080
▶  Auth emulator running at: localhost:9099  
▶  Emulator UI running at: http://localhost:4000
```

**Terminal 2:** Run React App
```bash
npm run dev
```

**Access:**
- Emulator UI: http://localhost:4000
- Your App: http://localhost:5173

**Test Auth in Console:**
1. Go to http://localhost:4000/auth/signin
2. Click "Sign up" button
3. Create test account (email/password)
4. Note the UID shown after sign-in
5. Add role manually: In Firestore tab → `users/{your-uid}` → add field `role: "lecturer"`

---

### Option B: One Command with concurrently (Requires Installation First)

```bash
# Install once
npm install --save-dev concurrently

# Then one command runs both
npm run dev:emulators
```

**Note:** This opens two terminals automatically - but requires JDK 21 first!

---

## ✅ Verify Everything Works

After starting emulators, visit your app at `http://localhost:5173`:

### Test Sign-Up Flow:
1. Click profile icon → "Sign in"
2. Enter email/password
3. You should see "Sign in successful!" message
4. Navigate to `/courses` - now works with real data!

### Test Course Creation:
1. Click sidebar "Courses"
2. Click "Create New Course" button
3. Fill form and submit
4. Check Firebase Console (http://localhost:4000/firestore/data)
5. You should see new course document created

---

## 🔧 Troubleshooting

### Error: "firebase-tools no longer supports Java version before 21"
**Solution:** Install JDK 21 via Homebrew:
```bash
brew install openjdk@21
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
```

### Error: "Permission denied" when creating courses
**Solution:** Make sure your test user has role='lecturer' in Firestore:
1. Go to http://localhost:4000/firestore/data
2. Expand `users` collection
3. Find your user ID
4. Add/edit field: `role` = `lecturer`

### Error: "Failed to load resource: 404"
**Solution:** Restart both Firebase emulator AND React dev server:
```bash
# Press Ctrl+C to stop everything, then:
firebase emulators:start --project demo-dblab  # Terminal 1
npm run dev                                      # Terminal 2
```

---

## 🎯 Complete Workflow Example

### For Testing Lecturer Features:

1. **Setup Emulators**
   ```bash
   firebase emulators:start --project demo-dblab
   ```

2. **Create Test User**
   - Open http://localhost:4000/auth/signin
   - Click "Sign up"
   - Create account: `lecturer@test.com` / password123

3. **Grant Lecturer Role**
   - Go to http://localhost:4000/firestore/data
   - Find `users/{uid-of-lecturer}` 
   - Add field: `role: lecturer`

4. **Open Your App**
   - Visit http://localhost:5173/courses
   - Click "Create New Course"
   - See courses appear immediately!

5. **Add Mock Data for Demo**
   - Use Firebase Console to add sample courses
   - Or use the mock data that's already in the component

---

## 📁 Files Modified for Phase 6+

These files connect to Firebase when credentials are available:

| File | Purpose |
|------|---------|
| `src/lib/firebase/courseAdapter.ts` | CRUD operations for courses |
| `src/features/courses/CourseListPage.tsx` | Displays enrolled/created courses |
| `src/features/courses/CourseDetailPage.tsx` | Shows course details & members |
| `src/app/router.tsx` | Navigation routes for courses |

---

## 🌐 Production Deployment

When ready for production:
1. Remove `.env.emulator.local` file
2. Update actual Firebase credentials in `.env.local`
3. Deploy Firestore rules to cloud
4. Apps will automatically switch to production Firebase

---

## 🎉 Success Checklist

- [ ] JDK 21 installed and working
- [ ] Firebase emulators started on ports 8080 (Firestore), 9099 (Auth), 4000 (UI)
- [ ] Can access http://localhost:4000 (Emulator Dashboard)
- [ ] Can sign up users in Firebase Console
- [ ] Users have roles set in Firestore
- [ ] React app connects to emulators (no 404 errors)
- [ ] Course creation saves to Firestore
- [ ] Course listing shows real data from Firestore
- [ ] Navigation between pages works smoothly

---

Need help? Check the full error logs in Firebase Console or React browser console (F12)!
