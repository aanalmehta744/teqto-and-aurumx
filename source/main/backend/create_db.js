const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function setup() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
    });

    console.log('Connected to MySQL');

    await connection.query('CREATE DATABASE IF NOT EXISTS `' + (process.env.DB_NAME || 'elite_backend') + '`');
    await connection.query('USE `' + (process.env.DB_NAME || 'elite_backend') + '`');

    console.log('Using database ' + (process.env.DB_NAME || 'elite_backend'));

    const tables = [
        'CREATE TABLE IF NOT EXISTS employees (id INT AUTO_INCREMENT PRIMARY KEY, fullName VARCHAR(255), gender VARCHAR(50), mobile VARCHAR(20), password VARCHAR(255), department VARCHAR(100), address TEXT, email VARCHAR(255) UNIQUE, dob DATE, salary DECIMAL(10, 2), uploadImg VARCHAR(255), joining_date DATE, role VARCHAR(50), panCard VARCHAR(50), aadharCard VARCHAR(50), total_leave INT DEFAULT 12, leave_balance DECIMAL(10, 2) DEFAULT 12.00, status TINYINT DEFAULT 1, termination_date DATE, employment_type TINYINT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS attendance (id INT AUTO_INCREMENT PRIMARY KEY, employee_id INT, date DATE, status VARCHAR(50), check_in DATETIME, check_out DATETIME, hours VARCHAR(50), break VARCHAR(50), is_paused TINYINT DEFAULT 0, elapsed_time INT DEFAULT 0, pause_start DATETIME, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY unique_employee_date (employee_id, date))',
        'CREATE TABLE IF NOT EXISTS projects (id INT AUTO_INCREMENT PRIMARY KEY, projectNO VARCHAR(50), projectTitle VARCHAR(255), department VARCHAR(100), priority VARCHAR(50), client INT, startDate DATETIME, endDate DATETIME, team TEXT, status VARCHAR(50), description TEXT, tags TEXT, progress INT DEFAULT 0)',
        'CREATE TABLE IF NOT EXISTS clients (id INT AUTO_INCREMENT PRIMARY KEY, fullName VARCHAR(255), mobile VARCHAR(20), email VARCHAR(255), linkedin_id VARCHAR(255), website_link VARCHAR(255), client_note TEXT, country VARCHAR(100), address TEXT, client_type VARCHAR(50), client_Connect_Type VARCHAR(50), bde_account_id VARCHAR(100), bde_account_email VARCHAR(255), date DATE, platform VARCHAR(100), technology VARCHAR(100), prize_tag VARCHAR(50), prize_amount DECIMAL(10, 2), employee_id INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS client_followups (id INT AUTO_INCREMENT PRIMARY KEY, client_id INT, bde_id INT, followup_date DATETIME, notes TEXT, status VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS holidays (id INT AUTO_INCREMENT PRIMARY KEY, hName VARCHAR(255), date DATE, details TEXT)',
        'CREATE TABLE IF NOT EXISTS leave_requests (id INT AUTO_INCREMENT PRIMARY KEY, employee_id INT, leave_type VARCHAR(50), start_date DATETIME, end_date DATETIME, reason TEXT, no_of_days DECIMAL(5, 2), status VARCHAR(50), halfDay TINYINT DEFAULT 0, sandwich_confirm TINYINT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS tasks (id INT AUTO_INCREMENT PRIMARY KEY, employee_id INT, project_id INT, trainer_project_name VARCHAR(255), employee_type VARCHAR(50), title VARCHAR(255), done TINYINT DEFAULT 0, note TEXT, priority VARCHAR(50), due_date DATE, create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS daily_updates (id INT AUTO_INCREMENT PRIMARY KEY, employee_id INT, project_id INT, task_id INT, update_date DATE, update_details TEXT, status VARCHAR(50), trainer_project_name VARCHAR(255))',
        'CREATE TABLE IF NOT EXISTS jobs (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255), department VARCHAR(100), jobType VARCHAR(50), vacancies INT, closedVacancies INT DEFAULT 0, status VARCHAR(50), description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS candidates (id INT AUTO_INCREMENT PRIMARY KEY, full_name VARCHAR(255), mobile VARCHAR(20), email VARCHAR(255), linkedin VARCHAR(255), address TEXT, gender VARCHAR(50), experience VARCHAR(100), last_company VARCHAR(255), last_ctc VARCHAR(100), resume VARCHAR(255), job_id INT, status VARCHAR(50), previous_status VARCHAR(50), remarks TEXT)',
        'CREATE TABLE IF NOT EXISTS interviews (id INT AUTO_INCREMENT PRIMARY KEY, candidate_id INT, job_id INT, interview_date DATE, interview_time TIME, interview_type VARCHAR(50), mode VARCHAR(50), location VARCHAR(255), status VARCHAR(50), remarks TEXT, employee_id INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS salary_slips (id INT AUTO_INCREMENT PRIMARY KEY, employee_id INT, month INT, year INT, base_salary DECIMAL(10, 2), unpaid_leave_days DECIMAL(5, 2), final_salary DECIMAL(10, 2), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS salary_payslip (id INT AUTO_INCREMENT PRIMARY KEY, employee_id INT, month INT, year INT, working_days DECIMAL(5, 2), paid_leave_days DECIMAL(5, 2), unpaid_leave_days DECIMAL(5, 2), net_salary DECIMAL(10, 2), addon_amount DECIMAL(10, 2) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS bde_targets (id INT AUTO_INCREMENT PRIMARY KEY, bde_id INT, target_amount DECIMAL(10, 2), target_month DATE, achieved_amount DECIMAL(10, 2) DEFAULT 0.00)',
        'CREATE TABLE IF NOT EXISTS emails (id INT AUTO_INCREMENT PRIMARY KEY, subject VARCHAR(255), body TEXT, sender_user_type VARCHAR(50), sender_user_id INT, recipient_user_type VARCHAR(50), recipient_user_id INT, folder VARCHAR(50), labels TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS payments (id INT AUTO_INCREMENT PRIMARY KEY, bill_no VARCHAR(100), client_id INT, employee_id INT, payment_date DATE, discount DECIMAL(10, 2), total_amount DECIMAL(10, 2), payment_method VARCHAR(50), payment_status VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS announcements (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255), text TEXT NOT NULL, image_path VARCHAR(255), created_by INT, is_active TINYINT DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS kpi_master (kpi_id INT AUTO_INCREMENT PRIMARY KEY, kpi_name VARCHAR(255) NOT NULL, kpi_description TEXT, unit VARCHAR(50), kpi_type ENUM(\'calls\',\'meetings\',\'conversions_count\',\'conversions_revenue\') NOT NULL, is_active TINYINT DEFAULT 1, created_by INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS kpi_targets (target_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, kpi_id INT NOT NULL, target_value DECIMAL(12,2) NOT NULL, month TINYINT NOT NULL, year SMALLINT NOT NULL, weightage DECIMAL(5,2), created_by INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS bde_calls (call_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, lead_id INT, customer_name VARCHAR(255) NOT NULL, phone_number VARCHAR(20), call_date DATE NOT NULL, call_duration VARCHAR(20), call_status ENUM(\'connected\',\'no_answer\',\'busy\') NOT NULL, call_outcome ENUM(\'interested\',\'not_interested\',\'follow_up\'), call_notes TEXT, next_action_date DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS bde_meetings (meeting_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, lead_id INT, client_name VARCHAR(255) NOT NULL, meeting_date DATE NOT NULL, meeting_time TIME, meeting_mode ENUM(\'online\',\'offline\') DEFAULT \'offline\', meeting_status ENUM(\'scheduled\',\'completed\',\'no_show\',\'cancelled\') NOT NULL, meeting_outcome ENUM(\'positive\',\'negative\',\'follow-up\'), meeting_notes TEXT, next_meeting_date DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS bde_conversions (conversion_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, lead_id INT, client_name VARCHAR(255) NOT NULL, deal_value DECIMAL(12,2) DEFAULT 0, product_service VARCHAR(255), conversion_status ENUM(\'won\',\'lost\') NOT NULL, conversion_date DATE NOT NULL, closing_notes TEXT, lost_reason TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS kpi_snapshots (snapshot_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, kpi_id INT NOT NULL, month TINYINT NOT NULL, year SMALLINT NOT NULL, target_value DECIMAL(12,2), achieved_value DECIMAL(12,2), achievement_percentage DECIMAL(5,2), status ENUM(\'green\',\'yellow\',\'red\') DEFAULT \'red\', updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY unique_snapshot (user_id, kpi_id, month, year))'
    ];

    for (const sql of tables) {
        await connection.query(sql);
    }

    console.log('All tables created successfully');

    const bcrypt = require('bcrypt');
    const adminPassword = await bcrypt.hash('admin123', 10);
    try {
        await connection.query('INSERT INTO employees (fullName, email, password, role, status) VALUES (?, ?, ?, ?, ?)', 
        ['Admin User', 'admin@example.com', adminPassword, 'Admin', 1]);
        console.log('Default admin user created:  / admin123');
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            console.log('Admin user already exists');
        } else {
            console.error('Error creating admin user:', e);
        }
    }

    await connection.end();
}

setup().catch(console.error);
