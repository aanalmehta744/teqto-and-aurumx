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


// GET: KPI target achievement breakdown per BDE (completed / partial / missed)
router.get('/bde-kpi-achievement', async (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const m = parseInt(month) || now.getMonth() + 1;
  const y = parseInt(year) || now.getFullYear();

  try {
    const [bdes] = await db.query(
      `SELECT id, fullName FROM employees WHERE role='BDE' AND status=1 ORDER BY fullName`
    );

    const results = await Promise.all(bdes.map(async (bde) => {
      // Get all KPI targets for this BDE for the month
      const [targets] = await db.query(
        `SELECT t.target_id, t.kpi_id, t.target_value, k.kpi_name, k.kpi_type
         FROM kpi_targets t
         LEFT JOIN kpi_master k ON k.kpi_id = t.kpi_id
         WHERE t.user_id = ? AND t.month = ? AND t.year = ?`,
        [bde.id, m, y]
      );

      let completed = 0, partial = 0, missed = 0, totalPct = 0;

      for (const t of targets) {
        let achieved = 0;
        if (t.kpi_type === 'calls') {
          const [[{ cnt }]] = await db.query(
            `SELECT COUNT(*) AS cnt FROM bde_calls WHERE user_id=? AND MONTH(call_date)=? AND YEAR(call_date)=?`,
            [bde.id, m, y]
          );
          achieved = cnt;
        } else if (t.kpi_type === 'meetings') {
          const [[{ cnt }]] = await db.query(
            `SELECT COUNT(*) AS cnt FROM bde_meetings WHERE user_id=? AND MONTH(meeting_date)=? AND YEAR(meeting_date)=?`,
            [bde.id, m, y]
          );
          achieved = cnt;
        } else if (t.kpi_type === 'conversions_count') {
          const [[{ cnt }]] = await db.query(
            `SELECT COUNT(*) AS cnt FROM bde_conversions WHERE user_id=? AND conversion_status='won' AND MONTH(conversion_date)=? AND YEAR(conversion_date)=?`,
            [bde.id, m, y]
          );
          achieved = cnt;
        } else if (t.kpi_type === 'conversions_revenue') {
          const [[{ total }]] = await db.query(
            `SELECT IFNULL(SUM(deal_value),0) AS total FROM bde_conversions WHERE user_id=? AND conversion_status='won' AND MONTH(conversion_date)=? AND YEAR(conversion_date)=?`,
            [bde.id, m, y]
          );
          achieved = total;
        }

        const pct = t.target_value > 0 ? Math.round((achieved / t.target_value) * 100) : 0;
        totalPct += pct;
        if (pct >= 100) completed++;
        else if (pct >= 70) partial++;
        else missed++;
      }

      const avgPct = targets.length > 0 ? Math.round(totalPct / targets.length) : 0;
      return {
        bde_id: bde.id,
        bde_name: bde.fullName,
        total_kpis: targets.length,
        completed,
        partial,
        missed,
        avg_achievement: avgPct,
      };
    }));

    // Sort by avg_achievement descending for leaderboard
    results.sort((a, b) => b.avg_achievement - a.avg_achievement);
    res.json(results);
  } catch (error) {
    console.error('Error fetching BDE KPI achievement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: BDE performance summary for admin dashboard graph (current month)
router.get('/bde-performance-summary', async (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const m = parseInt(month) || now.getMonth() + 1;
  const y = parseInt(year) || now.getFullYear();

  try {
    const [bdes] = await db.query(
      `SELECT id, fullName FROM employees WHERE role='BDE' AND status=1 ORDER BY fullName`
    );

    const results = await Promise.all(bdes.map(async (bde) => {
      const [[calls]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM bde_calls WHERE user_id=? AND MONTH(call_date)=? AND YEAR(call_date)=?`,
        [bde.id, m, y]
      );
      const [[meetings]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM bde_meetings WHERE user_id=? AND MONTH(meeting_date)=? AND YEAR(meeting_date)=?`,
        [bde.id, m, y]
      );
      const [[deals]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM bde_conversions WHERE user_id=? AND conversion_status='won' AND MONTH(conversion_date)=? AND YEAR(conversion_date)=?`,
        [bde.id, m, y]
      );
      const [[revenue]] = await db.query(
        `SELECT IFNULL(SUM(deal_value),0) AS total FROM bde_conversions WHERE user_id=? AND conversion_status='won' AND MONTH(conversion_date)=? AND YEAR(conversion_date)=?`,
        [bde.id, m, y]
      );
      return {
        bde_id: bde.id,
        bde_name: bde.fullName,
        calls: calls.cnt,
        meetings: meetings.cnt,
        deals_won: deals.cnt,
        revenue: revenue.total,
      };
    }));

    res.json(results);
  } catch (error) {
    console.error('Error fetching BDE performance summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
