const express = require('express');
const router = express.Router();
const db = require('../connection'); // Import the database connection
const { sendFollowupNotification } = require('./emailService'); // ✅ import function

// router.get('/grouped-by-bde', async (req, res) => {
//     try {
//         const sql = `
//       SELECT c.*, e.fullName AS bde_name 
//       FROM clients c
//       JOIN employees e ON c.employee_id = e.id
//       ORDER BY e.fullName, c.fullName
//     `;

//         const [results] = await db.query(sql); // Corrected: use `sql`, not `insertQuery`

//         res.status(200).json(results);
//     } catch (error) {
//         console.error('Error fetching clients:', error);
//         res.status(500).json({ message: 'Database error', error });
//     }
// });

router.get('/grouped-by-bde', async (req, res) => {
    try {
        const sql = `
        SELECT 
            c.*,
            e.fullName AS bde_name,
            e.email AS bde_email,
            lf.followup_date AS last_followup_date,
            lf.notes AS last_followup_note
        FROM clients c
        JOIN employees e ON c.employee_id = e.id
        LEFT JOIN (
            SELECT f1.client_id, f1.followup_date, f1.notes
            FROM client_followups f1
            INNER JOIN (
                SELECT client_id, MAX(followup_date) AS latest_date
                FROM client_followups
                GROUP BY client_id
            ) f2
            ON f1.client_id = f2.client_id
            AND f1.followup_date = f2.latest_date
        ) lf ON c.id = lf.client_id
        ORDER BY e.fullName, c.fullName;
        `;

        const [results] = await db.query(sql);
        res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching grouped clients:', error);
        res.status(500).json({ message: 'Database error', error });
    }
});

// ✅ 1. CREATE: Add New Client
router.post('/', async (req, res) => {
    try {
        const {
            fullName, mobile, email, linkedinId, websiteLink, clientNote, country, address, clientType, clientConnectType, bdeAccountId, bdeAccountEmail, date, platform, technology, prizeTag, prizeAmount, employee_id
        } = req.body;



        const sql = `INSERT INTO clients 
            (fullName, mobile, email, linkedin_id, website_link, client_note, country, address, client_type, client_Connect_Type, bde_account_id, bde_account_email, date, 
            platform, technology, prize_tag, prize_amount,employee_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const [result] = await db.query(sql, [fullName, mobile, email, linkedinId, websiteLink, clientNote, country, address, clientType, clientConnectType, bdeAccountId, bdeAccountEmail,
            date, platform, technology, prizeTag, prizeAmount, employee_id]);

        res.status(201).json({ message: 'Client added successfully', clientId: result.insertId });
    } catch (error) {
        console.error('Error inserting client:', error);
        res.status(500).json({ message: 'Database error', error });
    }
});
// ✅ READ: Get All Clients with BDE Name
// router.get('/', async (req, res) => {
//     try {
//         const [results] = await db.query(`
//         SELECT c.*, e.fullName AS bde_name 
//       FROM clients c
//       JOIN employees e ON c.employee_id = e.id

//     `);
//         res.status(200).json(results);
//     } catch (error) {
//         console.error('Error fetching clients with BDE name:', error);
//         res.status(500).json({ message: 'Database error', error });
//     }
// });
// ✅ READ: Get All Clients with BDE Name + Latest Follow-up Info
router.get('/', async (req, res) => {
    try {
        const sql = `
      SELECT 
        c.*, 
        e.fullName AS bde_name,
        e.email AS bde_email,
        lf.followup_date AS last_followup_date,
        lf.notes AS last_followup_note
      FROM clients c
      JOIN employees e ON c.employee_id = e.id
      LEFT JOIN (
        SELECT f1.client_id, f1.followup_date, f1.notes
        FROM client_followups f1
        INNER JOIN (
          SELECT client_id, MAX(followup_date) AS latest_date
          FROM client_followups
          GROUP BY client_id
        ) f2 
        ON f1.client_id = f2.client_id AND f1.followup_date = f2.latest_date
      ) lf ON c.id = lf.client_id
      ORDER BY e.fullName, c.fullName;
    `;

        const [results] = await db.query(sql);
        res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching clients with last follow-up info:', error);
        res.status(500).json({ message: 'Database error', error });
    }
});

// ✅ GET: Follow-ups for a specific client (must be before /:id to avoid Express matching 'followups' as :id)
router.get('/followups/:clientId', async (req, res) => {
    const { clientId } = req.params;

    try {
        const [results] = await db.query(
            `SELECT
        f.id,
        f.client_id,
        c.fullName AS clientName,
        f.bde_id,
        e.fullName AS bdeName,
        f.followup_date,
        f.status,
        f.notes,
        f.created_at
      FROM client_followups f
      LEFT JOIN clients c ON f.client_id = c.id
      LEFT JOIN employees e ON f.bde_id = e.id
      WHERE f.client_id = ?
      ORDER BY f.followup_date DESC;`,
            [clientId]
        );
        res.json(results);
    } catch (err) {
        console.error('Error fetching follow-ups:', err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ POST: Add a new follow-up for a client (must be before /:id)
router.post('/followups/:clientId', async (req, res) => {
    const { clientId } = req.params;
    const { bde_id, followup_date, notes, status } = req.body;

    const insertQuery = `
        INSERT INTO client_followups
        (client_id, bde_id, followup_date, notes, status)
        VALUES (?, ?, ?, ?, ?)
    `;

    try {
        const [result] = await db.query(insertQuery, [
            clientId,
            bde_id,
            followup_date,
            notes,
            status
        ]);

        // ✅ Send email notification
        await sendFollowupNotification(clientId, bde_id, followup_date, notes, status);

        res.status(201).json({ message: 'Follow-up added and email sent', id: result.insertId });
    } catch (err) {
        console.error('Error adding follow-up:', err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ 3. READ: Get Single Client by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query(
            `SELECT c.*, 
            e.fullName AS bde_name 
             FROM clients c
             JOIN employees e ON c.employee_id = e.id
             WHERE c.id = ? `,
            [id]
        );

        if (result.length === 0) {
            return res.status(404).json({ message: 'Client not found' });
        }

        res.status(200).json(result[0]);
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ message: 'Database error', error });
    }
});
// ✅ 4. UPDATE: Edit Client by ID
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            fullName, mobile, email, linkedinId, websiteLink, clientNote, country, address, clientType, clientConnectType, bdeAccountId , bdeAccountEmail, date, platform, technology, prizeTag, prizeAmount
        } = req.body;



        const sql = `UPDATE clients SET 
            fullName=?, mobile=?, email=?, linkedin_id=?, website_link=?, client_note=?, country=?, address=?, 
            client_type=?, client_Connect_Type=?, bde_account_id=?, bde_account_email=?, date=?, platform=?, technology=?, prize_tag=?, prize_amount=? 
            WHERE id=?`;

        const [result] = await db.query(sql, [fullName, mobile, email, linkedinId, websiteLink, clientNote, country, address, clientType, clientConnectType, bdeAccountId, bdeAccountEmail,
            date, platform, technology, prizeTag, prizeAmount, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Client not found' });
        }

        res.status(200).json({ message: 'Client updated successfully' });
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ message: 'Database error', error });
    }
});

// ✅ 5. DELETE: Remove Client by ID
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query('DELETE FROM clients WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Client not found' });
        }

        res.status(200).json({ message: 'Client deleted successfully' });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ message: 'Database error', error });
    }
});


module.exports = router;
