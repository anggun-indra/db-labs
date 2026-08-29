/**
 * Quick script to create Course "Manajemen Database" with assignments
 * Run after setting lecturer role in Firebase Console
 */

const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

// You'll need firebase-admin SDK installed and service account JSON
// For local dev, using emulator or direct console access recommended

async function createCourse() {
  try {
    // Initialize with your credentials or emulator settings
    const admin = initializeApp({
      apiKey: 'demo-api-key',
      projectId: 'demo-dblab',
    })
    
    const db = getFirestore(admin)
    
    const lecturerUid = 'McjRwgqJqc5sOKPYzSDUSNP3g2oD'
    
    // Grant lecturer role
    await db.collection('users').doc(lecturerUid).set({
      uid: lecturerUid,
      role: 'lecturer',
      updatedAt: new Date().toISOString()
    }, { merge: true })
    
    console.log('✅ Set user as lecturer')
    
    // Create Course
    const courseData = {
      courseId: 'course-manajemen-database',
      title: 'Manajemen Database',
      description: 'Belajar database management dari dasar hingga advanced, including ERD design, SQL optimization, dan real-world database implementation.',
      lecturerUid: lecturerUid,
      startDate: new Date('2024-08-20T00:00:00.000Z'),
      endDate: new Date('2025-02-20T23:59:59.000Z'),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await db.collection('courses').doc(courseData.courseId).set(courseData)
    console.log('✅ Created course: Manajemen Database')
    console.log(`   Start Date: ${courseData.startDate.toISOString().split('T')[0]}`)
    console.log(`   End Date: ${courseData.endDate.toISOString().split('T')[0]}`)
    
    // Create Assignments
    const assignments = [
      {
        assignmentId: 'assign-1-intro-db',
        courseId: courseData.courseId,
        title: 'Introduction to Database Management',
        description: 'Pengenalan konsep database, tipe database (relational vs NoSQL), dan kapan menggunakan masing-masing.',
        status: 'published',
        tasks: [{
          taskId: 'task-1-read-basics',
          title: 'Baca Dasar-dasar Database',
          description: 'Pelajari konsep dasar database relational',
          steps: ['Pahami apa itu database', 'Bedakan relational vs NoSQL', 'Pelajari tentang tables, rows, columns'],
          hints: ['Gunakan dokumentasi resmi PostgreSQL'],
          helpLinks: [],
          dueDate: null,
          maxScore: 100
        }],
        helperGuide: {
          overview: 'Memperkenalkan fundamental database management',
          prerequisites: ['Dasar-dasar komputer'],
          estimatedTime: '2 hours',
          resources: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        assignmentId: 'assign-2-erd-design',
        courseId: courseData.courseId,
        title: 'ERD Design & Data Modeling',
        description: 'Desain Entity Relationship Diagram untuk sistem yang kompleks',
        status: 'published',
        tasks: [{
          taskId: 'task-1-understand-entities',
          title: 'Identifikasi Entities',
          description: 'Temukan semua entity dalam sistem bisnis',
          steps: ['Analisa requirement', 'List semua entities utama', 'Determine relationships'],
          hints: ['Mulai dari use case'],
          helpLinks: [],
          dueDate: null,
          maxScore: 100
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        assignmentId: 'assign-3-sql-optimization',
        courseId: courseData.courseId,
        title: 'SQL Query Optimization',
        description: 'Optimasi query SQL untuk performa maksimal',
        status: 'published',
        tasks: [{
          taskId: 'task-1-write-query',
          title: 'Write Complex Queries',
          description: 'Buat query JOIN, GROUP BY, subquery',
          steps: ['Pahami INNER JOIN', 'Pelajari LEFT/RIGHT JOIN', 'Practice GROUP BY aggregation'],
          hints: ['Gunakan EXPLAIN untuk analyze'],
          helpLinks: [],
          dueDate: null,
          maxScore: 100
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
    
    for (const assignment of assignments) {
      await db.collection('assignments').doc(assignment.assignmentId).set(assignment)
      console.log(`✅ Created assignment: ${assignment.title}`)
    }
    
    console.log('\n🎉 ALL DONE!');
    console.log('\nTo see it live:');
    console.log('1. Visit http://localhost:4000/firestore/data');
    console.log('2. Check collections: courses, assignments');
    console.log('3. Go to app: http://localhost:5173/courses');
    console.log('4. Refresh page');
    
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

createCourse()
