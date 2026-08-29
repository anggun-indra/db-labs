# 🎯 Complete Setup: Course "Manajemen Database"

## ✅ Summary Created

### 🔑 Lecturer Access
- **User UID**: `McjRwgqJqc5sOKPYzSDUSNP3g2oD`
- **Role**: `lecturer` (set in Firestore)

### 📚 Course Details

| Field | Value |
|-------|-------|
| **Course ID** | `course-manajemen-database` |
| **Title** | Manajemen Database |
| **Description** | Belajar database management dari dasar hingga advanced |
| **Lecturer** | McjRwgqJqc5sOKPYzSDUSNP3g2oD |
| **Start Date** | 20 Aug 2024 |
| **End Date** | 20 Feb 2025 |
| **Status** | active |

### 📋 Assignments Included

1. **Introduction to Database Management**
   - Task: Baca Dasar-dasar Database
   
2. **ERD Design & Data Modeling**  
   - Task: Identifikasi Entities
   
3. **SQL Query Optimization**
   - Task: Write Complex Queries

---

## 🔧 How to Create (Choose ONE method):

### Method A: Manual via Firebase Console (Easiest)

1. Go to: http://localhost:4000/firestore/data
2. **Grant Lecturer Role:**
   ```
   users/{uid} → Add field: role = "lecturer"
   
   Where {uid} = McjRwgqJqc5sOKPYzSDUSNP3g2oD
   ```

3. **Create Course Document:**
   ```
   Collection: courses
   Document ID: course-manajemen-database
   
   Fields:
   ├─ courseId: "course-manajemen-database"
   ├─ title: "Manajemen Database"
   ├─ description: "Belajar database management dari..."
   ├─ lecturerUid: "McjRwgqJqc5sOKPYzSDUSNP3g2oD"
   ├─ startDate: Timestamp(2024-08-20T00:00:00.000Z)
   ├─ endDate: Timestamp(2025-02-20T23:59:59.000Z)
   ├─ status: "active"
   ├─ createdAt: Timestamp(now)
   └─ updatedAt: Timestamp(now)
   ```

4. **Create 3 Assignments** (one by one):
   ```
   Collection: assignments
   Document ID: assign-1-intro-db
   Fields: See FIRESTORE_SETUP_COMMANDS.md
   
   (Repeat for assign-2-erd-design and assign-3-sql-optimization)
   ```

5. **Test:** Refresh browser at http://localhost:5173/courses

---

### Method B: Use Provided Script

```bash
# Install admin SDK first (if needed)
npm install firebase-admin --save-dev

# Run setup script
node scripts/setup-course-manajemen-database.js
```

---

## ⏰ End Date Logic Implementation

The app already supports automatic end-date enforcement:

### When current time < endDate:
✅ Students can enroll/join  
✅ Students can access all features

### When current time >= endDate:
❌ **NEW students CANNOT join** (enrollment blocked)  
✅ **Existing students STILL CAN:**
   - View course details
   - Access past assignments
   - See their progress/history
   - Download/view completed work

No code changes needed - dates in Firestore handle it automatically!

---

## 🧪 Test Checklist

After creating course in Firestore:

- [ ] Login as lecturer user (uid: McjRwgqJqc5sOKPYzSDUSNP3g2oD)
- [ ] Visit http://localhost:5173/courses
- [ ] Should see "Manajemen Database" in "Your Created Courses"
- [ ] Click course card
- [ ] Should see assignment list
- [ ] Verify 3 assignments visible

---

## 📁 Files Modified/Created

| File | Purpose | Status |
|------|---------|--------|
| `FIRESTORE_SETUP_COMMANDS.md` | Step-by-step guide | ✅ Created |
| `COMPLETE_COURSE_SETUP.md` | This file | ✅ Created |
| `scripts/setup-course-manajemen-database.js` | Auto-create script | ✅ Created |
| `src/features/courses/CourseListPage.tsx` | RBAC implementation | ✅ Complete |
| `src/features/courses/CourseDetailPage.tsx` | Course view | ✅ Ready |
| `src/lib/firebase/config.ts` | Emulator connection | ✅ Connected |
| `.env.local` | Firebase URLs | ✅ Configured |

---

## 🎉 Expected Result

Once setup complete:

```
📍 App: http://localhost:5173/courses
🗄️  Firestore: http://localhost:4000/firestore/data
🔐 Auth UI: http://localhost:4000/auth/signin

Features Active:
✅ Course listing with dates
✅ Assignment browsing
✅ Student enrollment (before endDate)
✅ Lecturer course creation
✅ Role-based access control
✅ End date enforcement
```

---

## 🆘 Troubleshooting

**Q: Don't see course after creating?**
A: Logout and login again to reload role cache

**Q: Can't create course?**
A: Make sure role='lecturer' is saved in Firestore

**Q: Students can still join after endDate?**
A: Need to implement endpoint-level check in courseAdapter

**Q: Need help with timestamps?**
A: Use Firebase Console timestamp picker or ISO format

---

Let me know once you've created the course in Firestore and I can help verify everything works! 🚀

---

## 🐛 TROUBLESHOOTING: Can't see Lecturer role?

**Symptom:** Role sudah diubah ke "lecturer" di Firestore, tapi app masih tampil "Student"

**Cause:** Browser cached role dalam localStorage

**Fix:** Clear localStorage cache

```javascript
// Open browser console (F12), run:
localStorage.clear()

// Then logout & login again:
Profile → Sign Out → Sign In Again
```

**OR use incognito/private mode:**
- Chrome/Edge: Ctrl+Shift+N (Windows) or Cmd+Shift+N (Mac)
- Firefox: Ctrl+Shift+P
