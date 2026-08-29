#!/usr/bin/env node
/**
 * Seed Script: Course "Manajemen Database" with 12 Comprehensive Assignments
 * for Lecturer UID: aq4ujrv3nPiad4N4CFdFtWYs65l5
 * 
 * Uses Firestore REST API with Bearer owner admin authorization.
 */

const PROJECT = process.env.FIREBASE_EMULATOR_PROJECT ?? 'demo-dblab';
const LECTURER_UID = 'aq4ujrv3nPiad4N4CFdFtWYs65l5';
const COURSE_ID = 'course-manajemen-database';
const NOW = new Date().toISOString();

async function pickPort(envValue) {
  if (envValue) return envValue;
  try {
    const res = await fetch('http://127.0.0.1:4400/emulators');
    const info = await res.json();
    const firestore = info?.firestore;
    if (firestore) return `${firestore.host ?? '127.0.0.1'}:${firestore.port}`;
  } catch {}
  for (const port of [8080, 8081]) {
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/v1/projects/${PROJECT}/databases/(default)/documents/__probe__`,
        { headers: { Authorization: 'Bearer owner' } }
      );
      const body = await res.text();
      if (body.startsWith('{"error":')) return `127.0.0.1:${port}`;
    } catch {}
  }
  return '127.0.0.1:8080';
}

const FIRESTORE = await pickPort(process.env.FIRESTORE_EMULATOR_HOST);
const FIRESTORE_BASE = `http://${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents`;

console.log(`[seed] Firestore target: ${FIRESTORE} (project: ${PROJECT})`);
console.log(`[seed] Lecturer UID:     ${LECTURER_UID}`);

function fv(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(fv) } };
  if (typeof value === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fv(v)])) } };
  }
  throw new Error(`Unsupported field value: ${value}`);
}

async function upsert(path, data) {
  const res = await fetch(`${FIRESTORE_BASE}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, fv(v)])) })
  });
  if (!res.ok) throw new Error(`upsert ${path} failed: ${res.status} ${await res.text()}`);
}

const courseData = {
  courseId: COURSE_ID,
  title: 'Manajemen Database',
  description: 'Mata kuliah komprehensif Manajemen Database untuk Bisnis Digital: Visual ERD modeling, SQLite WASM in-browser execution, SQL DDL & DML, Advanced JOINs, Aggregasi & Analitik Bisnis, Normalisasi 1NF-3NF, Indeksasi & Query Tuning, Transaksi ACID, Database Views, Triggers, hingga Capstone Project sistem database nyata.',
  lecturerUid: LECTURER_UID,
  createdAt: NOW,
  updatedAt: NOW
};

const assignments = [
  {
    assignmentId: 'asg-mbd-01',
    courseId: COURSE_ID,
    title: 'Pertemuan 01: Fondasi Model Relasional & Perancangan Toko Retail Online',
    description: 'Rancang entitas dasar, primary key, foreign key, dan tipe data untuk sistem transaksi toko retail e-commerce.',
    instructions: `# Pertemuan 01: Fondasi Model Relasional Toko Retail

## Skenario Bisnis
Perusahaan retail **"Nusantara Mart"** sedang memigrasikan sistem pencatatan manualnya ke database relasional. Anda ditugaskan merancang struktur database pemesanan barang sederhana.

## Tugas Mahasiswa
1. Buka ERD Designer pada starter project yang telah disediakan.
2. Identifikasi dan hubungkan relasi antar tabel:
   - \`customers\` (1) ke \`orders\` (N) melalui \`orders.customer_id\`
   - \`orders\` (1) ke \`order_items\` (N) melalui \`order_items.order_id\`
   - \`products\` (1) ke \`order_items\` (N) melalui \`order_items.product_id\`
3. Pastikan setiap kolom memiliki tipe data yang tepat (\`INTEGER\`, \`TEXT\`, \`REAL\`, \`DATETIME\`).
4. Generate skema ke SQLite, lalu masukkan 2 data pelanggan baru dan 1 pesanan uji coba.`,
    learningObjectives: [
      'Memahami konsep Entity, Atribut, Tuple, dan Domain Nilai',
      'Mengidentifikasi Candidate Key dan Primary Key (PK)',
      'Menghubungkan tabel melalui Foreign Key (FK) 1:N',
      'Mengoperasikan Visual ERD Designer dan SQLite WASM'
    ],
    requirements: [
      'Tabel customers memiliki primary key customer_id (INTEGER)',
      'Tabel products memiliki primary key product_id (INTEGER) dan price (REAL)',
      'Tabel orders terhubung ke customers dengan customer_id sebagai FK',
      'Tabel order_items memiliki FK order_id dan product_id dengan quantity > 0',
      'ERD lolos validasi tanpa pesan error'
    ],
    dueAt: '2026-09-01T23:59:59.000Z',
    status: 'published',
    starterErd: {
      schemaVersion: 1,
      projectId: 'starter-mbd-01',
      name: 'Retail Nusantara Mart - Starter ERD',
      tables: [
        {
          id: 'tbl-customers',
          name: 'customers',
          position: { x: 80, y: 100 },
          columns: [
            { id: 'c-cust-id', name: 'customer_id', type: 'INTEGER', primaryKey: true, nullable: false, unique: true },
            { id: 'c-cust-name', name: 'full_name', type: 'TEXT', primaryKey: false, nullable: false, unique: false },
            { id: 'c-cust-email', name: 'email', type: 'TEXT', primaryKey: false, nullable: false, unique: true },
            { id: 'c-cust-city', name: 'city', type: 'TEXT', primaryKey: false, nullable: true, unique: false }
          ]
        },
        {
          id: 'tbl-products',
          name: 'products',
          position: { x: 550, y: 100 },
          columns: [
            { id: 'c-prod-id', name: 'product_id', type: 'INTEGER', primaryKey: true, nullable: false, unique: true },
            { id: 'c-prod-name', name: 'product_name', type: 'TEXT', primaryKey: false, nullable: false, unique: false },
            { id: 'c-prod-price', name: 'price', type: 'REAL', primaryKey: false, nullable: false, unique: false },
            { id: 'c-prod-stock', name: 'stock_quantity', type: 'INTEGER', primaryKey: false, nullable: false, unique: false }
          ]
        },
        {
          id: 'tbl-orders',
          name: 'orders',
          position: { x: 80, y: 350 },
          columns: [
            { id: 'c-ord-id', name: 'order_id', type: 'INTEGER', primaryKey: true, nullable: false, unique: true },
            { id: 'c-ord-cust-id', name: 'customer_id', type: 'INTEGER', primaryKey: false, nullable: false, unique: false },
            { id: 'c-ord-date', name: 'order_date', type: 'DATETIME', primaryKey: false, nullable: false, unique: false },
            { id: 'c-ord-total', name: 'total_amount', type: 'REAL', primaryKey: false, nullable: false, unique: false }
          ]
        },
        {
          id: 'tbl-order-items',
          name: 'order_items',
          position: { x: 550, y: 350 },
          columns: [
            { id: 'c-item-id', name: 'item_id', type: 'INTEGER', primaryKey: true, nullable: false, unique: true },
            { id: 'c-item-ord-id', name: 'order_id', type: 'INTEGER', primaryKey: false, nullable: false, unique: false },
            { id: 'c-item-prod-id', name: 'product_id', type: 'INTEGER', primaryKey: false, nullable: false, unique: false },
            { id: 'c-item-qty', name: 'quantity', type: 'INTEGER', primaryKey: false, nullable: false, unique: false },
            { id: 'c-item-subtotal', name: 'subtotal', type: 'REAL', primaryKey: false, nullable: false, unique: false }
          ]
        }
      ],
      relationships: [
        {
          id: 'rel-cust-orders',
          sourceTableId: 'tbl-orders',
          sourceColumnId: 'c-ord-cust-id',
          targetTableId: 'tbl-customers',
          targetColumnId: 'c-cust-id',
          cardinality: 'many-to-one'
        },
        {
          id: 'rel-orders-items',
          sourceTableId: 'tbl-order-items',
          sourceColumnId: 'c-item-ord-id',
          targetTableId: 'tbl-orders',
          targetColumnId: 'c-ord-id',
          cardinality: 'many-to-one'
        },
        {
          id: 'rel-prod-items',
          sourceTableId: 'tbl-order-items',
          sourceColumnId: 'c-item-prod-id',
          targetTableId: 'tbl-products',
          targetColumnId: 'c-prod-id',
          cardinality: 'many-to-one'
        }
      ],
      viewport: { x: 0, y: 0, zoom: 1 }
    },
    starterSql: `-- DDL Schema Toko Nusantara Mart
CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  city TEXT
);

CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  product_name TEXT NOT NULL,
  price REAL NOT NULL,
  stock_quantity INTEGER NOT NULL
);

CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  order_date DATETIME NOT NULL,
  total_amount REAL NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE order_items (
  item_id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(order_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);`,
    sampleData: `INSERT INTO customers (customer_id, full_name, email, city) VALUES
  (1, 'Ahmad Fauzi', 'ahmad@example.com', 'Jakarta'),
  (2, 'Siti Nurhaliza', 'siti@example.com', 'Surabaya'),
  (3, 'Budi Pratama', 'budi@example.com', 'Bandung');

INSERT INTO products (product_id, product_name, price, stock_quantity) VALUES
  (101, 'Kopi Gayo Arabika 250g', 85000.0, 50),
  (102, 'Teh Hitam Walini 100g', 25000.0, 100),
  (103, 'Cokelat Luwu 80g', 45000.0, 30);

INSERT INTO orders (order_id, customer_id, order_date, total_amount) VALUES
  (1001, 1, '2026-08-20 10:30:00', 110000.0);

INSERT INTO order_items (item_id, order_id, product_id, quantity, subtotal) VALUES
  (1, 1001, 101, 1, 85000.0),
  (2, 1001, 102, 1, 25000.0);`,
    createdByUid: LECTURER_UID,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    assignmentId: 'asg-mbd-02',
    courseId: COURSE_ID,
    title: 'Pertemuan 02: Relasi Many-to-Many & Integritas Referensial Kursus Online',
    description: 'Implementasikan relasi Many-to-Many melalui junction table dan atur aturan integritas referensial.',
    instructions: `# Pertemuan 02: Relasi Many-to-Many Kursus Online

## Skenario
Platform pembelajaran "EduPintar" memerlukan database untuk merekam pendaftaran mahasiswa ke banyak kursus. Satu mahasiswa dapat mengambil banyak kursus, dan satu kursus dapat diikuti oleh banyak mahasiswa (M:N).

## Tugas Mahasiswa
1. Buat tabel penghubung (junction table) bernama \`enrollments\`.
2. Tetapkan Composite Primary Key pada \`(student_id, course_id)\`.
3. Tambahkan kolom pendukung: \`enrolled_at\`, \`status\` ('active', 'completed', 'dropped'), dan \`final_grade\`.
4. Hubungkan foreign key ke tabel \`students\` dan \`courses\`.
5. Uji query untuk menampilkan daftar seluruh kursus yang diambil oleh mahasiswa tertentu.`,
    learningObjectives: [
      'Memahami dekomposisi relasi M:N menjadi dua relasi 1:N',
      'Merancang Composite Primary Key pada Junction Table',
      'Mengatur batasan integritas data (CHECK constraints dan NOT NULL)'
    ],
    requirements: [
      'Tabel junction enrollments menghubungkan students dan courses',
      'Kombinasi student_id dan course_id bersifat unik / composite PK',
      'Tersedia kolom status pendaftaran dan nilai akhir',
      'Semua query SQL berjalan sukses di SQL Playground'
    ],
    dueAt: '2026-09-08T23:59:59.000Z',
    status: 'published',
    starterErd: null,
    starterSql: `CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  nim TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  major TEXT NOT NULL
);

CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY,
  course_code TEXT UNIQUE NOT NULL,
  course_name TEXT NOT NULL,
  credits INTEGER NOT NULL
);

CREATE TABLE enrollments (
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  enrolled_at DATETIME NOT NULL,
  status TEXT DEFAULT 'active',
  final_grade REAL,
  PRIMARY KEY (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES students(student_id),
  FOREIGN KEY (course_id) REFERENCES courses(course_id)
);`,
    sampleData: `INSERT INTO students (student_id, nim, name, major) VALUES
  (1, '2024001', 'Rian Hidayat', 'Digital Business'),
  (2, '2024002', 'Dewi Lestari', 'Digital Business'),
  (3, '2024003', 'Eko Prasetyo', 'Information Systems');

INSERT INTO courses (course_id, course_code, course_name, credits) VALUES
  (10, 'MBD201', 'Manajemen Database', 3),
  (20, 'BIZ101', 'Pengantar Bisnis Digital', 3),
  (30, 'ECOM301', 'E-Commerce Strategy', 3);

INSERT INTO enrollments (student_id, course_id, enrolled_at, status, final_grade) VALUES
  (1, 10, '2026-08-20', 'active', NULL),
  (1, 20, '2026-08-20', 'completed', 88.5),
  (2, 10, '2026-08-21', 'active', NULL),
  (3, 30, '2026-08-22', 'active', NULL);`,
    createdByUid: LECTURER_UID,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    assignmentId: 'asg-mbd-03',
    courseId: COURSE_ID,
    title: 'Pertemuan 03: Normalisasi Database (1NF ke 3NF) Sistem Faktur & Billing',
    description: 'Transformasikan data tagihan unnormalized yang rentan redundansi menjadi struktur tabel 3NF yang bersih.',
    instructions: `# Pertemuan 03: Normalisasi Database dari 1NF hingga 3NF

## Masalah Redundansi Data
Tabel tagihan lama menyimpan nama pelanggan, nomor telepon, alamat, rincian barang, dan harga dalam 1 tabel datar (flat table). Hal ini menyebabkan anomali insert, update, dan delete.

## Tugas Mahasiswa
1. Analisis bentuk tidak ternormalisasi (UNF).
2. Lakukan transformasi ke **1NF**: hilangkan repeating groups dan pastikan nilai setiap kolom bernilai atomik.
3. Lakukan transformasi ke **2NF**: hilangkan ketergantungan parsial (partial dependency).
4. Lakukan transformasi ke **3NF**: hilangkan ketergantungan transitif (transitive dependency).
5. Buat struktur 3NF akhir: \`customers\`, \`invoices\`, \`items\`, dan \`invoice_items\`.`,
    learningObjectives: [
      'Mengidentifikasi anomali manipulasi data pada skema tidak normal',
      'Menerapkan aturan 1NF, 2NF, dan 3NF secara sistematis',
      'Menganalisis Functional Dependencies (FD)'
    ],
    requirements: [
      'Tabel hasil normalisasi berada dalam bentuk 3NF',
      'Tidak ada redundansi data nama pelanggan di tabel faktur',
      'Data harga barang tersimpan konsisten di katalog item'
    ],
    dueAt: '2026-09-15T23:59:59.000Z',
    status: 'published',
    starterErd: null,
    starterSql: `-- Struktur 3NF Sistem Faktur
CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone_number TEXT,
  billing_address TEXT
);

CREATE TABLE invoices (
  invoice_id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'unpaid',
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE items (
  item_id INTEGER PRIMARY KEY,
  item_code TEXT UNIQUE NOT NULL,
  item_name TEXT NOT NULL,
  unit_price REAL NOT NULL
);

CREATE TABLE invoice_items (
  invoice_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  price_applied REAL NOT NULL,
  PRIMARY KEY (invoice_id, item_id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id),
  FOREIGN KEY (item_id) REFERENCES items(item_id)
);`,
    sampleData: `INSERT INTO customers VALUES 
  (1, 'PT Sinergi Abadi', '021-5551234', 'Sudirman No. 45, Jakarta'),
  (2, 'CV Maju Lancar', '031-7778899', 'Pemuda No. 12, Surabaya');

INSERT INTO items VALUES
  (1, 'SRV-01', 'Cloud Database Hosting (Monthly)', 750000.0),
  (2, 'SRV-02', 'SSL Security Certificate', 300000.0),
  (3, 'SRV-03', 'Domain Name .co.id (1 Year)', 250000.0);

INSERT INTO invoices VALUES
  (101, 1, '2026-08-01', '2026-08-15', 'paid'),
  (102, 2, '2026-08-10', '2026-08-25', 'unpaid');

INSERT INTO invoice_items VALUES
  (101, 1, 1, 750000.0),
  (101, 2, 1, 300000.0),
  (102, 1, 2, 750000.0),
  (102, 3, 1, 250000.0);`,
    createdByUid: LECTURER_UID,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    assignmentId: 'asg-mbd-04',
    courseId: COURSE_ID,
    title: 'Pertemuan 04: SQL DDL & DML: Manajemen Inventori Gudang & Logistik',
    description: 'Kuasai manipulasi data database operasional gudang dengan perintah DDL, INSERT, UPDATE, dan DELETE berkondisi.',
    instructions: `# Pertemuan 04: Operasi SQL DDL dan DML Inventori

## Skenario
Sistem gudang logistik "CepatKirim" mengelola ribuan SKU barang yang keluar-masuk setiap hari. Anda diminta mengeksekusi serangkaian manipulasi data via SQL Playground.

## Tugas Query
1. **CREATE & ALTER**: Tambahkan kolom \`reorder_level\` bernilai default 10 pada tabel \`inventory\`.
2. **INSERT**: Tambahkan 3 item barang elektronik baru ke gudang Jakarta.
3. **UPDATE**: Lakukan penyesuaian stok saat barang masuk (tambah 25 unit untuk SKU 'ELEC-01').
4. **FILTER**: Cari produk yang stoknya saat ini berada di bawah \`reorder_level\`.
5. **DELETE / SOFT DELETE**: Perbarui status barang yang discontinue menjadi \`is_active = 0\`.`,
    learningObjectives: [
      'Menulis perintah DDL (CREATE, ALTER) dengan tepat',
      'Menggunakan perintah DML (INSERT, UPDATE, DELETE)',
      'Menerapkan klausa WHERE dengan operator perbandingan dan logika'
    ],
    requirements: [
      'Menyelesaikan 5 instruksi manipulasi data SQL',
      'Semua query dieksekusi tanpa error di SQL Playground',
      'Menerapkan best practice penggunaan WHERE pada UPDATE dan DELETE'
    ],
    dueAt: '2026-09-22T23:59:59.000Z',
    status: 'published',
    starterErd: null,
    starterSql: `CREATE TABLE warehouses (
  warehouse_id INTEGER PRIMARY KEY,
  warehouse_name TEXT NOT NULL,
  location TEXT NOT NULL
);

CREATE TABLE categories (
  category_id INTEGER PRIMARY KEY,
  category_name TEXT NOT NULL
);

CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  category_id INTEGER,
  unit_price REAL NOT NULL,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

CREATE TABLE inventory (
  warehouse_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 10,
  PRIMARY KEY (warehouse_id, product_id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);`,
    sampleData: `INSERT INTO warehouses VALUES (1, 'Gudang Utama Cikarang', 'Jawa Barat'), (2, 'Gudang Hub Surabaya', 'Jawa Timur');
INSERT INTO categories VALUES (1, 'Elektronik'), (2, 'Peralatan Rumah Tangga'), (3, 'Aksesoris Komputer');

INSERT INTO products (product_id, sku, product_name, category_id, unit_price, is_active) VALUES
  (1, 'ELEC-01', 'Wireless Mouse Ergonomis', 3, 150000.0, 1),
  (2, 'ELEC-02', 'Keyboard Mekanikal TKL', 3, 450000.0, 1),
  (3, 'ELEC-03', 'Monitor 24 Inch IPS 100Hz', 1, 1450000.0, 1),
  (4, 'HOME-01', 'Air Purifier HEPA', 2, 890000.0, 1);

INSERT INTO inventory (warehouse_id, product_id, stock_quantity, reorder_level) VALUES
  (1, 1, 45, 10),
  (1, 2, 8, 15),
  (1, 3, 5, 10),
  (2, 1, 12, 10),
  (2, 4, 3, 5);`,
    createdByUid: LECTURER_UID,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    assignmentId: 'asg-mbd-05',
    courseId: COURSE_ID,
    title: 'Pertemuan 05: Analisis Multi-Tabel dengan SQL JOIN (INNER, LEFT, RIGHT, SELF JOIN)',
    description: 'Gabungkan data antar tabel relasional untuk mengekstrak wawasan bisnis toko buku digital.',
    instructions: `# Pertemuan 05: Teknik Penggabungan Tabel (SQL JOINs)

## Skenario
Toko Buku Digital **"Pustaka Nusa"** ingin mengevaluasi performa penjualan buku, penulis terlaris, buku yang belum pernah terjual, dan relasi hierarki kategori buku.

## Soal Analisis
1. **INNER JOIN**: Tampilkan judul buku, nama penulis, nama kategori, dan harga untuk buku yang aktif.
2. **LEFT JOIN (Unsold Items)**: Tampilkan seluruh daftar buku beserta jumlah terjualnya, termasuk buku yang belum pernah terjual sama sekali (\`total_sold IS NULL\` atau \`0\`).
3. **SELF JOIN**: Tabel \`categories\` memiliki relasi mandiri (\`parent_category_id\`). Buat query untuk menampilkan nama sub-kategori beserta nama kategori induknya.
4. **Multi-table Sales Report**: Tampilkan ringkasan nomor order, nama pelanggan, judul buku, dan subtotal harga.`,
    learningObjectives: [
      'Membedakan perilaku INNER JOIN vs LEFT JOIN',
      'Menggunakan SELF JOIN untuk data berstruktur hierarki/pohon',
      'Mengatasi penanganan nilai NULL pada hasil penggabungan tabel'
    ],
    requirements: [
      'Menulis 4 query penggabungan tabel yang diminta',
      'Hasil query sesuai dengan spesifikasi kolom dan format data',
      'Tidak terjadi perkalian kartesian (Cartesian product)'
    ],
    dueAt: '2026-09-29T23:59:59.000Z',
    status: 'published',
    starterErd: null,
    starterSql: `CREATE TABLE authors (
  author_id INTEGER PRIMARY KEY,
  author_name TEXT NOT NULL,
  country TEXT
);

CREATE TABLE categories (
  category_id INTEGER PRIMARY KEY,
  category_name TEXT NOT NULL,
  parent_category_id INTEGER,
  FOREIGN KEY (parent_category_id) REFERENCES categories(category_id)
);

CREATE TABLE books (
  book_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  author_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY (author_id) REFERENCES authors(author_id),
  FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

CREATE TABLE sales (
  sale_id INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  sale_date DATE NOT NULL,
  FOREIGN KEY (book_id) REFERENCES books(book_id)
);`,
    sampleData: `INSERT INTO authors VALUES (1, 'Pramoedya Ananta Toer', 'Indonesia'), (2, 'Andrea Hirata', 'Indonesia'), (3, 'Yuval Noah Harari', 'Israel');
INSERT INTO categories VALUES (1, 'Buku', NULL), (2, 'Fiksi', 1), (3, 'Non-Fiksi', 1), (4, 'Sains & Sejarah', 3);

INSERT INTO books VALUES
  (101, 'Bumi Manusia', 1, 2, 95000.0),
  (102, 'Laskar Pelangi', 2, 2, 79000.0),
  (103, 'Sapiens: Riwayat Singkat Umat Manusia', 3, 4, 135000.0),
  (104, 'Homo Deus', 3, 4, 140000.0),
  (105, 'Anak Semua Bangsa', 1, 2, 98000.0);

INSERT INTO sales VALUES
  (1, 101, 15, '2026-08-01'),
  (2, 102, 20, '2026-08-02'),
  (3, 103, 12, '2026-08-05'),
  (4, 101, 8, '2026-08-07');`,
    createdByUid: LECTURER_UID,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    assignmentId: 'asg-mbd-06',
    courseId: COURSE_ID,
    title: 'Pertemuan 06: Agregasi Data & Pelaporan Bisnis (GROUP BY, HAVING, Aggregate Functions)',
    description: 'Bangun query agregasi statistik dan laporan analitik omzet merchant pada platform Fintech.',
    instructions: `# Pertemuan 06: Agregasi Statistik & Grouping

## Skenario
Startup Fintech **"DompetKecil"** membutuhkan query laporan berkala dari jutaan transaksi digital yang terjadi di platformnya.

## Soal Laporan
1. Hitung total perputaran uang (\`SUM\`), rata-rata transaksi (\`AVG\`), dan jumlah transaksi (\`COUNT\`) per jenis transaksi (\`payment\`, \`topup\`, \`transfer\`).
2. Tampilkan daftar merchant yang menghasilkan total omzet transaksi di atas Rp 1.000.000 menggunakan klausa \`HAVING\`.
3. Hitung jumlah user unik (\`COUNT(DISTINCT user_id)\`) yang melakukan transaksi di setiap merchant.
4. Tampilkan transaksi terbesar (\`MAX\`) dan terkecil (\`MIN\`) untuk masing-masing kategori merchant.`,
    learningObjectives: [
      'Menguasai fungsi agregasi SQL: COUNT, SUM, AVG, MIN, MAX',
      'Memahami mekanisme pengelompokan baris dengan GROUP BY',
      'Memfilter hasil agregasi menggunakan klausa HAVING'
    ],
    requirements: [
      'Menulis 4 query laporan analitik fintech',
      'Menggunakan klausa HAVING dengan benar (bukan WHERE untuk fungsi agregat)',
      'Format numerik dan output query jelas dan dapat diverifikasi'
    ],
    dueAt: '2026-10-06T23:59:59.000Z',
    status: 'published',
    starterErd: null,
    starterSql: `CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,
  user_name TEXT NOT NULL,
  city TEXT NOT NULL
);

CREATE TABLE merchants (
  merchant_id INTEGER PRIMARY KEY,
  merchant_name TEXT NOT NULL,
  category TEXT NOT NULL
);

CREATE TABLE transactions (
  transaction_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  merchant_id INTEGER,
  type TEXT NOT NULL, -- 'payment', 'topup', 'transfer'
  amount REAL NOT NULL,
  fee REAL DEFAULT 0,
  transaction_time DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (merchant_id) REFERENCES merchants(merchant_id)
);`,
    sampleData: `INSERT INTO users VALUES (1, 'Rian Hidayat', 'Jakarta'), (2, 'Dewi Lestari', 'Surabaya'), (3, 'Eko Nugroho', 'Bandung'), (4, 'Maya Putri', 'Jakarta');
INSERT INTO merchants VALUES (1, 'Kopi Kenangan Senopati', 'F&B'), (2, 'Alfamart Dago', 'Retail'), (3, 'Tokopedia Digital', 'E-Commerce');

INSERT INTO transactions VALUES
  (1, 1, 1, 'payment', 38000.0, 1000.0, '2026-08-01 09:15:00'),
  (2, 1, 2, 'payment', 125000.0, 1500.0, '2026-08-01 14:20:00'),
  (3, 2, 3, 'payment', 850000.0, 2500.0, '2026-08-02 11:00:00'),
  (4, 3, 1, 'payment', 76000.0, 1000.0, '2026-08-02 16:45:00'),
  (5, 4, 3, 'payment', 1200000.0, 2500.0, '2026-08-03 10:10:00'),
  (6, 1, NULL, 'topup', 500000.0, 0, '2026-08-01 08:00:00'),
  (7, 2, NULL, 'topup', 1000000.0, 0, '2026-08-02 09:30:00'),
  (8, 3, 3, 'payment', 650000.0, 2500.0, '2026-08-03 18:00:00');`,
    createdByUid: LECTURER_UID,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    assignmentId: 'asg-mbd-07',
    courseId: COURSE_ID,
    title: 'Pertemuan 07: Subqueries & Common Table Expressions (CTE) Platform Streaming',
    description: 'Gunakan Subqueries bersarang dan CTE untuk memecahkan masalah analitik kompleks pada platform musik streaming.',
    instructions: `# Pertemuan 07: Subqueries & CTE (Common Table Expressions)

## Skenario
Platform streaming audio **"NadaStream"** ingin menganalisis perilaku mendengarkan lagu dan menemukan musisi dengan popularitas di atas rata-rata industri.

## Soal Query
1. **Scalar Subquery**: Cari daftar lagu yang durasinya lebih panjang dari rata-rata durasi seluruh lagu di database.
2. **Correlated Subquery**: Cari lagu di setiap genre yang memiliki jumlah pemutaran (\`play_count\`) lebih tinggi dari rata-rata pemutaran di genre tersebut.
3. **EXISTS / NOT EXISTS**: Temukan artis yang belum pernah merilis lagu di tahun 2026.
4. **Common Table Expression (WITH)**: Buat CTE \`user_listening_stats\` yang menghitung total menit dengar tiap user, lalu di query utama gabungkan dengan tabel user untuk mengambil 3 pengguna paling aktif.`,
    learningObjectives: [
      'Menulis Scalar Subquery dan Table Subquery',
      'Mengimplementasikan Correlated Subqueries dan klausa EXISTS',
      'Menyusun query yang mudah dibaca dengan Common Table Expressions (WITH clause)'
    ],
    requirements: [
      'Menulis 4 query analitik berbasis subquery dan CTE',
      'Struktur CTE dibuat bersih dan modular',
      'Semua query terverifikasi di SQL Playground'
    ],
    dueAt: '2026-10-13T23:59:59.000Z',
    status: 'published',
    starterErd: null,
    starterSql: `CREATE TABLE genres (
  genre_id INTEGER PRIMARY KEY,
  genre_name TEXT NOT NULL
);

CREATE TABLE artists (
  artist_id INTEGER PRIMARY KEY,
  artist_name TEXT NOT NULL,
  monthly_listeners INTEGER DEFAULT 0
);

CREATE TABLE tracks (
  track_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  artist_id INTEGER NOT NULL,
  genre_id INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  play_count INTEGER DEFAULT 0,
  release_year INTEGER NOT NULL,
  FOREIGN KEY (artist_id) REFERENCES artists(artist_id),
  FOREIGN KEY (genre_id) REFERENCES genres(genre_id)
);

CREATE TABLE user_plays (
  play_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  track_id INTEGER NOT NULL,
  played_at DATETIME NOT NULL,
  FOREIGN KEY (track_id) REFERENCES tracks(track_id)
);`,
    sampleData: `INSERT INTO genres VALUES (1, 'Indie Pop'), (2, 'Jazz'), (3, 'Rock');
INSERT INTO artists VALUES (1, 'Tulus', 5200000), (2, 'Hindia', 3400000), (3, 'Maliq & D Essentials', 2800000);

INSERT INTO tracks VALUES
  (1, 'Hati-Hati di Jalan', 1, 1, 242, 150000, 2022),
  (2, 'Monokrom', 1, 1, 214, 98000, 2016),
  (3, 'Evaluasi', 2, 1, 195, 120000, 2019),
  (4, 'Rumah ke Rumah', 2, 1, 280, 145000, 2019),
  (5, 'Kita Bikin Romantis', 3, 2, 220, 85000, 2024),
  (6, 'Senja Teduh', 3, 2, 310, 45000, 2020);

INSERT INTO user_plays VALUES
  (1, 101, 1, '2026-08-01 08:10:00'),
  (2, 101, 4, '2026-08-01 08:15:00'),
  (3, 102, 1, '2026-08-01 09:00:00'),
  (4, 102, 5, '2026-08-01 09:05:00'),
  (5, 103, 3, '2026-08-01 10:00:00');`,
    createdByUid: LECTURER_UID,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    assignmentId: 'asg-mbd-08',
    courseId: COURSE_ID,
    title: 'Pertemuan 08: Strategi Indexing & Optimasi Performa Query (EXPLAIN QUERY PLAN)',
    description: 'Analisis rencana eksekusi query (Query Execution Plan) dan tingkatkan performa pencarian jutaan log pengiriman barang dengan B-Tree Index.',
    instructions: `# Pertemuan 08: Indexing & Query Tuning

## Skenario
Sistem Logistik dan Pelacakan Resi **"KilatExpress"** memuat puluhan ribu rekaman riwayat perjalanan paket. Pencarian resi dengan query \`WHERE tracking_number = '...' AND status = 'in_transit'\` mengalami kelambatan karena operasi Full Table Scan.

## Tugas Eksperimen
1. Jalankan query pencarian menggunakan perintah \`EXPLAIN QUERY PLAN SELECT ...\` sebelum membuat index. Amati pesan \`SCAN TABLE shipments\`.
2. Buat index tunggal pada kolom nomor resi: \`CREATE UNIQUE INDEX idx_shipments_tracking ON shipments(tracking_number)\`.
3. Buat composite index pada kolom filter multi-kriteria: \`CREATE INDEX idx_shipments_status_city ON shipments(destination_city, status)\`.
4. Jalankan ulang \`EXPLAIN QUERY PLAN\` dan buktikan query kini menggunakan \`SEARCH TABLE shipments USING INDEX idx_...\`.`,
    learningObjectives: [
      'Membaca dan menafsirkan output EXPLAIN QUERY PLAN',
      'Merancang Single Index dan Composite Index yang efektif',
      'Memahami Trade-Off indeksasi terhadap operasi INSERT/UPDATE'
    ],
    requirements: [
      'Menulis DDL pembuatan unique index dan composite index',
      'Menyertakan perbandingan query plan sebelum dan sesudah indeksasi',
      'Memastikan tidak terjadi redundant index'
    ],
    dueAt: '2026-10-20T23:59:59.000Z',
    status: 'published',
    starterErd: null,
    starterSql: `CREATE TABLE shipments (
  shipment_id INTEGER PRIMARY KEY,
  tracking_number TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  receiver_name TEXT NOT NULL,
  origin_city TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'in_transit', 'delivered', 'returned'
  weight_kg REAL NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE TABLE tracking_checkpoints (
  checkpoint_id INTEGER PRIMARY KEY,
  shipment_id INTEGER NOT NULL,
  location_name TEXT NOT NULL,
  checkpoint_time DATETIME NOT NULL,
  notes TEXT,
  FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id)
);`,
    sampleData: `INSERT INTO shipments VALUES
  (1, 'KLT-20260801-001', 'Budi Santoso', 'Siti Rahma', 'Jakarta', 'Surabaya', 'delivered', 2.5, '2026-08-01 10:00:00'),
  (2, 'KLT-20260801-002', 'Toko Sepatu Jaya', 'Andi Pratama', 'Bandung', 'Medan', 'in_transit', 1.2, '2026-08-01 11:30:00'),
  (3, 'KLT-20260802-003', 'Mega Elektronik', 'Farhan Ali', 'Jakarta', 'Makassar', 'in_transit', 5.0, '2026-08-02 09:15:00'),
  (4, 'KLT-20260802-004', 'Distro Bandung', 'Rina Marlina', 'Bandung', 'Surabaya', 'pending', 0.8, '2026-08-02 14:00:00');

INSERT INTO tracking_checkpoints VALUES
  (1, 1, 'Hub Jakarta Barat', '2026-08-01 12:00:00', 'Paket disortir'),
  (2, 1, 'Hub Surabaya Rungkut', '2026-08-02 08:00:00', 'Dibawa kurir'),
  (3, 1, 'Penerima', '2026-08-02 11:30:00', 'Diterima oleh Siti Rahma'),
  (4, 2, 'Hub Bandung Kota', '2026-08-01 13:00:00', 'Dalam perjalanan kargo');`,
    createdByUid: LECTURER_UID,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    assignmentId: 'asg-mbd-09',
    courseId: COURSE_ID,
    title: 'Pertemuan 09: Manajemen Transaksi & Prinsip ACID pada Sistem Finansial',
    description: 'Terapkan transaksi database dengan BEGIN, COMMIT, ROLLBACK, dan SAVEPOINT untuk menjamin integritas transfer saldo rekening.',
    instructions: `# Pertemuan 09: Transaksi Database & ACID Properties

## Skenario
Bank Digital **"Artha Mandiri"** memproses transaksi transfer dana antar nasabah. Setiap transfer harus memenuhi prinsip **Atomicity** (semua langkah sukses atau tidak ada sama sekali).

## Skenario Pengujian
1. **Skenario Sukses**:
   - Mulai transaksi (\`BEGIN TRANSACTION\`).
   - Kurangi saldo Rekening A sebesar Rp 250.000.
   - Tambah saldo Rekening B sebesar Rp 250.000.
   - Catat riwayat di tabel \`transfer_logs\`.
   - Simpan permanen dengan \`COMMIT\`.
2. **Skenario Gagal (Simulasi Gangguan)**:
   - Mulai transaksi (\`BEGIN TRANSACTION\`).
   - Kurangi saldo Rekening A.
   - Terjadi kegagalan validasi (misal saldo tidak mencukupi / rekening tujuan diblokir).
   - Batalkan seluruh perubahan dengan \`ROLLBACK\`.
   - Buktikan saldo Rekening A tetap utuh tidak terpotong.`,
    learningObjectives: [
      'Memahami 4 pilar ACID: Atomicity, Consistency, Isolation, Durability',
      'Mengoperasikan perintah BEGIN TRANSACTION, COMMIT, dan ROLLBACK',
      'Menerapkan constraint level database untuk mencegah saldo minus'
    ],
    requirements: [
      'Menulis script transaksi transfer sukses lengkap dengan COMMIT',
      'Menulis script simulasi transaksi gagal lengkap dengan ROLLBACK',
      'Memverifikasi saldo akhir kedua rekening akurat'
    ],
    dueAt: '2026-10-27T23:59:59.000Z',
    status: 'published',
    starterErd: null,
    starterSql: `CREATE TABLE bank_accounts (
  account_number TEXT PRIMARY KEY,
  account_holder TEXT NOT NULL,
  balance REAL NOT NULL CHECK (balance >= 0),
  is_active INTEGER DEFAULT 1
);

CREATE TABLE transfer_logs (
  transfer_id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL, -- 'SUCCESS', 'FAILED'
  timestamp DATETIME NOT NULL,
  FOREIGN KEY (from_account) REFERENCES bank_accounts(account_number),
  FOREIGN KEY (to_account) REFERENCES bank_accounts(account_number)
);`,
    sampleData: `INSERT INTO bank_accounts VALUES 
  ('ACC-1001', 'Ahmad Fauzi (Pengirim)', 1500000.0, 1),
  ('ACC-2002', 'Budi Pratama (Penerima)', 500000.0, 1),
  ('ACC-3003', 'Akun Rekening Beku', 100000.0, 0);`,
    createdByUid: LECTURER_UID,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    assignmentId: 'asg-mbd-10',
    courseId: COURSE_ID,
    title: 'Pertemuan 10: Database Views & Keamanan Abstraksi Data SDM (HRIS)',
    description: 'Buat Database Views untuk menyembunyikan data gaji rahasia dan menyederhanakan laporan manajerial.',
    instructions: `# Pertemuan 10: Database Views & Keamanan Data

## Skenario
Sistem Manajemen Karyawan **"HR-Pro"** mengelola data personal, jabatan, divisi, dan riwayat penggajian (payroll). Manajemen menginginkan pembatasan akses data:
- Staff HR umum hanya boleh melihat direktori kontak tanpa melihat nominal gaji.
- Manajer divisi membutuhkan ringkasan total anggaran gaji per divisi.

## Tugas Mahasiswa
1. **View Direktori Karyawan (\`v_employee_directory\`)**:
   - Tampilkan: NIK, Nama Lengkap, Email Kantor, Nama Divisi, Nama Jabatan, dan Tanggal Masuk. Sembunyikan kolom gaji (\`salary\`) dan nomor KTP.
2. **View Ringkasan Payroll Divisi (\`v_division_payroll_summary\`)**:
   - Tampilkan: Nama Divisi, Jumlah Karyawan, Total Pengeluaran Gaji, dan Rata-rata Gaji per divisi.
3. Uji pemanggilan \`SELECT * FROM v_employee_directory WHERE division_name = 'Engineering'\`.`,
    learningObjectives: [
      'Membuat dan mengelola View dengan perintah CREATE VIEW',
      'Menerapkan abstraksi keamanan data (Data Masking & Row/Column Security)',
      'Mempermudah query analitik berulang menggunakan View'
    ],
    requirements: [
      'Membuat View v_employee_directory tanpa eksposur kolom sensitif',
      'Membuat View v_division_payroll_summary dengan agregasi divisi akurat',
      'Semua query SELECT terhadap View berjalan sukses'
    ],
    dueAt: '2026-11-03T23:59:59.000Z',
    status: 'published',
    starterErd: null,
    starterSql: `CREATE TABLE divisions (
  division_id INTEGER PRIMARY KEY,
  division_name TEXT NOT NULL
);

CREATE TABLE positions (
  position_id INTEGER PRIMARY KEY,
  position_title TEXT NOT NULL
);

CREATE TABLE employees (
  employee_id INTEGER PRIMARY KEY,
  nik TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  id_card_number TEXT NOT NULL, -- Kolom sensitif (KTP)
  email TEXT UNIQUE NOT NULL,
  division_id INTEGER NOT NULL,
  position_id INTEGER NOT NULL,
  salary REAL NOT NULL, -- Kolom sensitif (Gaji)
  join_date DATE NOT NULL,
  FOREIGN KEY (division_id) REFERENCES divisions(division_id),
  FOREIGN KEY (position_id) REFERENCES positions(position_id)
);`,
    sampleData: `INSERT INTO divisions VALUES (1, 'Engineering'), (2, 'Marketing'), (3, 'Finance & HR');
INSERT INTO positions VALUES (1, 'Senior Software Engineer'), (2, 'Product Manager'), (3, 'Digital Marketing Lead'), (4, 'Financial Analyst');

INSERT INTO employees VALUES
  (1, 'EMP001', 'Aris Setiawan', '3171012345670001', 'aris@megacorp.id', 1, 1, 18500000.0, '2022-01-15'),
  (2, 'EMP002', 'Nadia Safitri', '3171012345670002', 'nadia@megacorp.id', 1, 2, 21000000.0, '2021-06-01'),
  (3, 'EMP003', 'Dimas Anggara', '3273012345670003', 'dimas@megacorp.id', 2, 3, 14000000.0, '2023-03-10'),
  (4, 'EMP004', 'Clara Vania', '3273012345670004', 'clara@megacorp.id', 3, 4, 12500000.0, '2023-08-20');`,
    createdByUid: LECTURER_UID,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    assignmentId: 'asg-mbd-11',
    courseId: COURSE_ID,
    title: 'Pertemuan 11: Otomasi Proses Bisnis dengan Database Triggers (POS System)',
    description: 'Implementasikan Database Triggers untuk otomatisasi pengurangan stok dan pencatatan audit trail perubahan harga produk.',
    instructions: `# Pertemuan 11: Database Triggers & Audit Automation

## Skenario
Aplikasi Kasir Toko Retail **"SmartPOS"** membutuhkan otomatisasi di level database:
1. Setiap kali terjadi penjualan di tabel \`sale_items\`, sistem harus otomatis mengurangi jumlah stok (\`stock_quantity\`) di tabel \`products\`.
2. Setiap kali ada staf yang mengubah harga produk di tabel \`products\`, sistem harus mencatat rekam jejak (\`price_audit_log\`) yang menyimpan harga lama, harga baru, dan waktu perubahan.

## Tugas Mahasiswa
1. Buat trigger \`trg_update_stock_after_sale\` bertipe \`AFTER INSERT ON sale_items\`:
   \`\`\`sql
   UPDATE products SET stock_quantity = stock_quantity - NEW.quantity WHERE product_id = NEW.product_id;
   \`\`\`
2. Buat trigger \`trg_log_price_change\` bertipe \`AFTER UPDATE OF unit_price ON products\`.
3. Uji trigger dengan melakukan transaksi penjualan dan modifikasi harga barang. Buktikan log dan stok otomatis ter-update!`,
    learningObjectives: [
      'Memahami siklus hidup Trigger (BEFORE, AFTER, INSTEAD OF)',
      'Menggunakan pseudo-records NEW dan OLD',
      'Menerapkan pola Audit Trail untuk keamanan dan compliance data'
    ],
    requirements: [
      'Membuat trigger pengurangan stok otomatis yang berfungsi akurat',
      'Membuat trigger audit log riwayat harga',
      'Menyertakan query pengujian untuk membuktikan kinerja trigger'
    ],
    dueAt: '2026-11-10T23:59:59.000Z',
    status: 'published',
    starterErd: null,
    starterSql: `CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  product_name TEXT NOT NULL,
  unit_price REAL NOT NULL,
  stock_quantity INTEGER NOT NULL CHECK (stock_quantity >= 0)
);

CREATE TABLE sales (
  sale_id INTEGER PRIMARY KEY,
  sale_date DATETIME NOT NULL,
  cashier_name TEXT NOT NULL
);

CREATE TABLE sale_items (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(sale_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE price_audit_log (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  old_price REAL NOT NULL,
  new_price REAL NOT NULL,
  changed_at DATETIME NOT NULL
);`,
    sampleData: `INSERT INTO products VALUES
  (1, 'Minyak Goreng Sania 2L', 34000.0, 100),
  (2, 'Beras Ramos 5kg', 68000.0, 50),
  (3, 'Gula Pasir Gulaku 1kg', 17500.0, 80);

INSERT INTO sales VALUES (1001, '2026-08-01 08:30:00', 'Kasir Siti');`,
    createdByUid: LECTURER_UID,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    assignmentId: 'asg-mbd-12',
    courseId: COURSE_ID,
    title: 'Pertemuan 12: Capstone Project — Rancang Bangun Database Multi-Vendor Marketplace',
    description: 'Proyek akhir semester: Rancang arsitektur database lengkap, ERD modeling, DDL, data seeding, dan 10 business queries pada platform Marketplace.',
    instructions: `# Pertemuan 12: Capstone Final Project Marketplace Multi-Vendor

## Deskripsi Tugas Akhir
Sebagai tugas akhir mata kuliah Manajemen Database, Anda diminta merancang arsitektur database lengkap untuk platform e-commerce multi-vendor **"PasarDigital"**.

## Cakupan Arsitektur Minimal (7 Tabel Terelasi):
1. \`users\` (Pembeli & Penjual)
2. \`stores\` (Toko merchant milik penjual)
3. \`products\` (Katalog produk dengan variasi harga & stok)
4. \`categories\` (Kategori produk bertingkat)
5. \`orders\` (Header transaksi pemesanan)
6. \`order_items\` (Detail barang pesanan per toko)
7. \`reviews\` (Ulasan dan rating kepuasan pembeli)

## Deliverables yang Dinilai:
1. **Visual ERD**: Desain ERD bersih dengan relasi 1:N dan M:N yang ternormalisasi (3NF).
2. **DDL & Constraints**: Primary key, foreign key with cascades, default values, checks.
3. **Data Seeding**: Masukkan minimal 5 user, 3 toko, 10 produk, 5 order, dan 5 review.
4. **10 Analytical SQL Queries**:
   - Top 3 Toko dengan omzet tertinggi bulan ini.
   - Produk terlaris per kategori.
   - Pengguna dengan retensi belanja tertinggi.
   - Rata-rata rating toko berdasarkan ulasan produk.
   - Daftar pesanan yang pending pembayaran lebih dari 24 jam.
5. **Submit Database**: Kumpulkan snapshot database dan ERD Anda melalui tombol pengumpulan tugas.`,
    learningObjectives: [
      'Merancang arsitektur database skala industri secara mandiri',
      'Mengintegrasikan seluruh materi: ERD, Normalisasi, SQL DDL/DML, JOINs, Subqueries, Indexing',
      'Menyusun dokumentasi dan analitik bisnis database yang komprehensif'
    ],
    requirements: [
      'ERD memiliki minimal 7 tabel terhubung dengan relasi valid',
      'Database lolos validasi integritas referensial dan 3NF',
      'Menyertakan minimal 10 query SQL analitik bisnis yang siap dieksekusi',
      'Snapshot SQLite berhasil di-generate dan disubmit'
    ],
    dueAt: '2026-11-24T23:59:59.000Z',
    status: 'published',
    starterErd: {
      schemaVersion: 1,
      projectId: 'starter-mbd-capstone',
      name: 'PasarDigital Marketplace - Capstone Template',
      tables: [
        {
          id: 'tbl-mkt-users',
          name: 'users',
          position: { x: 50, y: 100 },
          columns: [
            { id: 'c-u-id', name: 'user_id', type: 'INTEGER', primaryKey: true, nullable: false, unique: true },
            { id: 'c-u-name', name: 'username', type: 'TEXT', primaryKey: false, nullable: false, unique: true },
            { id: 'c-u-email', name: 'email', type: 'TEXT', primaryKey: false, nullable: false, unique: true },
            { id: 'c-u-role', name: 'role', type: 'TEXT', primaryKey: false, nullable: false, unique: false }
          ]
        },
        {
          id: 'tbl-mkt-stores',
          name: 'stores',
          position: { x: 450, y: 100 },
          columns: [
            { id: 'c-s-id', name: 'store_id', type: 'INTEGER', primaryKey: true, nullable: false, unique: true },
            { id: 'c-s-owner-id', name: 'owner_user_id', type: 'INTEGER', primaryKey: false, nullable: false, unique: false },
            { id: 'c-s-name', name: 'store_name', type: 'TEXT', primaryKey: false, nullable: false, unique: false },
            { id: 'c-s-rating', name: 'avg_rating', type: 'REAL', primaryKey: false, nullable: false, unique: false }
          ]
        },
        {
          id: 'tbl-mkt-products',
          name: 'products',
          position: { x: 450, y: 350 },
          columns: [
            { id: 'c-p-id', name: 'product_id', type: 'INTEGER', primaryKey: true, nullable: false, unique: true },
            { id: 'c-p-store-id', name: 'store_id', type: 'INTEGER', primaryKey: false, nullable: false, unique: false },
            { id: 'c-p-name', name: 'product_name', type: 'TEXT', primaryKey: false, nullable: false, unique: false },
            { id: 'c-p-price', name: 'price', type: 'REAL', primaryKey: false, nullable: false, unique: false },
            { id: 'c-p-stock', name: 'stock', type: 'INTEGER', primaryKey: false, nullable: false, unique: false }
          ]
        }
      ],
      relationships: [
        {
          id: 'rel-user-stores',
          sourceTableId: 'tbl-mkt-stores',
          sourceColumnId: 'c-s-owner-id',
          targetTableId: 'tbl-mkt-users',
          targetColumnId: 'c-u-id',
          cardinality: 'many-to-one'
        },
        {
          id: 'rel-store-products',
          sourceTableId: 'tbl-mkt-products',
          sourceColumnId: 'c-p-store-id',
          targetTableId: 'tbl-mkt-stores',
          targetColumnId: 'c-s-id',
          cardinality: 'many-to-one'
        }
      ],
      viewport: { x: 0, y: 0, zoom: 1 }
    },
    starterSql: `-- Template Awal PasarDigital Marketplace
CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('buyer', 'seller', 'admin'))
);

CREATE TABLE stores (
  store_id INTEGER PRIMARY KEY,
  owner_user_id INTEGER NOT NULL,
  store_name TEXT NOT NULL,
  city TEXT NOT NULL,
  avg_rating REAL DEFAULT 0,
  FOREIGN KEY (owner_user_id) REFERENCES users(user_id)
);

CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  store_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (store_id) REFERENCES stores(store_id)
);`,
    sampleData: `INSERT INTO users VALUES
  (1, 'ahmad_seller', 'ahmad@store.com', 'seller'),
  (2, 'siti_buyer', 'siti@gmail.com', 'buyer'),
  (3, 'budi_buyer', 'budi@gmail.com', 'buyer'),
  (4, 'rina_seller', 'rina@boutique.id', 'seller');

INSERT INTO stores VALUES
  (101, 1, 'Kopi Nusantara Official', 'Jakarta', 4.8),
  (102, 4, 'Batik Cantik Nusantara', 'Yogyakarta', 4.9);

INSERT INTO products VALUES
  (1, 101, 'Kopi Arabika Toraja 250g', 85000.0, 40),
  (2, 101, 'Kopi Robusta Lampung 500g', 65000.0, 75),
  (3, 102, 'Kain Batik Tulis Motif Parang', 350000.0, 15);`,
    createdByUid: LECTURER_UID,
    createdAt: NOW,
    updatedAt: NOW
  }
];

async function seed() {
  console.log(`\n📚 [1/2] Upserting Course: "${courseData.title}" (${courseData.courseId})...`);
  await upsert(`courses/${COURSE_ID}`, courseData);
  console.log(`✅ Course "${courseData.title}" upserted for Lecturer ${LECTURER_UID}`);

  console.log(`\n📝 [2/2] Upserting ${assignments.length} Comprehensive Assignments...`);
  let count = 0;
  for (const asg of assignments) {
    await upsert(`assignments/${asg.assignmentId}`, asg);
    count++;
    console.log(`   [${count}/${assignments.length}] ✅ Upserted: ${asg.assignmentId} - ${asg.title}`);
  }

  console.log(`\n🎉 Successfully seeded Course and ${count} Assignments into Firestore!`);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
