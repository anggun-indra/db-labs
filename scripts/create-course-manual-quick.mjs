/**
 * ⚡ QUICK SCRIPT: Create course data directly via existing connection
 * Uses our running Vite dev server's Firebase client connection
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, connectFirestoreEmulator } from 'firebase/firestore';

// Our existing config from .env.local style
const FIREBASE_CONFIG = {
  apiKey: 'demo-api-key',
  authDomain: 'localhost:9099',
  projectId: 'demo-dblab',
};

console.log('⚡ Quick Course Creation Script');
console.log('='.repeat(60));
console.log();

try {
  // Initialize app
  const app = initializeApp(FIREBASE_CONFIG, 'dblab-quick-create');
  const db = getFirestore(app);
  
  // Connect to emulators (should be running)
  connectFirestoreEmulator(db, 'localhost', 8080);
  console.log('✅ Connected to Firestore emulator on localhost:8080');
  
} catch (error) {
  console.error('❌ Connection error:', error.message);
  console.log();
  console.log('💡 Make sure Firebase Emulator is running:');
  console.log('   Run: firebase emulators:start --only auth,firestore');
  console.log('   OR check your terminal where it\'s already running');
  process.exit(1);
}

const COURSE_ID = 'course-manajemen-database';
const LECTURER_UID = 'McjRwgqJqc5sOKPYzSDUSNP3g2oD';
const NOW = new Date().toISOString();

async function createCourse() {
  console.log('\n📚 Creating Course...');
  
  const courseData = {
    courseId: COURSE_ID,
    title: 'Manajemen Database',
    description: 'Materi komprehensif database management dari dasar hingga advanced.',
    lecturerUid: LECTURER_UID,
    startDate: '2024-08-20T00:00:00.000Z',
    endDate: '2025-02-20T23:59:59.000Z',
    status: 'active',
    createdAt: NOW,
    updatedAt: NOW,
  };
  
  try {
    await setDoc(doc(db, 'courses', COURSE_ID), courseData);
    console.log('✅ Course created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return false;
  }
}

async function createAssignments() {
  const assignments = [
    'assign-01-db-introduction',
    'assign-02-relational-model',
    'assign-03-erd-design',
    'assign-04-sql-fundamentals',
    'assign-05-joins-queries',
    'assign-06-aggregation',
    'assign-07-normalization',
    'assign-08-indexing-strategies',
    'assign-09-query-optimization',
    'assign-10-transaction-mgmt',
    'assign-11-view-procedures',
    'assign-12-final-project'
  ];
  
  console.log(`\n📝 Creating ${assignments.length} Assignments...`);
  
  for (const aid of assignments) {
    try {
      const assignmentData = {
        assignmentId: aid,
        courseId: COURSE_ID,
        title: `Assignment ${aid.split('-')[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        description: 'Database learning task...',
        helperGuide: {
          overview: 'Learning objective',
          prerequisites: ['Basic knowledge'],
          estimatedTime: '4 hours'
        },
        tasks: [{
          taskId: `${aid}-task-1`,
          title: 'Complete the task',
          description: 'Follow instructions',
          steps: ['Read materials', 'Implement solution', 'Test and submit'],
          hints: ['Check documentation'],
          helpLinks: [],
          dueDate: null,
          maxScore: 100
        }],
        createdAt: NOW,
        updatedAt: NOW,
      };
      
      await setDoc(doc(db, 'assignments', aid), assignmentData);
      console.log(`   ✅ ${assignmentData.title}`);
      
    } catch (error) {
      console.error(`   ❌ Failed ${aid}:`, error.message);
    }
    
    await new Promise(r => setTimeout(r, 50));
  }
  
  console.log('\n✨ All assignments created!\n');
}

// Main
(async () => {
  try {
    const success = await createCourse();
    
    if (success) {
      await createAssignments();
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DONE!');
    console.log('='.repeat(60));
    console.log('\nView at: http://localhost:4000/firestore/data');
    console.log('Test app: http://localhost:5173/courses\n');
    
  } catch (error) {
    console.error('Setup failed:', error.message);
  }
})();
