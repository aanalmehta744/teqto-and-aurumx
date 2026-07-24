const http = require("http");
const express = require('express');
const cors = require('cors');

const { Server } = require("socket.io");
const {initializeSocket} = require("./socket");


const path = require('path'); // Import path module
const projectsRouter = require('./projects/projects'); // Import the projects routes
const employeesRoutes = require('./employees/employees'); // Import the employees routes
const authRoutes = require('./authentication/auth'); // Import the authentication routes
const holidaysRouter = require('./holidays/holidays'); // Import the holidays routes
const clientRoutes = require('./clients/clients'); // Import the client routes
const leaveRoutes = require('./leaves/leave_requests'); // Import the client routes
const myleaveRoutes = require('./leaves/my-leave'); // Import the client routes
const attendancesRoutes = require('./attandance/attendances');
// const attendancesRoutes = require('./attandance/routes/attendance-routes');

const todayAttendancesRoutes = require('./attandance/today-attendances');
// const todayAttendancesRoutes = require('./attandance/routes/attendance-routes');

const payrollRoutes = require('./payroll/payroll');
const taskRoutes = require('./tasks/tasks');
const calendarRoutes = require('./calender/calender');
const candidateRoutes = require('./jobs/candidates');
const jobRoutes = require('./jobs/jobs'); // Import the job routes
const interviewRoutes = require('./jobs/interview'); // Import the job routes

const chatRoutes = require("./chat/chatRoutes");

const admindashboardRoutes = require('./dashboard/admindashboard');
const dailyUpdatesRoutes = require('./daily-updates/daily-updates');
const announcementRoutes = require('./announcements/announcements');
// const bdeKpiRoutes = require('./bde-kpi/bde-kpi');
// const bdeActivitiesRoutes = require('./bde-activities/bde-activities');
const bdePerformanceRoutes = require('./bde-performance/bde-performance');
const bdeClientTargetsRoutes = require('./bde-client-targets/bde-client-targets');
const notificationsRoutes = require('./notifications/notifications');
const clientDailyNotesRoutes = require('./client-daily-notes/client-daily-notes');
const loginSettingsRoutes = require('./login-settings/login-settings');
const db = require('./connection');
const app = express();

// Ensure all core tables exist and apply migrations on startup
(async () => {
    // Core tables — CREATE IF NOT EXISTS is safe to run every boot
    const coreTables = [
        `CREATE TABLE IF NOT EXISTS employees (id INT AUTO_INCREMENT PRIMARY KEY, fullName VARCHAR(255), gender VARCHAR(50), mobile VARCHAR(20), password VARCHAR(255), department VARCHAR(100), address TEXT, email VARCHAR(255) UNIQUE, dob DATE, salary DECIMAL(10,2), uploadImg VARCHAR(255), joining_date DATE, role VARCHAR(50), panCard VARCHAR(50), aadharCard VARCHAR(50), total_leave INT DEFAULT 12, leave_balance DECIMAL(10,2) DEFAULT 12.00, status TINYINT DEFAULT 1, termination_date DATE, employment_type TINYINT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS attendance (id INT AUTO_INCREMENT PRIMARY KEY, employee_id INT, date DATE, status VARCHAR(50), check_in DATETIME, check_out DATETIME, hours VARCHAR(50), break VARCHAR(50), is_paused TINYINT DEFAULT 0, elapsed_time INT DEFAULT 0, pause_start DATETIME, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY unique_employee_date (employee_id, date))`,
        `CREATE TABLE IF NOT EXISTS projects (id INT AUTO_INCREMENT PRIMARY KEY, projectNO VARCHAR(50), projectTitle VARCHAR(255), department VARCHAR(100), priority VARCHAR(50), client INT, startDate DATETIME, endDate DATETIME, team TEXT, status VARCHAR(50), description TEXT, tags TEXT, progress INT DEFAULT 0)`,
        `CREATE TABLE IF NOT EXISTS clients (id INT AUTO_INCREMENT PRIMARY KEY, fullName VARCHAR(255), mobile VARCHAR(20), email VARCHAR(255), linkedin_id VARCHAR(255), website_link VARCHAR(255), client_note TEXT, country VARCHAR(100), address TEXT, client_type VARCHAR(50), client_Connect_Type VARCHAR(50), bde_account_id VARCHAR(100), bde_account_email VARCHAR(255), date DATE, platform VARCHAR(100), technology VARCHAR(100), prize_tag VARCHAR(50), prize_amount DECIMAL(10,2), employee_id INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS client_followups (id INT AUTO_INCREMENT PRIMARY KEY, client_id INT, bde_id INT, followup_date DATETIME, notes TEXT, status VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS holidays (id INT AUTO_INCREMENT PRIMARY KEY, hName VARCHAR(255), date DATE, details TEXT)`,
        `CREATE TABLE IF NOT EXISTS leave_requests (id INT AUTO_INCREMENT PRIMARY KEY, employee_id INT, leave_type VARCHAR(50), start_date DATETIME, end_date DATETIME, reason TEXT, no_of_days DECIMAL(5,2), status VARCHAR(50), halfDay VARCHAR(50) DEFAULT '', sandwich_confirm TINYINT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS tasks (id INT AUTO_INCREMENT PRIMARY KEY, employee_id INT, project_id INT, trainer_project_name VARCHAR(255), employee_type VARCHAR(50), title VARCHAR(255), done TINYINT DEFAULT 0, note TEXT, priority VARCHAR(50), due_date DATE, create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS daily_updates (id INT AUTO_INCREMENT PRIMARY KEY, employee_id INT, project_id INT, task_id INT, update_date DATE, update_details TEXT, status VARCHAR(50), trainer_project_name VARCHAR(255))`,
        `CREATE TABLE IF NOT EXISTS jobs (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255), department VARCHAR(100), jobType VARCHAR(50), vacancies INT, closedVacancies INT DEFAULT 0, status VARCHAR(50), description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS candidates (id INT AUTO_INCREMENT PRIMARY KEY, full_name VARCHAR(255), mobile VARCHAR(20), email VARCHAR(255), linkedin VARCHAR(255), address TEXT, gender VARCHAR(50), experience VARCHAR(100), last_company VARCHAR(255), last_ctc VARCHAR(100), resume VARCHAR(255), job_id INT, status VARCHAR(50), previous_status VARCHAR(50), remarks TEXT)`,
        `CREATE TABLE IF NOT EXISTS interviews (id INT AUTO_INCREMENT PRIMARY KEY, candidate_id INT, job_id INT, interview_date DATE, interview_time TIME, interview_type VARCHAR(50), mode VARCHAR(50), location VARCHAR(255), status VARCHAR(50), remarks TEXT, employee_id INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS salary_slips (id INT AUTO_INCREMENT PRIMARY KEY, employee_id INT, month INT, year INT, base_salary DECIMAL(10,2), unpaid_leave_days DECIMAL(5,2), final_salary DECIMAL(10,2), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS salary_payslip (id INT AUTO_INCREMENT PRIMARY KEY, employee_id INT, month INT, year INT, working_days DECIMAL(5,2), paid_leave_days DECIMAL(5,2), unpaid_leave_days DECIMAL(5,2), net_salary DECIMAL(10,2), addon_amount DECIMAL(10,2) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS emails (id INT AUTO_INCREMENT PRIMARY KEY, subject VARCHAR(255), body TEXT, sender_user_type VARCHAR(50), sender_user_id INT, recipient_user_type VARCHAR(50), recipient_user_id INT, folder VARCHAR(50), labels TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS payments (id INT AUTO_INCREMENT PRIMARY KEY, bill_no VARCHAR(100), client_id INT, employee_id INT, payment_date DATE, discount DECIMAL(10,2), total_amount DECIMAL(10,2), payment_method VARCHAR(50), payment_status VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
    ];
    for (const sql of coreTables) {
        await db.query(sql).catch(err => console.error('Table create error:', err.message));
    }
    console.log('✅ Core tables verified');

    try {
        await db.query(`ALTER TABLE leave_requests MODIFY COLUMN halfDay VARCHAR(50) DEFAULT ''`);
        console.log('✅ halfDay column migrated to VARCHAR(50)');
    } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') {
            console.log('ℹ️  halfDay column already VARCHAR or migration not needed:', err.message);
        }
    }
    // Ensure announcements table exists
    await db.query(`CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        text TEXT NOT NULL,
        image_path VARCHAR(255),
        created_by INT,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).catch(() => {});

    // BDE KPI & Performance tables
    await db.query(`CREATE TABLE IF NOT EXISTS kpi_master (
        kpi_id INT AUTO_INCREMENT PRIMARY KEY,
        kpi_name VARCHAR(255) NOT NULL,
        kpi_description TEXT,
        unit VARCHAR(50),
        kpi_type ENUM('calls','meetings','conversions_count','conversions_revenue') NOT NULL,
        is_active TINYINT DEFAULT 1,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).catch(() => {});

    await db.query(`CREATE TABLE IF NOT EXISTS kpi_targets (
        target_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        kpi_id INT NOT NULL,
        target_value DECIMAL(12,2) NOT NULL,
        month TINYINT NOT NULL,
        year SMALLINT NOT NULL,
        weightage DECIMAL(5,2),
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`).catch(() => {});

    await db.query(`CREATE TABLE IF NOT EXISTS bde_calls (
        call_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        lead_id INT,
        customer_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20),
        call_date DATE NOT NULL,
        call_duration VARCHAR(20),
        call_status ENUM('connected','no_answer','busy') NOT NULL,
        call_outcome ENUM('interested','not_interested','follow_up'),
        call_notes TEXT,
        next_action_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).catch(() => {});

    await db.query(`CREATE TABLE IF NOT EXISTS bde_meetings (
        meeting_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        lead_id INT,
        client_name VARCHAR(255) NOT NULL,
        meeting_date DATE NOT NULL,
        meeting_time TIME,
        meeting_mode ENUM('online','offline') DEFAULT 'offline',
        meeting_status ENUM('scheduled','completed','no_show','cancelled') NOT NULL,
        meeting_outcome ENUM('positive','negative','follow-up'),
        meeting_notes TEXT,
        next_meeting_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).catch(() => {});

    await db.query(`CREATE TABLE IF NOT EXISTS bde_conversions (
        conversion_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        lead_id INT,
        client_name VARCHAR(255) NOT NULL,
        deal_value DECIMAL(12,2) DEFAULT 0,
        product_service VARCHAR(255),
        conversion_status ENUM('won','lost') NOT NULL,
        conversion_date DATE NOT NULL,
        closing_notes TEXT,
        lost_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).catch(() => {});

    await db.query(`CREATE TABLE IF NOT EXISTS kpi_snapshots (
        snapshot_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        kpi_id INT NOT NULL,
        month TINYINT NOT NULL,
        year SMALLINT NOT NULL,
        target_value DECIMAL(12,2),
        achieved_value DECIMAL(12,2),
        achievement_percentage DECIMAL(5,2),
        status ENUM('green','yellow','red') DEFAULT 'red',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_snapshot (user_id, kpi_id, month, year)
    )`).catch(() => {});

    // Add client_type column to bde_conversions if not already present
    await db.query(`ALTER TABLE bde_conversions ADD COLUMN client_type ENUM('full_time','part_time','hourly','project_base') NULL`).catch(() => {});
    // Add client_id so we can uniquely track which client this conversion is for
    await db.query(`ALTER TABLE bde_conversions ADD COLUMN client_id INT NULL`).catch(() => {});
    // Add unique constraint so ON DUPLICATE KEY UPDATE works correctly (one conversion per client)
    await db.query(`ALTER TABLE bde_conversions ADD UNIQUE KEY unique_client_conversion (client_id)`).catch(() => {});
    // Clean up stale conversions whose clients were deleted (client_id set but client no longer exists)
    await db.query(`
        DELETE FROM bde_conversions
        WHERE client_id IS NOT NULL
          AND client_id NOT IN (SELECT id FROM clients)
    `).catch(() => {});

    // Daily client notes
    await db.query(`CREATE TABLE IF NOT EXISTS client_daily_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        bde_id INT NOT NULL,
        note_date DATE NOT NULL,
        note_text TEXT NOT NULL,
        mood ENUM('positive','neutral','negative') DEFAULT 'neutral',
        next_action VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_client_date (client_id, note_date),
        INDEX idx_bde (bde_id)
    )`).catch(() => {});

    // Old per-type targets table (kept for backward compat)
    await db.query(`CREATE TABLE IF NOT EXISTS bde_client_type_targets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bde_id INT NOT NULL,
        month TINYINT NOT NULL,
        year SMALLINT NOT NULL,
        client_type ENUM('full_time','part_time','hourly','project_base') NOT NULL,
        target_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`).catch(() => {});

    // Notifications table for prize_tag change alerts
    await db.query(`CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) DEFAULT 'prize_tag_change',
        message TEXT NOT NULL,
        client_id INT,
        bde_id INT,
        is_read TINYINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).catch(() => {});

    // Add recipient columns to notifications for per-user notifications
    await db.query(`ALTER TABLE notifications ADD COLUMN recipient_id INT NULL`).catch(() => {});
    await db.query(`ALTER TABLE notifications ADD COLUMN recipient_role VARCHAR(20) NULL`).catch(() => {});

    // If bde_targets was created with wrong column name 'target_month', rename it
    await db.query(`ALTER TABLE bde_targets CHANGE COLUMN target_month month TINYINT NOT NULL`).catch(() => {});

    // New unified targets table (one row per BDE per month/year)
    // Login page settings (one-row config table)
    await db.query(`CREATE TABLE IF NOT EXISTS login_page_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        image_path VARCHAR(255),
        text TEXT,
        updated_by INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`).catch(() => {});

    await db.query(`CREATE TABLE IF NOT EXISTS bde_targets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bde_id INT NOT NULL,
        month TINYINT NOT NULL,
        year SMALLINT NOT NULL,
        full_time INT NOT NULL DEFAULT 0,
        part_time INT NOT NULL DEFAULT 0,
        hourly INT NOT NULL DEFAULT 0,
        project_base INT NOT NULL DEFAULT 0,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_bde_target (bde_id, month, year)
    )`).catch(() => {});

    // Add new columns to clients table if not already present
    await db.query(`ALTER TABLE clients ADD COLUMN tag VARCHAR(100) NULL`).catch(() => {});
    await db.query(`ALTER TABLE clients ADD COLUMN client_connect_source VARCHAR(255) NULL`).catch(() => {});
    await db.query(`ALTER TABLE clients ADD COLUMN platform_id VARCHAR(255) NULL`).catch(() => {});
    await db.query(`ALTER TABLE clients ADD COLUMN platform_password VARCHAR(255) NULL`).catch(() => {});
    await db.query(`ALTER TABLE clients ADD COLUMN bank_name VARCHAR(255) NULL`).catch(() => {});
    await db.query(`ALTER TABLE clients ADD COLUMN bank_account_number VARCHAR(100) NULL`).catch(() => {});
    await db.query(`ALTER TABLE clients ADD COLUMN ifsc_code VARCHAR(50) NULL`).catch(() => {});
})();

const server = http.createServer(app);


const port = process.env.PORT || 3000;


const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
console.log("✅ Socket.IO Initialized");


initializeSocket(io);

io.on("connection", (socket) => {

  console.log(
    "User Connected:",
    socket.id
  );

  socket.on(
    "join_conversation",
    (conversationId) => {

      socket.join(
        `conversation_${conversationId}`
      );

      console.log(
        `Socket ${socket.id} joined conversation ${conversationId}`
      );

    }
  );

  socket.on("disconnect", () => {

    console.log(
      "User Disconnected:",
      socket.id
    );

  });

});


// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log incoming requests
app.use((req, res, next) => {
    console.log(`Received ${req.method} request for ${req.url}`);
    next();
});

// Use the routes with respective prefixes
app.use('/api/authentication', authRoutes); // Prefix for authentication routes
app.use('/api/projects', projectsRouter); // Prefix for project routes
app.use('/api/employees', employeesRoutes); // Prefix for employee routes
app.use('/api/holidays', holidaysRouter); // Prefix for holiday routes
app.use('/api/leaveRequests', leaveRoutes); // Prefix for leave routes
app.use('/api/myleave', myleaveRoutes); // Prefix for employeeleave routes
app.use('/api/attendances', attendancesRoutes);
app.use('/api/clients', clientRoutes); // Prefix for client routes
app.use('/api/todayattendances', todayAttendancesRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/jobs', jobRoutes); // Prefix for job routes
app.use('/api/interviews', interviewRoutes); // Prefix for job routes
app.use('/api/admindashboard', admindashboardRoutes);
app.use('/api/dailyUpdates', dailyUpdatesRoutes);
app.use('/api/announcements', announcementRoutes);
// app.use('/api/kpi', bdeKpiRoutes);
// app.use('/api/bde', bdeActivitiesRoutes);
app.use('/api/bde-performance', bdePerformanceRoutes);
app.use('/api/bde-client-targets', bdeClientTargetsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/client-daily-notes', clientDailyNotesRoutes);
app.use('/api/login-settings', loginSettingsRoutes);



app.use("/api/chat", chatRoutes);





// Default error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ message: 'Internal Server Error' });
});




// Start server
// app.listen(port, () => {
//     console.log(`Server running on http://localhost:${port}`);
// });

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});