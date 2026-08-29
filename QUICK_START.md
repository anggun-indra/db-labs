# 🚀 Quick Start: Enable Firebase + Auth for Course Management

## Step 1: Install JDK 21 (Required)
```bash
brew install openjdk@21
export JAVA_HOME=$(/usr/local/opt/openjdk@21/bin/java -version 2>&1 | grep -o '/.*')
```

Test:
```bash
java -version
# Should say: openjdk version "21.x.x" or higher
```

---

## Step 2: Start Firebase Emulators (Single Terminal)
Open one terminal and run:
```bash
firebase emulators:start --project demo-dblab
```

Wait until you see:
```
✔  All emulators ready!
▶  Firestore emulator running at: localhost:8080
▶  Auth emulator running at: localhost:9099
▶  Emulator UI running at: http://localhost:4000
```

Leave this terminal running! ✅

---

## Step 3: Open Second Terminal → Run Your App
```bash
npm run dev
```

Then visit:
- **Your App:** http://localhost:5173
- **Firebase Console:** http://localhost:4000

---

## Step 4: Create Test User in Firebase Console

1. Go to http://localhost:4000/auth/signin
2. Click **"Sign up"** button
3. Create account:
   - Email: `lecturer@test.com`
   - Password: any password

4. After signing up, note your UID shown in console

5. Add role:
   - Go to Firestore tab: http://localhost:4000/firestore/data
   - Click `users` collection
   - Click your user ID document
   - Click "Add field" → Name: `role`, Type: string, Value: `lecturer`
   - Click checkmark ✓ to save

---

## Step 5: Test Course Features!

Back in your app (http://localhost:5173):

1. Click profile icon → "Sign in"
2. Login with `lecturer@test.com`
3. Navigate to Courses page
4. Click "Create New Course" → Fill form → Submit
5. ✅ Course created and saved to Firestore!
6. Check http://localhost:4000/firestore/data to verify

---

## ✅ Success Indicators

You'll know everything works when:
- ✅ No error messages in browser console
- ✅ Can sign in successfully
- ✅ Create course form submits without errors
- ✅ New course appears immediately after creation
- ✅ Firestore shows your data in Firebase Console
- ✅ Navigation between pages smooth

---

## 📁 What Files Use Firebase Now?

| File | Connects To | Status |
|------|-------------|--------|
| `src/lib/firebase/courseAdapter.ts` | Firestore | Ready (uses mock for now) |
| `src/stores/authStore.ts` | Auth Emulator | Partially working |
| `src/features/courses/CourseListPage.tsx` | Both | Fully functional UI |
| `src/app/router.tsx` | Routes | Configured |

The app automatically detects Firebase credentials from `.env` variables and switches between local mode and production mode.

---

## 🎯 Next Steps After Setup

Once Firebase is running:
1. Test full authentication flow
2. Create multiple courses as lecturer
3. Try switching roles in Firestore
4. Test course enrollment system
5. Implement assignment creation UI
6. Build database editor features

Need more help? Check:
- **Full Guide:** See FIREBASE_SETUP_GUIDE.md
- **Troubleshooting:** Common issues & solutions
- **Documentation:** firebase.google.com/docs/emulator-suite

Good luck! 🙌
