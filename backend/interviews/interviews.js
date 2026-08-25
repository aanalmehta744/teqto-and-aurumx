const express = require('express');
const router = express.Router();

const db = require('../config/db');


// =========================================================
// HELPERS
// =========================================================

function getUserFromRequest(req) {
  return req.user || null;
}


function getRole(req) {

  const user = getUserFromRequest(req);

  return String(user?.role || '')
    .trim()
    .toLowerCase();

}


function getDepartment(req) {

  const user = getUserFromRequest(req);

  return String(user?.department || '')
    .trim()
    .toLowerCase();

}


// =========================================================
// AUTHORIZATION
// =========================================================

function canViewInterviews(req) {

  const role = getRole(req);
  const department = getDepartment(req);

  /*
   * Admin can VIEW only.
   */
  if (role === 'admin') {
    return true;
  }

  /*
   * HR can VIEW + MANAGE.
   *
   * Your portal uses Employee + department HR,
   * so support that structure.
   */
  if (
    role === 'employee' &&
    department === 'hr'
  ) {
    return true;
  }

  return false;
}


function canManageInterviews(req) {

  const role = getRole(req);
  const department = getDepartment(req);

  /*
   * ONLY HR can add/update/delete.
   */
  return (
    role === 'employee' &&
    department === 'hr'
  );

}


// =========================================================
// VIEW ACCESS MIDDLEWARE
// =========================================================

function requireInterviewViewAccess(
  req,
  res,
  next
) {

  if (!canViewInterviews(req)) {

    return res.status(403).json({
      message:
        'You do not have permission to access interviews.'
    });

  }

  next();

}


// =========================================================
// MANAGEMENT ACCESS MIDDLEWARE
// =========================================================

function requireInterviewManageAccess(
  req,
  res,
  next
) {

  if (!canManageInterviews(req)) {

    return res.status(403).json({
      message:
        'Only HR can add, update, or delete interviews.'
    });

  }

  next();

}


// =========================================================
// GET ALL INTERVIEWS
// =========================================================
// ADMIN + HR
// =========================================================

router.get(
  '/',
  requireInterviewViewAccess,
  async (req, res) => {

    try {

      const [results] = await db.query(`
        SELECT
          id,
          hr_name,
          candidate_name,
          candidate_number,
          linkedin_link,
          resume,
          photo,
          interview_date,
          status,
          created_at,
          updated_at
        FROM interviews
        ORDER BY interview_date DESC, id DESC
      `);


      return res.status(200).json(
        results
      );

    } catch (error) {

      console.error(
        'GET INTERVIEWS ERROR:',
        error
      );

      return res.status(500).json({
        message:
          'Server error while fetching interviews.'
      });

    }

  }
);


// =========================================================
// GET SINGLE INTERVIEW
// =========================================================
// ADMIN + HR
// =========================================================

router.get(
  '/:id',
  requireInterviewViewAccess,
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);


      if (!Number.isInteger(id)) {

        return res.status(400).json({
          message:
            'Invalid interview ID.'
        });

      }


      const [results] =
        await db.query(
          `
          SELECT
            id,
            hr_name,
            candidate_name,
            candidate_number,
            linkedin_link,
            resume,
            photo,
            interview_date,
            status,
            created_at,
            updated_at
          FROM interviews
          WHERE id = ?
          LIMIT 1
          `,
          [id]
        );


      if (
        results.length === 0
      ) {

        return res.status(404).json({
          message:
            'Interview not found.'
        });

      }


      return res.status(200).json(
        results[0]
      );

    } catch (error) {

      console.error(
        'GET SINGLE INTERVIEW ERROR:',
        error
      );

      return res.status(500).json({
        message:
          'Server error while fetching interview.'
      });

    }

  }
);


// =========================================================
// CREATE INTERVIEW
// =========================================================
// HR ONLY
// =========================================================

router.post(
  '/',
  requireInterviewManageAccess,
  async (req, res) => {

    const {
      hr_name,
      candidate_name,
      candidate_number,
      linkedin_link,
      resume,
      photo,
      interview_date,
      status
    } = req.body;


    try {

      // -----------------------------------------------
      // REQUIRED FIELDS
      // -----------------------------------------------

      if (
        !hr_name ||
        !candidate_name ||
        !candidate_number ||
        !interview_date
      ) {

        return res.status(400).json({
          message:
            'HR name, candidate name, candidate number and interview date are required.'
        });

      }


      // -----------------------------------------------
      // STATUS VALIDATION
      // -----------------------------------------------

      const validStatuses = [
        'upcoming',
        'complete'
      ];


      const interviewStatus =
        String(
          status || 'upcoming'
        )
          .trim()
          .toLowerCase();


      if (
        !validStatuses.includes(
          interviewStatus
        )
      ) {

        return res.status(400).json({
          message:
            'Status must be upcoming or complete.'
        });

      }


      // -----------------------------------------------
      // INSERT
      // -----------------------------------------------

      const [result] =
        await db.query(
          `
          INSERT INTO interviews
          (
            hr_name,
            candidate_name,
            candidate_number,
            linkedin_link,
            resume,
            photo,
            interview_date,
            status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            String(hr_name).trim(),

            String(candidate_name).trim(),

            String(candidate_number).trim(),

            linkedin_link
              ? String(
                  linkedin_link
                ).trim()
              : null,

            resume
              ? String(resume).trim()
              : null,

            photo
              ? String(photo).trim()
              : null,

            interview_date,

            interviewStatus
          ]
        );


      // -----------------------------------------------
      // RESPONSE
      // -----------------------------------------------

      return res.status(201).json({

        message:
          'Interview created successfully.',

        id:
          result.insertId

      });

    } catch (error) {

      console.error(
        'CREATE INTERVIEW ERROR:',
        error
      );

      return res.status(500).json({
        message:
          'Server error while creating interview.'
      });

    }

  }
);


// =========================================================
// UPDATE INTERVIEW
// =========================================================
// HR ONLY
// =========================================================

router.put(
  '/:id',
  requireInterviewManageAccess,
  async (req, res) => {

    const {
      hr_name,
      candidate_name,
      candidate_number,
      linkedin_link,
      resume,
      photo,
      interview_date,
      status
    } = req.body;


    try {

      const id =
        Number(req.params.id);


      if (!Number.isInteger(id)) {

        return res.status(400).json({
          message:
            'Invalid interview ID.'
        });

      }


      // -----------------------------------------------
      // CHECK EXISTING RECORD
      // -----------------------------------------------

      const [existing] =
        await db.query(
          `
          SELECT *
          FROM interviews
          WHERE id = ?
          LIMIT 1
          `,
          [id]
        );


      if (
        existing.length === 0
      ) {

        return res.status(404).json({
          message:
            'Interview not found.'
        });

      }


      const oldInterview =
        existing[0];


      // -----------------------------------------------
      // KEEP OLD VALUES IF NOT SENT
      // -----------------------------------------------

      const finalHrName =
        hr_name !== undefined
          ? String(hr_name).trim()
          : oldInterview.hr_name;


      const finalCandidateName =
        candidate_name !== undefined
          ? String(
              candidate_name
            ).trim()
          : oldInterview.candidate_name;


      const finalCandidateNumber =
        candidate_number !== undefined
          ? String(
              candidate_number
            ).trim()
          : oldInterview.candidate_number;


      const finalLinkedin =
        linkedin_link !== undefined
          ? (
              linkedin_link
                ? String(
                    linkedin_link
                  ).trim()
                : null
            )
          : oldInterview.linkedin_link;


      const finalResume =
        resume !== undefined
          ? (
              resume
                ? String(
                    resume
                  ).trim()
                : null
            )
          : oldInterview.resume;


      const finalPhoto =
        photo !== undefined
          ? (
              photo
                ? String(
                    photo
                  ).trim()
                : null
            )
          : oldInterview.photo;


      const finalDate =
        interview_date !== undefined
          ? interview_date
          : oldInterview.interview_date;


      const finalStatus =
        status !== undefined
          ? String(
              status
            )
              .trim()
              .toLowerCase()
          : oldInterview.status;


      // -----------------------------------------------
      // VALIDATE STATUS
      // -----------------------------------------------

      const validStatuses = [
        'upcoming',
        'complete'
      ];


      if (
        !validStatuses.includes(
          finalStatus
        )
      ) {

        return res.status(400).json({
          message:
            'Status must be upcoming or complete.'
        });

      }


      // -----------------------------------------------
      // UPDATE
      // -----------------------------------------------

      await db.query(
        `
        UPDATE interviews
        SET
          hr_name = ?,
          candidate_name = ?,
          candidate_number = ?,
          linkedin_link = ?,
          resume = ?,
          photo = ?,
          interview_date = ?,
          status = ?
        WHERE id = ?
        `,
        [
          finalHrName,

          finalCandidateName,

          finalCandidateNumber,

          finalLinkedin,

          finalResume,

          finalPhoto,

          finalDate,

          finalStatus,

          id
        ]
      );


      return res.status(200).json({
        message:
          'Interview updated successfully.'
      });

    } catch (error) {

      console.error(
        'UPDATE INTERVIEW ERROR:',
        error
      );

      return res.status(500).json({
        message:
          'Server error while updating interview.'
      });

    }

  }
);


// =========================================================
// DELETE INTERVIEW
// =========================================================
// HR ONLY
// =========================================================

router.delete(
  '/:id',
  requireInterviewManageAccess,
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);


      if (!Number.isInteger(id)) {

        return res.status(400).json({
          message:
            'Invalid interview ID.'
        });

      }


      // -----------------------------------------------
      // CHECK EXISTING
      // -----------------------------------------------

      const [existing] =
        await db.query(
          `
          SELECT id
          FROM interviews
          WHERE id = ?
          LIMIT 1
          `,
          [id]
        );


      if (
        existing.length === 0
      ) {

        return res.status(404).json({
          message:
            'Interview not found.'
        });

      }


      // -----------------------------------------------
      // DELETE
      // -----------------------------------------------

      await db.query(
        `
        DELETE FROM interviews
        WHERE id = ?
        `,
        [id]
      );


      return res.status(200).json({
        message:
          'Interview deleted successfully.'
      });

    } catch (error) {

      console.error(
        'DELETE INTERVIEW ERROR:',
        error
      );

      return res.status(500).json({
        message:
          'Server error while deleting interview.'
      });

    }

  }
);


module.exports = router;