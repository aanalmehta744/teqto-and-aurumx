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
const todayAttendancesRoutes = require('./attandance/today-attendances');
const payrollRoutes = require('./payroll/payroll');
const taskRoutes = require('./tasks/tasks');
const calendarRoutes = require('./calender/calender');
const candidateRoutes = require('./jobs/candidates');
const jobRoutes = require('./jobs/jobs'); // Import the job routes
const interviewRoutes = require('./jobs/interview'); // Import the job routes

const chatRoutes = require("./chat/chatRoutes");

const admindashboardRoutes = require('./dashboard/admindashboard');
const dailyUpdatesRoutes = require('./daily-updates/daily-updates');
const db = require('./connection');
const app = express();

// Migrate halfDay column from TINYINT to VARCHAR(50) so string values ('Full Day', 'Half Day') are stored correctly
(async () => {
    try {
        await db.query(`ALTER TABLE leave_requests MODIFY COLUMN halfDay VARCHAR(50) DEFAULT ''`);
        console.log('✅ halfDay column migrated to VARCHAR(50)');
    } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') {
            console.log('ℹ️  halfDay column already VARCHAR or migration not needed:', err.message);
        }
    }
})();

const server = http.createServer(app);


const port = 3000;


const io = new Server(server, {
  cors: {
    // origin: "http://localhost:34200",
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
app.use(cors());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

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