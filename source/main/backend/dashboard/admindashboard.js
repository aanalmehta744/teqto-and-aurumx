const express = require('express');
const router = express.Router();
const db = require('../connection');

// GET: Today's follow-ups grouped by BDE with client details
router.get('/today-followups', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        e.id AS bde_id,
        e.fullName AS bde_name,
        c.id AS client_id,
        c.fullName AS client_name,
        c.email,
        c.mobile,
        cf.status,
        cf.notes,
        cf.followup_date
      FROM client_followups cf
      JOIN employees e ON e.id = cf.bde_id
      JOIN clients c ON c.id = cf.client_id
      WHERE cf.followup_date = CURDATE()
      ORDER BY e.id, cf.id DESC
    `);

    // Group by BDE
    const grouped = {};
    rows.forEach(row => {
      if (!grouped[row.bde_id]) {
        grouped[row.bde_id] = {
          bde_id: row.bde_id,
          bde_name: row.bde_name,
          followup_count: 0,
          clients: []
        };
      }
      grouped[row.bde_id].clients.push({
        fullName: row.client_name,
        email: row.email,
        mobile: row.mobile,
        status: row.status,
        notes: row.notes,
        followup_date: row.followup_date
      });
      grouped[row.bde_id].followup_count += 1;
    });

    res.json(Object.values(grouped));
  } catch (error) {
    console.error('Error fetching grouped follow-ups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// GET /api/projects/all-teams
router.get('/all-teams', async (req, res) => {
  try {
    // Fetch all projects
    const [projects] = await db.query(`SELECT id, projectTitle, team FROM projects`);

    // For each project, fetch full employee info for the team members
    const results = await Promise.all(projects.map(async (project) => {
      const teamIds = project.team ? project.team.split(',') : [];

      if (teamIds.length === 0) {
        return { ...project, team: [] };
      }

      const [teamMembers] = await db.query(
        `SELECT id, fullName, email, mobile, department, gender, address, dob FROM employees WHERE id IN (?)`,
        [teamIds]
      );

      return {
        id: project.id,
        projectTitle: project.projectTitle,
        team: teamMembers
      };
    }));

    res.json(results);
  } catch (error) {
    console.error('Error fetching all project teams:', error);
    res.status(500).json({ error: 'Failed to fetch all project teams' });
  }
});


module.exports = router;
