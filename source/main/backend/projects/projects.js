const express = require('express');
const path = require('path');
const db = require('../connection'); // Adjust the path as necessary
const { resourceLimits } = require('worker_threads');

const router = express.Router();



// Fetch logged employee assign projects
router.get('/myproject/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log(userId);
    const sqlQuery = `
            SELECT p.*, 
                   c.fullName AS clientName,
                   GROUP_CONCAT(e.fullName ORDER BY e.fullName ASC) AS teamName
            FROM projects p
            LEFT JOIN clients c ON p.client = c.id
            LEFT JOIN employees e ON FIND_IN_SET(e.id, p.team) > 0
            WHERE FIND_IN_SET(?, p.team) > 0
            GROUP BY p.id, c.fullName;
        `;

    const [results] = await db.query(sqlQuery, [userId]);
    res.status(200).json(results);
  } catch (err) {
    console.error('Database query failed:', err);
    res.status(500).json({ message: 'Error fetching projects', error: err });
  }
});

// API route to add a new project
router.post('/', async (req, res) => {
  try {
    const { projectTitle, department, priority, client, startDate, endDate, team, status, description, tags } = req.body;

    if (!projectTitle || !department || !priority || !startDate || !endDate || !status) {
      return res.status(400).json({ message: 'All required fields must be filled out' });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (isNaN(startDateObj) || isNaN(endDateObj)) {
      return res.status(400).json({ message: 'Invalid date format.' });
    }

    const formattedStartDate = startDateObj.toISOString().slice(0, 19).replace('T', ' ');
    const formattedEndDate = endDateObj.toISOString().slice(0, 19).replace('T', ' ');

    // Store team as comma-separated IDs so FIND_IN_SET works correctly
    const teamString = Array.isArray(team) ? team.join(',') : (team || '');
    const tagsString = Array.isArray(tags) ? tags.join(',') : (tags || '');
    const descriptionStr = typeof description === 'string' ? description : JSON.stringify(description || '');

    const sqlQuery = `INSERT INTO projects (projectTitle, department, priority, client, startDate, endDate, team, status, description, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const [result] = await db.query(sqlQuery, [
      projectTitle, department, priority, client || null,
      formattedStartDate, formattedEndDate, teamString, status, descriptionStr, tagsString
    ]);

    res.status(201).json({ message: 'Project added successfully', projectId: result.insertId });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Update a project
// router.put('/:id', async (req, res) => {
//   try {
//     const projectId = req.params.id;
//     const { projectNO, projectTitle, department, priority, client,  startDate, endDate, team, status, description } = req.body;
//     console.log(req.body);
//     const start_date = new Date(startDate).toISOString().slice(0, 19).replace('T', ' ');
//     const end_date = new Date(endDate).toISOString().slice(0, 19).replace('T', ' ');

//     if (!projectTitle || !department || !priority || !client  || !startDate || !endDate || !status) {
//       return res.status(400).json({ message: 'All required fields must be filled out' });
//     }

//     // Convert team array to JSON string
//     const teamString = Array.isArray(team) ? team.join(', ') : team;

//     let sqlQuery = `UPDATE projects SET projectNO = ?, projectTitle = ?, department = ?, priority = ?, client = ?, startDate = ?, endDate = ?, team = ?, status = ?, description = ? WHERE id = ?`;

//     const queryParams = [projectNO, projectTitle, department, priority, client, start_date, end_date, teamString, status, description, projectId];

//     const [result] = await db.query(sqlQuery, queryParams);
//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: 'Project not found' });
//     }
//     res.status(200).json({ message: 'Project updated successfully' });
//   } catch (error) {
//     console.error('Error processing request:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });


router.put('/:id', async (req, res) => {
  try {
    const projectId = req.params.id;

    const {
      projectNO,
      projectTitle,
      department,
      priority,
      client,
      startDate,
      endDate,
      team,
      status,
      description
    } = req.body;

    if (!projectTitle || !department || !priority || !client || !startDate || !endDate || !status) {
      return res.status(400).json({ message: 'All required fields must be filled out' });
    }

    // ✅ FORCE SAFE MYSQL FORMAT
    const formatDate = (date) => {
      const d = new Date(date);
      return d.toISOString().slice(0, 19).replace('T', ' ');
    };

    const start_date = formatDate(startDate);
    const end_date = formatDate(endDate);

    const teamString = Array.isArray(team)
      ? team.join(',')
      : (team || '');

    const sql = `
      UPDATE projects 
      SET 
        projectNO = ?,
        projectTitle = ?,
        department = ?,
        priority = ?,
        client = ?,
        startDate = ?,
        endDate = ?,
        team = ?,
        status = ?,
        description = ?
      WHERE id = ?
    `;

    const values = [
      projectNO || null,
      projectTitle,
      department,
      priority,
      client,
      start_date,   // ✅ ONLY THIS
      end_date,     // ✅ ONLY THIS
      teamString,
      status,
      description || '',
      projectId
    ];

    const [result] = await db.query(sql, values);

    res.json({ message: 'Project updated successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});
// Fetch all projects
router.get('/', async (req, res) => {
  try {
    const sqlQuery = `
           SELECT p.*, 
       c.fullName AS clientName,
       GROUP_CONCAT(e.fullName ORDER BY e.fullName ASC) AS teamName
FROM projects p
LEFT JOIN clients c ON p.client = c.id
LEFT JOIN employees e ON FIND_IN_SET(e.id, p.team) > 0
GROUP BY p.id, c.fullName;

        `;
    const [results] = await db.query(sqlQuery);
    res.status(200).json(results);
  } catch (err) {
    console.error('Database query failed:', err);
    res.status(500).json({ message: 'Error fetching projects', error: err });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const sqlQuery = `
       SELECT 
  p.*, 
  c.id AS client_id,
  c.employee_id AS client_employee_id,
  c.fullName AS client_fullName,
  c.mobile AS client_mobile,
  c.email AS client_email,
  c.linkedin_id AS client_linkedin_id,
  c.country AS client_country,
  c.address AS client_address,
  c.client_type AS client_type,
  c.date AS client_date,
  c.platform AS client_platform,
  c.technology AS client_technology,
  c.prize_tag AS client_prize_tag,
  c.prize_amount AS client_prize_amount,
  c.created_at AS client_created_at,
  GROUP_CONCAT(e.fullName ORDER BY e.fullName ASC) AS teamName
FROM projects p
LEFT JOIN clients c ON p.client = c.id
LEFT JOIN employees e ON FIND_IN_SET(e.id, p.team) > 0
WHERE p.id = ?
GROUP BY p.id, c.id;

      `;

    const [results] = await db.query(sqlQuery, [req.params.id]);

    if (results.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.status(200).json(results[0]); // return a single project
  } catch (err) {
    console.error('Database query failed:', err);
    res.status(500).json({ message: 'Error fetching project', error: err });
  }
});

// Delete a project
router.delete('/:id', async (req, res) => {
  try {
    console.log(req.params.id);
    const projectId = req.params.id;
    const sqlQuery = 'DELETE FROM projects WHERE id = ?';
    const [result] = await db.query(sqlQuery, [projectId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error('Database query failed:', err);
    res.status(500).json({ message: 'Error deleting project', error: err });
  }
});

// Fetch a specific project
router.get('/getprojects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const sqlQuery = 'SELECT * FROM projects WHERE id = ?';
    const [results] = await db.query(sqlQuery, [projectId]);

    if (results.length === 0) {
      return res.status(404).json({ message: 'No project found' });
    }

    res.status(200).json(results);
  } catch (err) {
    console.error('Database query failed:', err);
    res.status(500).json({ message: 'Error fetching project', error: err });
  }
});

// GET /api/projects/my-team/:userId
router.get('/my-team/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Fetch all projects where this user is in the team
    const [projects] = await db.query(
      `SELECT id, projectTitle, team FROM projects WHERE FIND_IN_SET(?, team)`,
      [userId]
    );

    const results = await Promise.all(projects.map(async (project) => {
      const teamIds = project.team ? project.team.split(',') : [];

      if (teamIds.length === 0) {
        return { ...project, team: [] };
      }

      const [teamMembers] = await db.query(
        `SELECT id, fullName, email, mobile, department,gender,address,dob FROM employees WHERE id IN (?)`,
        [teamIds]
      );

      return {
        ...project,
        team: teamMembers
      };
    }));

    res.json(results);
  } catch (error) {
    console.error('Error fetching my team:', error);
    res.status(500).json({ error: 'Failed to fetch my team data' });
  }
});
// ✅ GET projects + team for a logged-in BDE
router.get("/teambybde/:bdeId", async (req, res) => {
  const { bdeId } = req.params;

  try {
    // Step 1: Fetch projects belonging to clients owned by this BDE
    const [projects] = await db.query(
      `SELECT c.*, p.id AS projectId, p.projectTitle, p.client, p.team
       FROM projects p
       JOIN clients c ON p.client = c.id
       WHERE c.employee_id = ?`,
      [bdeId]
    );
    if (!projects.length) {
      return res.json([]);
    }

    // Step 2: Expand team into employee details
    const finalProjects = await Promise.all(
      projects.map(async (project) => {
        let teamIds = [];

        // Try parsing JSON, else treat as CSV
        try {
          teamIds = JSON.parse(project.team);
        } catch {
          teamIds = project.team ? project.team.split(",") : [];
        }

        if (teamIds.length === 0) {
          return { ...project, team: [] };
        }

        const [teamMembers] = await db.query(
          `SELECT id, fullName, role, gender, department, dob, address, mobile, email
           FROM employees
           WHERE id IN (?)`,
          [teamIds]
        );

        return {
          ...project,
          projectId: Number(project.projectId),
          client: Number(project.client),
          team: teamMembers
        };
      })
    );

    res.json(finalProjects);
  } catch (error) {
    console.error("Error fetching BDE projects/team:", error);
    res.status(500).json({ error: "Failed to fetch BDE team data" });
  }
});

// GET /api/projects/team-details
router.get('/team-details', async (req, res) => {
  try {
    // Get all projects with team field
    const [projects] = await db.query(
      `SELECT id, projectTitle, team FROM projects`
    );

    const results = await Promise.all(projects.map(async (project) => {
      const teamIds = project.team ? project.team.split(',') : [];

      if (teamIds.length === 0) {
        return { ...project, teamMembers: [] };
      }

      const [teamMembers] = await db.query(
        `SELECT id, fullName, email, mobile, department, gender, address, dob 
         FROM employees 
         WHERE id IN (?)`,
        [teamIds]
      );

      return {
        projectId: project.id,
        projectTitle: project.projectTitle,
        teamMembers
      };
    }));

    res.json(results);
  } catch (error) {
    console.error('Error fetching project teams:', error);
    res.status(500).json({ error: 'Failed to fetch project team data' });
  }
});


module.exports = router;
