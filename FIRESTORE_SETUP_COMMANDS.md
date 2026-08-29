# 🔥 Setup Course "Manajemen Database" - Step by Step

## ✅ Step 1: Grant Lecturer Role

1. Open Firebase Console: http://localhost:4000/firestore/data
2. Click on **`users`** collection
3. Find and click on document: `McjRwgqJqc5sOKPYzSDUSNP3g2oD`
4. Click **"Add field"** button
5. Fill form:
   ```
   Field name:  role
   Type:        string
   Value:       lecturer
   ```
6. Click **✓ (checkmark)** to save

✅ Your user is now a LECTURER!

---

## ✅ Step 2: Create Course Structure via Firebase Console

Go to Firestore and create this data manually or use commands below:

### **Create Course Document:**

**Collection**: `courses`  
**Document ID**: `course-manajemen-database` (or auto-generated)

```json
{
  "courseId": "course-manajemen-database",
  "title": "Manajemen Database",
  "description": "Belajar database management dari dasar hingga advanced, including ERD design, SQL optimization, dan real-world database implementation.",
  "lecturerUid": "McjRwgqJqc5sOKPYzSDUSNP3g2oD",
  "startDate": "2024-08-20T00:00:00.000Z",
  "endDate": "2025-02-20T23:59:59.000Z",
  "status": "active",
  "createdAt": "2024-08-23T00:00:00.000Z",
  "updatedAt": "2024-08-23T00:00:00.000Z"
}
```

---

## ✅ Step 3: Create Assignments

**Collection**: `assignments` (or nested under courses/{courseId}/assignments)

### Assignment 1: Introduction to Databases

```json
{
  "assignmentId": "assign-1-intro-db",
  "courseId": "course-manajemen-database",
  "title": "Introduction to Database Management",
  "description": "Pengenalan konsep database, tipe database (relational vs NoSQL), dan kapan menggunakan masing-masing.",
  "status": "published",
  "tasks": [
    {
      "taskId": "task-1-read-basics",
      "title": "Baca Dasar-dasar Database",
      "description": "Pelajari konsep dasar database relational",
      "steps": [
        "Pahami apa itu database",
        "Bedakan relational vs NoSQL",
        "Pelajari tentang tables, rows, columns"
      ],
      "hints": ["Gunakan dokumentasi resmi PostgreSQL"],
      "helpLinks": [],
      "dueDate": null,
      "maxScore": 100
    }
  ],
  "helperGuide": {
    "overview": "Memperkenalkan fundamental database management",
    "prerequisites": ["Dasar-dasar komputer"],
    "estimatedTime": "2 hours",
    "resources": []
  },
  "createdAt": "2024-08-23T00:00:00.000Z",
  "updatedAt": "2024-08-23T00:00:00.000Z"
}
```

### Assignment 2: ERD Design

```json
{
  "assignmentId": "assign-2-erd-design",
  "courseId": "course-manajemen-database",
  "title": "ERD Design & Data Modeling",
  "description": "Desain Entity Relationship Diagram untuk sistem yang kompleks",
  "status": "published",
  "tasks": [
    {
      "taskId": "task-1-understand-entities",
      "title": "Identifikasi Entities",
      "description": "Temukan semua entity dalam sistem bisnis",
      "steps": [
        "Analisa requirement",
        "List semua entities utama",
        "Determine relationships"
      ],
      "hints": ["Mulai dari use case"],
      "helpLinks": [],
      "dueDate": null,
      "maxScore": 100
    }
  ],
  "createdAt": "2024-08-23T00:00:00.000Z",
  "updatedAt": "2024-08-23T00:00:00.000Z"
}
```

### Assignment 3: SQL Optimization

```json
{
  "assignmentId": "assign-3-sql-optimization",
  "courseId": "course-manajemen-database",
  "title": "SQL Query Optimization",
  "description": "Optimasi query SQL untuk performa maksimal",
  "status": "published",
  "tasks": [
    {
      "taskId": "task-1-write-query",
      "title": "Write Complex Queries",
      "description": "Buat query JOIN, GROUP BY, subquery",
      "steps": [
        "Pahami INNER JOIN",
        "Pelajari LEFT/RIGHT JOIN",
        "Practice GROUP BY aggregation"
      ],
      "hints": ["Gunakan EXPLAIN untuk analyze"],
      "helpLinks": [],
      "dueDate": null,
      "maxScore": 100
    }
  ],
  "createdAt": "2024-08-23T00:00:00.000Z",
  "updatedAt": "2024-08-23T00:00:00.000Z"
}
```

---

## 🧪 Test Now:

1. **Refresh browser**: http://localhost:5173/courses
2. **Logout & Login again** (to reload role cache)
3. You should see your new course!

---

## 🎯 Auto-Created via Firebase Admin (Alternative)

If you prefer automated creation:

```bash
# This would require Node.js script with Firebase Admin SDK
# For now, manual creation via console is recommended
```

---

## ⏰ End Date Behavior

When current time > endDate:
- ❌ Students CANNOT enroll/join
- ✅ Already enrolled students can STILL:
  - View course details
  - Access their completed assignments
  - See their progress/history
  - Download/view historical data

No changes needed in UI code - just set appropriate dates above!
