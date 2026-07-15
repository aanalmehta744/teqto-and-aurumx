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
        // OLD: const { ..., bdeAccountId, bdeAccountEmail, ... } = req.body;
        // NEW CODE: Replaced bdeAccountId/bdeAccountEmail with bankName, bankAccountNumber, ifscCode
        const {
            fullName, mobile, email, linkedinId, websiteLink, clientNote, country, address, clientType, clientConnectType, date, platform, technology, prizeTag, prizeAmount, employee_id, tag,
            clientConnectSource, platformId, platformPassword,
            bankName, bankAccountNumber, ifscCode
        } = req.body;

        // OLD INSERT had bde_account_id, bde_account_email
        // NEW CODE: INSERT now includes bank_name, bank_account_number, ifsc_code instead
        const sql = `INSERT INTO clients
            (fullName, mobile, email, linkedin_id, website_link, client_note, country, address, client_type, client_Connect_Type, date,
            platform, technology, prize_tag, prize_amount, employee_id, tag, client_connect_source, platform_id, platform_password,
            bank_name, bank_account_number, ifsc_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const [result] = await db.query(sql, [
            fullName, mobile, email, linkedinId, websiteLink, clientNote, country, address, clientType, clientConnectType, date,
            platform, technology, prizeTag, prizeAmount, employee_id, tag || null,
            clientConnectSource || null, platformId || null, platformPassword || null,
            bankName || null, bankAccountNumber || null, ifscCode || null
        ]);

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
// Helper: map prize_tag label to bde_conversions.client_type ENUM value
function prizeTagToClientType(tag) {
    const map = {
        'Full Time': 'full_time',
        'Part Time': 'part_time',
        'Hourly': 'hourly',
        'Project Based': 'project_base',
    };
    return map[tag] || null;
}

// ✅ 4. UPDATE: Edit Client by ID
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // OLD: const { ..., bdeAccountId, bdeAccountEmail, ... } = req.body;
        // NEW CODE: Replaced bdeAccountId/bdeAccountEmail with bankName, bankAccountNumber, ifscCode
        const {
            fullName, mobile, email, linkedinId, websiteLink, clientNote, country, address,
            clientType, clientConnectType,
            date, platform, technology, prizeTag, prizeAmount, tag,
            clientConnectSource, platformId, platformPassword,
            bankName, bankAccountNumber, ifscCode
        } = req.body;

        // Fetch the existing record before update
        const [[existing]] = await db.query(`SELECT * FROM clients WHERE id=?`, [id]);
        if (!existing) return res.status(404).json({ message: 'Client not found' });

        // OLD UPDATE had bde_account_id, bde_account_email
        // NEW CODE: UPDATE now includes bank_name, bank_account_number, ifsc_code instead
        const sql = `UPDATE clients SET
            fullName=?, mobile=?, email=?, linkedin_id=?, website_link=?, client_note=?, country=?, address=?,
            client_type=?, client_Connect_Type=?, date=?, platform=?, technology=?, prize_tag=?, prize_amount=?, tag=?,
            client_connect_source=?, platform_id=?, platform_password=?,
            bank_name=?, bank_account_number=?, ifsc_code=?
            WHERE id=?`;

        const [result] = await db.query(sql, [
            fullName, mobile, email, linkedinId, websiteLink, clientNote, country, address,
            clientType, clientConnectType,
            date, platform, technology, prizeTag, prizeAmount, tag || null,
            clientConnectSource || null, platformId || null, platformPassword || null,
            bankName || null, bankAccountNumber || null, ifscCode || null, id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Client not found' });
        }

        const closedNow = clientType === 'Close';
        const wasAlreadyClosed = existing.client_type === 'Close';
        const clientTypeEnum = prizeTagToClientType(prizeTag);
        const convDate = new Date().toISOString().split('T')[0];

        // ── When client is closed → always upsert into bde_conversions ──────────
        if (closedNow) {
            await db.query(`
                INSERT INTO bde_conversions
                    (client_id, user_id, client_name, deal_value, client_type, conversion_status, conversion_date, closing_notes)
                VALUES (?, ?, ?, ?, ?, 'won', ?, 'Auto-closed from client record')
                ON DUPLICATE KEY UPDATE
                    deal_value = VALUES(deal_value),
                    client_type = VALUES(client_type),
                    conversion_date = VALUES(conversion_date),
                    user_id = VALUES(user_id),
                    client_name = VALUES(client_name)
            `, [id, existing.employee_id, fullName, prizeAmount || 0, clientTypeEnum || null, convDate])
            .catch(e => console.error('Conversion upsert error:', e.message));
        }

        // ── When prize_tag changes on a CLOSED client → notify admin ─────────
        if (wasAlreadyClosed && closedNow && existing.prize_tag !== prizeTag) {
            const msg = `BDE changed price tag for client "${fullName}" from "${existing.prize_tag || 'none'}" to "${prizeTag}"`;
            await db.query(`
                INSERT INTO notifications (type, message, client_id, bde_id)
                VALUES ('prize_tag_change', ?, ?, ?)
            `, [msg, id, existing.employee_id])
            .catch(e => console.error('Notification insert error:', e.message));
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

        // Remove linked conversion record so achievement counts stay accurate
        await db.query('DELETE FROM bde_conversions WHERE client_id = ?', [id]).catch(() => {});

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
