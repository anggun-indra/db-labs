/**
 * 🔥 AUTO-CREATE Course "Manajemen Database" with 12 Assignments
 * Uses our app's existing Firebase configuration to connect to emulator
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { connectFirestoreEmulator } from 'firebase/firestore';

// Connect to local Firebase emulator (same as app config)
const FIREBASE_CONFIG = {
  apiKey: 'demo-api-key',
  authDomain: 'localhost:9099',
  projectId: 'demo-dblab',
};

console.log('🚀 Creating Course "Manajemen Database"...');
console.log('=' .repeat(60));

// Initialize Firebase app and connect to emulator
let app = getApps().length > 0 ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

// Connect to emulators
connectFirestoreEmulator(db, 'localhost', 8080);

const LECTURER_UID = 'McjRwgqJqc5sOKPYzSDUSNP3g2oD';
const COURSE_ID = 'course-manajemen-database';
const NOW = new Date().toISOString();

async function createCourse() {
  console.log('\n📚 Creating Course Document...');
  
  const courseData = {
    courseId: COURSE_ID,
    title: 'Manajemen Database',
    description: 'Materi komprehensif database management dari dasar hingga advanced: ERD design, SQL optimization, indexing strategies, normalization, ACID properties, transaction management, dan implementasi real-world database systems.',
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
    console.log(`   Title: ${courseData.title}`);
    console.log(`   Duration: Aug 2024 - Feb 2025`);
    return true;
  } catch (error) {
    console.error('❌ Failed to create course:', error.message);
    return false;
  }
}

async function createAssignments() {
  const assignments = [
    {
      assignmentId: 'assign-01-db-introduction',
      title: 'Introduction to Database Systems',
      description: 'Pengenalan fundamental database sistem, tipe database, dan kapan menggunakannya.',
      helperGuide: {
        overview: 'Memahami konsep dasar database management',
        prerequisites: ['Dasar-dasar komputer'],
        estimatedTime: '3 hours'
      },
      tasks: [{
        taskId: 'task-01-01-understand-db',
        title: 'Understand Database Concepts',
        description: 'Pelajari apa itu database dan fungsinya',
        steps: ['Pelajari definisi database', 'Bedakan file vs database', 'Pahami advantages of DBMS'],
        hints: ['Gunakan textbook database fundamentals'],
        helpLinks: [],
        dueDate: null,
        maxScore: 100
      }]
    },
    {
      assignmentId: 'assign-02-relational-model',
      title: 'Relational Database Model',
      description: 'Pemahaman model relasional, tabel, keys, dan relationships.',
      helperGuide: {
        overview: 'Deep dive into relational model foundation',
        prerequisites: ['Basic computer literacy'],
        estimatedTime: '4 hours'
      },
      tasks: [{
        taskId: 'task-02-01-relational-basics',
        title: 'Master Relational Basics',
        description: 'Pahami entity, attribute, relationship',
        steps: ['Learn entity concept', 'Define attributes correctly', 'Identify primary keys'],
        hints: ['Study ER diagram examples'],
        helpLinks: [],
        dueDate: null,
        maxScore: 100
      }]
    },
    {
      assignmentId: 'assign-03-erd-design',
      title: 'ERD Design & Data Modeling',
      description: 'Design Entity Relationship Diagram untuk sistem kompleks.',
      helperGuide: {
        overview: 'Advanced ERD modeling techniques',
        prerequisites: ['Relational model knowledge'],
        estimatedTime: '6 hours'
      },
      tasks: [{
        taskId: 'task-03-01-entities',
        title: 'Identify Entities & Relationships',
        description: 'Temukan semua entities dalam requirement',
        steps: ['Analyze use cases', 'List all main entities', 'Determine cardinality'],
        hints: ['Start from business requirements'],
        helpLinks: [],
        dueDate: null,
        maxScore: 100
      }]
    },
    {
      assignmentId: 'assign-04-sql-fundamentals',
      title: 'SQL Fundamentals',
      description: 'CRUD operations dengan SELECT, INSERT, UPDATE, DELETE.',
      helperGuide: {
        overview: 'Core SQL command mastery',
        prerequisites: ['Database basics'],
        estimatedTime: '5 hours'
      },
      tasks: [{
        taskId: 'task-04-01-crud',
        title: 'Write CRUD Queries',
        description: 'Practice basic SQL operations',
        steps: ['CREATE table statements', 'INSERT sample data', 'UPDATE records', 'DELETE entries'],
        hints: ['Use PostgreSQL or MySQL playground'],
        helpLinks: [],
        dueDate: null,
        maxScore: 100
      }]
    },
    {
      assignmentId: 'assign-05-joins-queries',
      title: 'Complex SQL Queries & Joins',
      description: 'Multi-table queries dengan JOIN, UNION, subquery.',
      helperGuide: {
        overview: 'Advanced query writing skills',
        prerequisites: ['Basic SQL proficiency'],
        estimatedTime: '7 hours'
      },
      tasks: [{
        taskId: 'task-05-01-joins',
        title: 'Master JOIN Operations',
        description: 'INNER, LEFT, RIGHT, FULL joins',
        steps: ['Understand INNER JOIN', 'Learn LEFT/RIGHT JOIN', 'Practice FULL OUTER JOIN', 'Handle NULL values'],
        hints: ['Visualize join results with diagrams'],
        helpLinks: [],
        dueDate: null,
        maxScore: 100
      }]
    },
    {
      assignmentId: 'assign-06-aggregation',
      title: 'Data Aggregation & Grouping',
      description: 'GROUP BY, HAVING, aggregate functions (SUM, AVG, COUNT, MAX, MIN).',
      helperGuide: {
        overview: 'Statistical data analysis',
        prerequisites: ['Query basics'],
        estimatedTime: '5 hours'
      },
      tasks: [{
        taskId: 'task-06-01-groupby',
        title: 'Aggregation Mastery',
        description: 'Calculate summary statistics',
        steps: ['GROUP BY clauses', 'HAVING filters', 'COUNT/DISTINCT usage', 'AVG/SUM/MAX/MIN functions'],
        hints: ['Start with simple GROUP BY first'],
        helpLinks: [],
        dueDate: null,
        maxScore: 100
      }]
    },
    {
      assignmentId: 'assign-07-normalization',
      title: 'Database Normalization',
      description: 'Normal forms (1NF, 2NF, 3NF, BCNF) dan denormalization strategies.',
      helperGuide: {
        overview: 'Eliminate redundancy systematically',
        prerequisites: ['Schema design skills'],
        estimatedTime: '8 hours'
      },
      tasks: [{
        taskId: 'task-07-01-normalize',
        title: 'Apply Normal Forms',
        description: 'Normalize database schema',
        steps: ['Understand 1NF rules', 'Achieve 2NF elimination', 'Reach 3NF perfection', 'Consider BCNF edge cases'],
        hints: ['Practice with real-world schemas'],
        helpLinks: [],
        dueDate: null,
        maxScore: 100
      }]
    },
    {
      assignmentId: 'assign-08-indexing-strategies',
      title: 'Indexing Strategies',
      description: 'B-tree, hash, composite indexes, covering indexes.',
      helperGuide: {
        overview: 'Optimize query performance',
        prerequisites: ['Query writing experience'],
        estimatedTime: '6 hours'
      },
      tasks: [{
        taskId: 'task-08-01-indexes',
        title: 'Implement Strategic Indexes',
        description: 'Speed up slow queries',
        steps: ['Create B-tree indexes', 'Use composite indexes wisely', 'Monitor index performance', 'Avoid over-indexing'],
        hints: ['Use EXPLAIN ANALYZE to test'],
        helpLinks: [],
        dueDate: null,
        maxScore: 100
      }]
    },
    {
      assignmentId: 'assign-09-query-optimization',
      title: 'Query Optimization',
      description: 'Performance tuning, execution plans, query hints.',
      helperGuide: {
        overview: 'Make queries blazing fast',
        prerequisites: ['Indexing basics'],
        estimatedTime: '7 hours'
      },
      tasks: [{
        taskId: 'task-09-01-optimize',
        title: 'Optimize Query Performance',
        description: 'From slow to super-fast',
        steps: ['Analyze execution plans', 'Rewrite inefficient queries', 'Use appropriate JOIN strategies', 'Apply query hints'],
        hints: ['Always measure before & after'],
        helpLinks: [],
        dueDate: null,
        maxScore: 100
      }]
    },
    {
      assignmentId: 'assign-10-transaction-mgmt',
      title: 'Transaction Management & ACID Properties',
      description: 'ACID principles, isolation levels, concurrency control.',
      helperGuide: {
        overview: 'Ensure data consistency reliably',
        prerequisites: ['SQL fundamentals'],
        estimatedTime: '6 hours'
      },
      tasks: [{
        taskId: 'task-10-01-transactions',
        title: 'Implement Transactions',
        description: 'Safe multi-step operations',
        steps: ['START TRANSACTION', 'COMMIT changes', 'ROLLBACK errors', 'Set isolation levels'],
        hints: ['Test concurrent access scenarios'],
        helpLinks: [],
        dueDate: null,
        maxScore: 100
      }]
    },
    {
      assignmentId: 'assign-11-view-procedures',
      title: 'Views, Stored Procedures & Functions',
      description: 'DB objects for encapsulation and reusability.',
      helperGuide: {
        overview: 'Encapsulate complex logic',
        prerequisites: ['Query mastery'],
        estimatedTime: '8 hours'
      },
      tasks: [{
        taskId: 'task-11-01-db-objects',
        title: 'Build Database Objects',
        description: 'Views, procedures, triggers, functions',
        steps: ['CREATE VIEW abstractions', 'Write stored procedures', 'Implement triggers for automation', 'Define custom functions'],
        hints: ['Follow DRY principle'],
        helpLinks: [],
        dueDate: null,
        maxScore: 100
      }]
    },
    {
      assignmentId: 'assign-12-final-project',
      title: 'Final Project: Complete Database System',
      description: 'Build end-to-end database system with full ERD, queries, and documentation.',
      helperGuide: {
        overview: 'Capstone project application',
        prerequisites: ['All previous topics covered'],
        estimatedTime: '40 hours'
      },
      tasks: [
        {
          taskId: 'task-12-01-design',
          title: 'Database Design Phase',
          description: 'Complete ERD and schema',
          steps: ['Requirement analysis', 'Entity identification', 'Relationship mapping', 'Normalization check', 'Final schema approval'],
          hints: ['Plan thoroughly before coding'],
          helpLinks: [],
          dueDate: null,
          maxScore: 100
        },
        {
          taskId: 'task-12-02-implement',
          title: 'Implementation Phase',
          description: 'Build complete database system',
          steps: ['Create all tables', 'Populate sample data', 'Write complex queries', 'Add indexes for performance', 'Document everything'],
          hints: ['Iterate and test incrementally'],
          helpLinks: [],
          dueDate: null,
          maxScore: 100
        }
      ]
    }
  ];
  
  console.log(`\n📝 Creating ${assignments.length} Assignments...`);
  let successCount = 0;
  
  for (const assignment of assignments) {
    try {
      const assignmentData = {
        assignmentId: assignment.assignmentId,
        courseId: COURSE_ID,
        title: assignment.title,
        description: assignment.description,
        helperGuide: assignment.helperGuide,
        tasks: assignment.tasks,
        createdAt: NOW,
        updatedAt: NOW,
      };
      
      await setDoc(doc(db, 'assignments', assignment.assignmentId), assignmentData);
      console.log(`   ✅ ${assignment.title}`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Failed: ${assignment.title}`, error.message);
    }
    
    // Small delay to avoid overwhelming the emulator
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n✨ Successfully created ${successCount}/${assignments.length} assignments!\n`);
  return successCount === assignments.length;
}

// Check if Firestore emulator is running
async function checkConnection() {
  try {
    // Try to ping emulator
    const snapshot = await import('firebase/firestore').then(m => getFirestore(db));
    console.log('✅ Connected to Firestore emulator!');
    return true;
  } catch (error) {
    console.error('❌ Cannot connect to Firestore emulator. Make sure it\'s running on port 8080.');
    console.error('Error:', error.message);
    return false;
  }
}

// Main execution
(async () => {
  try {
    // Check connection
    const connected = await checkConnection();
    if (!connected) {
      console.log('\n⚠️ Starting Firestore emulator...');
      console.log('Run in another terminal: firebase emulators:start\n');
      process.exit(1);
    }
    
    // Create course
    const courseCreated = await createCourse();
    
    if (courseCreated) {
      // Create assignments
      await createAssignments();
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SETUP COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n✅ Created:');
    console.log(`   • Course: "Manajemen Database"`);
    console.log(`   • Lecturer: ${LECTURER_UID}`);
    console.log(`   • Assignments: 12 modules`);
    console.log('\n🌐 View in Firebase Console:');
    console.log('   http://localhost:4000/firestore/data');
    console.log('\n🧪 Test in App:');
    console.log('   1. Visit: http://localhost:5173/courses');
    console.log('   2. Clear localStorage: F12 → localStorage.clear()');
    console.log('   3. Logout & Login again');
    console.log('   4. You should see your course!\n');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
