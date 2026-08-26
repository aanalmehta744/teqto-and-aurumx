const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const db = require('../connection');


// =========================================================
// SCHEMA AUTO-MIGRATION
// =========================================================
// Follows the project's existing runtime-migration pattern
// (INFORMATION_SCHEMA check + ALTER / CREATE IF NOT EXISTS), so
// new columns / tables are added automatically without manual SQL.

async function ensureColumn(table, column, definition) {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`,
      [table, column]
    );

    if (rows[0].cnt === 0) {
      await db.query(
        `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`
      );
    }
  } catch (err) {
    console.error(`ensureColumn ${table}.${column} failed:`, err.message);
  }
}

(async () => {

  // New candidate / pipeline columns on the interviews table.
  await ensureColumn('interviews', 'profile', 'VARCHAR(150)');
  await ensureColumn('interviews', 'candidate_email', 'VARCHAR(255)');
  await ensureColumn('interviews', 'hr_call_details', 'TEXT');
  await ensureColumn('interviews', 'hr_call_status', "VARCHAR(50) DEFAULT 'pending'");
  await ensureColumn('interviews', 'final_call_notes', 'TEXT');
  await ensureColumn('interviews', 'final_call_status', "VARCHAR(50) DEFAULT 'pending'");
  await ensureColumn('interviews', 'joined_status', "VARCHAR(50) DEFAULT 'pending'");
  await ensureColumn('interviews', 'joining_note', 'TEXT');

  // Rounds table: technical rounds assigned to senior developers.
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS interview_rounds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        interview_id INT NOT NULL,
        round_type VARCHAR(50) NOT NULL DEFAULT 'technical',
        assigned_to_id INT,
        assigned_to_name VARCHAR(255),
        scheduled_date DATE,
        notes TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_round_interview (interview_id),
        INDEX idx_round_assignee (assigned_to_id)
      )
    `);
  } catch (err) {
    console.error('CREATE interview_rounds failed:', err.message);
  }

})();


// =========================================================
// AUTH: decode the Bearer token into req.user
// =========================================================
// The login token payload carries { id, email, role, department }.
router.use((req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ')
      ? header.slice(7)
      : null;

    if (token) {
      req.user = jwt.verify(
        token,
        process.env.JWT_SECRET || 'defaultSecret'
      );
    }
  } catch (err) {
    // Invalid/expired token -> leave req.user unset;
    // the access-check middlewares will return 403.
  }

  next();
});


// =========================================================
// HELPERS
// =========================================================

function getUserFromRequest(req) {
  return req.user || null;
}

function getUserId(req) {
  const user = getUserFromRequest(req);
  return user?.id ?? null;
}

function getRole(req) {
  const user = getUserFromRequest(req);
  return String(user?.role || '').trim().toLowerCase();
}

function getDepartment(req) {
  const user = getUserFromRequest(req);
  return String(user?.department || '').trim().toLowerCase();
}

// Normalise any incoming date (e.g. an ISO datetime like
// "2026-08-26T18:30:00.000Z") down to a plain YYYY-MM-DD string
// so MySQL DATE columns accept it. Returns null for empty/invalid.
function toDateOnly(value) {
  if (!value) {
    return null;
  }
  const s = String(value).trim();
  const m = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (m) {
    return m[0];
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}


// =========================================================
// AUTHORIZATION
// =========================================================

function isAdmin(req) {
  return getRole(req) === 'admin';
}

function isHR(req) {
  return getRole(req) === 'employee' && getDepartment(req) === 'hr';
}

// Admin (view all) + HR (view + manage). Everyone else uses
// the "assigned to me" endpoint instead of the full list.
function canViewInterviews(req) {
  return isAdmin(req) || isHR(req);
}

// Only HR creates/edits/deletes interviews and assigns rounds.
function canManageInterviews(req) {
  return isHR(req);
}

// Final (CEO) decision may be set by Admin and edited by HR.
function canSetFinalDecision(req) {
  return isAdmin(req) || isHR(req);
}


function requireInterviewViewAccess(req, res, next) {
  if (!canViewInterviews(req)) {
    return res.status(403).json({
      message: 'You do not have permission to access interviews.'
    });
  }
  next();
}

function requireInterviewManageAccess(req, res, next) {
  if (!canManageInterviews(req)) {
    return res.status(403).json({
      message: 'Only HR can add, update, or delete interviews.'
    });
  }
  next();
}

function requireLoggedIn(req, res, next) {
  if (!getUserId(req)) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  next();
}


// =========================================================
// HELPER: attach rounds to a set of interviews
// =========================================================

async function attachRounds(interviews) {
  if (!interviews.length) {
    return interviews;
  }

  const ids = interviews.map(i => i.id);
  const placeholders = ids.map(() => '?').join(',');

  const [rounds] = await db.query(
    `SELECT id, interview_id, round_type, assigned_to_id, assigned_to_name,
            scheduled_date, notes, status, created_at, updated_at
     FROM interview_rounds
     WHERE interview_id IN (${placeholders})
     ORDER BY id ASC`,
    ids
  );

  const byInterview = {};
  for (const r of rounds) {
    (byInterview[r.interview_id] = byInterview[r.interview_id] || []).push(r);
  }

  for (const interview of interviews) {
    interview.rounds = byInterview[interview.id] || [];
  }

  return interviews;
}


const INTERVIEW_COLUMNS = `
  id, hr_name, candidate_name, candidate_number, candidate_email,
  profile, linkedin_link, resume, interview_date,
  hr_call_details, hr_call_status,
  final_call_notes, final_call_status,
  joined_status, joining_note,
  status, created_at, updated_at
`;


// =========================================================
// GET INTERVIEWS ASSIGNED TO ME (senior developer card)
// =========================================================
// Any logged-in employee sees only the rounds assigned to them,
// with just the candidate name, profile and date.
// NOTE: declared before '/:id' so it is not shadowed by it.

router.get('/assigned/mine', requireLoggedIn, async (req, res) => {
  try {
    const userId = getUserId(req);

    const [rows] = await db.query(
      `SELECT
         r.id            AS round_id,
         r.round_type,
         r.scheduled_date,
         r.status,
         r.notes,
         i.id            AS interview_id,
         i.candidate_name,
         i.profile
       FROM interview_rounds r
       INNER JOIN interviews i ON i.id = r.interview_id
       WHERE r.assigned_to_id = ?
       ORDER BY r.scheduled_date ASC, r.id ASC`,
      [userId]
    );

    return res.status(200).json(rows);

  } catch (error) {
    console.error('GET ASSIGNED ROUNDS ERROR:', error);
    return res.status(500).json({
      message: 'Server error while fetching assigned interviews.'
    });
  }
});


// =========================================================
// GET SENIOR DEVELOPERS (assignee dropdown for HR)
// =========================================================

router.get('/meta/senior-developers', requireInterviewViewAccess, async (req, res) => {
  try {
    // Second round can be assigned to Senior developers OR Admins.
    const [rows] = await db.query(
      `SELECT id, fullName, department, employee_level, role
       FROM employees
       WHERE (status IS NULL OR status = 1)
         AND (
           LOWER(TRIM(role)) = 'admin'
           OR (LOWER(TRIM(role)) = 'employee' AND LOWER(TRIM(employee_level)) = 'senior')
         )
       ORDER BY fullName ASC`
    );

    return res.status(200).json(rows);

  } catch (error) {
    console.error('GET SENIOR DEVELOPERS ERROR:', error);
    return res.status(500).json({
      message: 'Server error while fetching senior developers.'
    });
  }
});


// =========================================================
// GET ALL INTERVIEWS (ADMIN + HR)
// =========================================================

router.get('/', requireInterviewViewAccess, async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT ${INTERVIEW_COLUMNS}
       FROM interviews
       ORDER BY interview_date DESC, id DESC`
    );

    await attachRounds(results);

    return res.status(200).json(results);

  } catch (error) {
    console.error('GET INTERVIEWS ERROR:', error);
    return res.status(500).json({
      message: 'Server error while fetching interviews.'
    });
  }
});


// =========================================================
// GET SINGLE INTERVIEW (ADMIN + HR)
// =========================================================

router.get('/:id', requireInterviewViewAccess, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Invalid interview ID.' });
    }

    const [results] = await db.query(
      `SELECT ${INTERVIEW_COLUMNS}
       FROM interviews
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: 'Interview not found.' });
    }

    await attachRounds(results);

    return res.status(200).json(results[0]);

  } catch (error) {
    console.error('GET SINGLE INTERVIEW ERROR:', error);
    return res.status(500).json({
      message: 'Server error while fetching interview.'
    });
  }
});


// =========================================================
// CREATE INTERVIEW (HR ONLY)
// =========================================================

router.post(
  '/',
  requireInterviewManageAccess,
  async (req, res) => {

    const {
      hr_name,
      candidate_name,
      candidate_number,
      candidate_email,
      profile,
      linkedin_link,
      resume,
      interview_date,
      hr_call_details,
      hr_call_status,
      final_call_notes,
      final_call_status,
      joined_status,
      joining_note,
      status
    } = req.body;

    try {

      if (!hr_name || !candidate_name || !candidate_number || !interview_date) {
        return res.status(400).json({
          message:
            'HR name, candidate name, candidate number and interview date are required.'
        });
      }

      const interviewStatus =
        String(status || 'upcoming').trim().toLowerCase();

      if (!['upcoming', 'complete'].includes(interviewStatus)) {
        return res.status(400).json({
          message: 'Status must be upcoming or complete.'
        });
      }

      const trim = (v) => (v !== undefined && v !== null && String(v).trim() !== '')
        ? String(v).trim()
        : null;

      const [result] = await db.query(
        `INSERT INTO interviews
          (hr_name, candidate_name, candidate_number, candidate_email, profile,
           linkedin_link, resume, interview_date,
           hr_call_details, hr_call_status,
           final_call_notes, final_call_status,
           joined_status, joining_note, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(hr_name).trim(),
          String(candidate_name).trim(),
          String(candidate_number).trim(),
          trim(candidate_email),
          trim(profile),
          trim(linkedin_link),
          trim(resume),
          interview_date,
          trim(hr_call_details),
          trim(hr_call_status) || 'pending',
          trim(final_call_notes),
          trim(final_call_status) || 'pending',
          trim(joined_status) || 'pending',
          trim(joining_note),
          interviewStatus
        ]
      );

      return res.status(201).json({
        message: 'Interview created successfully.',
        id: result.insertId
      });

    } catch (error) {
      console.error('CREATE INTERVIEW ERROR:', error);
      return res.status(500).json({
        message: 'Server error while creating interview.'
      });
    }
  }
);


// =========================================================
// UPDATE INTERVIEW (HR ONLY)
// =========================================================

router.put(
  '/:id',
  requireInterviewManageAccess,
  async (req, res) => {

    const body = req.body;

    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({ message: 'Invalid interview ID.' });
      }

      const [existing] = await db.query(
        `SELECT * FROM interviews WHERE id = ? LIMIT 1`,
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({ message: 'Interview not found.' });
      }

      const old = existing[0];

      // Keep old value when a field was not sent; normalise "" -> null.
      const pick = (key, fallback) => {
        if (body[key] === undefined) {
          return fallback;
        }
        const v = String(body[key]).trim();
        return v === '' ? null : v;
      };

      const finalStatus =
        (body.status !== undefined
          ? String(body.status).trim().toLowerCase()
          : old.status);

      if (!['upcoming', 'complete'].includes(finalStatus)) {
        return res.status(400).json({
          message: 'Status must be upcoming or complete.'
        });
      }

      await db.query(
        `UPDATE interviews SET
           hr_name = ?, candidate_name = ?, candidate_number = ?,
           candidate_email = ?, profile = ?, linkedin_link = ?, resume = ?,
           interview_date = ?,
           hr_call_details = ?, hr_call_status = ?,
           final_call_notes = ?, final_call_status = ?,
           joined_status = ?, joining_note = ?, status = ?
         WHERE id = ?`,
        [
          pick('hr_name', old.hr_name),
          pick('candidate_name', old.candidate_name),
          pick('candidate_number', old.candidate_number),
          pick('candidate_email', old.candidate_email),
          pick('profile', old.profile),
          pick('linkedin_link', old.linkedin_link),
          pick('resume', old.resume),
          body.interview_date !== undefined ? body.interview_date : old.interview_date,
          pick('hr_call_details', old.hr_call_details),
          pick('hr_call_status', old.hr_call_status),
          pick('final_call_notes', old.final_call_notes),
          pick('final_call_status', old.final_call_status),
          pick('joined_status', old.joined_status),
          pick('joining_note', old.joining_note),
          finalStatus,
          id
        ]
      );

      return res.status(200).json({
        message: 'Interview updated successfully.'
      });

    } catch (error) {
      console.error('UPDATE INTERVIEW ERROR:', error);
      return res.status(500).json({
        message: 'Server error while updating interview.'
      });
    }
  }
);


// =========================================================
// SET FINAL (CEO) DECISION — ADMIN + HR
// =========================================================

router.put('/:id/final-decision', async (req, res) => {
  try {
    if (!canSetFinalDecision(req)) {
      return res.status(403).json({
        message: 'Only Admin or HR can set the final decision.'
      });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Invalid interview ID.' });
    }

    const { final_call_status, final_call_notes } = req.body;

    const valid = ['pending', 'select', 'hold', 'reject'];
    const status = String(final_call_status || 'pending').trim().toLowerCase();

    if (!valid.includes(status)) {
      return res.status(400).json({
        message: 'Final status must be select, hold, reject or pending.'
      });
    }

    const [existing] = await db.query(
      `SELECT id FROM interviews WHERE id = ? LIMIT 1`,
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Interview not found.' });
    }

    await db.query(
      `UPDATE interviews
       SET final_call_status = ?, final_call_notes = ?
       WHERE id = ?`,
      [
        status,
        final_call_notes !== undefined ? String(final_call_notes).trim() || null : null,
        id
      ]
    );

    return res.status(200).json({ message: 'Final decision saved.' });

  } catch (error) {
    console.error('SET FINAL DECISION ERROR:', error);
    return res.status(500).json({
      message: 'Server error while saving final decision.'
    });
  }
});


// =========================================================
// DELETE INTERVIEW (HR ONLY)
// =========================================================

router.delete('/:id', requireInterviewManageAccess, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Invalid interview ID.' });
    }

    const [existing] = await db.query(
      `SELECT id FROM interviews WHERE id = ? LIMIT 1`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Interview not found.' });
    }

    await db.query(`DELETE FROM interview_rounds WHERE interview_id = ?`, [id]);
    await db.query(`DELETE FROM interviews WHERE id = ?`, [id]);

    return res.status(200).json({
      message: 'Interview deleted successfully.'
    });

  } catch (error) {
    console.error('DELETE INTERVIEW ERROR:', error);
    return res.status(500).json({
      message: 'Server error while deleting interview.'
    });
  }
});


// =========================================================
// ASSIGN A ROUND (HR ONLY)
// =========================================================

router.post('/:id/rounds', requireInterviewManageAccess, async (req, res) => {
  try {
    const interviewId = Number(req.params.id);
    if (!Number.isInteger(interviewId)) {
      return res.status(400).json({ message: 'Invalid interview ID.' });
    }

    const {
      round_type,
      assigned_to_id,
      assigned_to_name,
      scheduled_date,
      notes,
      status
    } = req.body;

    const [existing] = await db.query(
      `SELECT id FROM interviews WHERE id = ? LIMIT 1`,
      [interviewId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Interview not found.' });
    }

    if (!assigned_to_id) {
      return res.status(400).json({
        message: 'Please select a senior developer to assign.'
      });
    }

    const [result] = await db.query(
      `INSERT INTO interview_rounds
        (interview_id, round_type, assigned_to_id, assigned_to_name,
         scheduled_date, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        interviewId,
        String(round_type || 'technical').trim().toLowerCase(),
        Number(assigned_to_id),
        assigned_to_name ? String(assigned_to_name).trim() : null,
        toDateOnly(scheduled_date),
        notes ? String(notes).trim() : null,
        String(status || 'pending').trim().toLowerCase()
      ]
    );

    return res.status(201).json({
      message: 'Round assigned successfully.',
      id: result.insertId
    });

  } catch (error) {
    console.error('ASSIGN ROUND ERROR:', error);
    return res.status(500).json({
      message: 'Server error while assigning round.'
    });
  }
});


// =========================================================
// UPDATE A ROUND — HR, Admin, or the assigned senior developer
// =========================================================

router.put('/rounds/:roundId', async (req, res) => {
  try {
    const roundId = Number(req.params.roundId);
    if (!Number.isInteger(roundId)) {
      return res.status(400).json({ message: 'Invalid round ID.' });
    }

    const [rows] = await db.query(
      `SELECT * FROM interview_rounds WHERE id = ? LIMIT 1`,
      [roundId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Round not found.' });
    }

    const round = rows[0];

    const allowed =
      canManageInterviews(req) ||
      isAdmin(req) ||
      Number(getUserId(req)) === Number(round.assigned_to_id);

    if (!allowed) {
      return res.status(403).json({
        message: 'You cannot update this round.'
      });
    }

    const {
      assigned_to_id,
      assigned_to_name,
      scheduled_date,
      notes,
      status
    } = req.body;

    // Only HR may reassign the developer.
    const canReassign = canManageInterviews(req);

    await db.query(
      `UPDATE interview_rounds SET
         assigned_to_id = ?, assigned_to_name = ?,
         scheduled_date = ?, notes = ?, status = ?
       WHERE id = ?`,
      [
        canReassign && assigned_to_id !== undefined
          ? Number(assigned_to_id)
          : round.assigned_to_id,
        canReassign && assigned_to_name !== undefined
          ? String(assigned_to_name).trim()
          : round.assigned_to_name,
        scheduled_date !== undefined ? toDateOnly(scheduled_date) : round.scheduled_date,
        notes !== undefined ? (String(notes).trim() || null) : round.notes,
        status !== undefined
          ? String(status).trim().toLowerCase()
          : round.status,
        roundId
      ]
    );

    return res.status(200).json({ message: 'Round updated successfully.' });

  } catch (error) {
    console.error('UPDATE ROUND ERROR:', error);
    return res.status(500).json({
      message: 'Server error while updating round.'
    });
  }
});


// =========================================================
// DELETE A ROUND (HR ONLY)
// =========================================================

router.delete('/rounds/:roundId', requireInterviewManageAccess, async (req, res) => {
  try {
    const roundId = Number(req.params.roundId);
    if (!Number.isInteger(roundId)) {
      return res.status(400).json({ message: 'Invalid round ID.' });
    }

    await db.query(`DELETE FROM interview_rounds WHERE id = ?`, [roundId]);

    return res.status(200).json({ message: 'Round removed successfully.' });

  } catch (error) {
    console.error('DELETE ROUND ERROR:', error);
    return res.status(500).json({
      message: 'Server error while removing round.'
    });
  }
});


module.exports = router;
