const express = require('express');
const router = express.Router();
const db = require('../connection'); // Import the database connection

// Helper function to check required fields
const checkRequiredFields = (fields) => {
    const missingFields = fields.filter(field => field.value === undefined);
    return missingFields.length > 0 ? missingFields : null;
};

// API route to handle payment form submission (CREATE)
router.post('/', (req, res) => {
    const { bill_no, client_id, employee_id, payment_date, discount, total_amount, payment_method, payment_status } = req.body;

    // Check for required fields
    const requiredFields = checkRequiredFields([
        { name: 'bill_no', value: bill_no },
        { name: 'client_id', value: client_id },
        { name: 'employee_id', value: employee_id },
        { name: 'payment_date', value: payment_date },
        { name: 'total_amount', value: total_amount },
        { name: 'payment_method', value: payment_method },
        { name: 'payment_status', value: payment_status }
    ]);

    if (requiredFields) {
        return res.status(400).json({ error: 'Missing required fields', fields: requiredFields.map(f => f.name) });
    }

    // Insert query
    const query = `
    INSERT INTO payments (bill_no, client_id, employee_id, payment_date, discount, total_amount, payment_method, payment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.execute(query, [
        bill_no,
        client_id,
        employee_id,
        payment_date,
        discount !== undefined && discount !== null ? discount : null,
        total_amount,
        payment_method,
        payment_status
    ], (err, result) => {
        if (err) {
            console.error('Error inserting payment data:', err);
            return res.status(500).json({ error: 'Failed to insert payment data', details: err.message });
        }
        res.status(200).json({ message: 'Payment data inserted successfully', insertId: result.insertId });
    });
});

// READ: Get all payments
router.get('/', (req, res) => {
    db.query(`
        SELECT 
            p.id,
            p.bill_no,
            p.client_id,
            p.employee_id,
            p.payment_date,
            p.discount,
            p.total_amount,
            p.payment_method,
            p.payment_status,
            p.created_at,
            p.updated_at,
            CAST(p.discount AS DECIMAL(10, 2)) AS discount,
            CAST(p.total_amount AS DECIMAL(10, 2)) AS total_amount,
            CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
            c.name AS client_name,
            e.first_name AS employee_first_name,
            e.last_name AS employee_last_name,
            e.email AS employee_email
        FROM 
            payments p
        JOIN 
            employees e ON p.employee_id = e.id
        JOIN 
            clients c ON p.client_id = c.id
    `, (err, results) => {
        if (err) {
            console.error('Error fetching payment data:', err);
            return res.status(500).json({ error: 'Failed to fetch payment data', details: err.message });
        }
        res.json(results);
    });
});


// READ: Get a single payment by ID
router.get('/:id', (req, res) => {
    const id = req.params.id;
    db.query('SELECT * FROM payments WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('Error fetching payment data:', err);
            return res.status(500).json({ error: 'Failed to fetch payment data', details: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        res.json(results[0]);
    });
});

// UPDATE: Update an existing payment by ID
router.put('/:id', (req, res) => {
    const id = req.params.id;
    const { bill_no, client_id, employee_id, payment_date, discount, total_amount, payment_method, payment_status } = req.body;
    // Convert the holiday date to UTC
    const paymentDate = new Date(payment_date);
    const utcpaymentDate = new Date(paymentDate.toISOString());  // Convert to UTC

    // Check for required fields
    const requiredFields = checkRequiredFields([
        { name: 'bill_no', value: bill_no },
        { name: 'client_id', value: client_id },
        { name: 'employee_id', value: employee_id },
        { name: 'payment_date', value: utcpaymentDate },
        { name: 'total_amount', value: total_amount },
        { name: 'payment_method', value: payment_method },
        { name: 'payment_status', value: payment_status }
    ]);

    if (requiredFields) {
        return res.status(400).json({ error: 'Missing required fields', fields: requiredFields.map(f => f.name) });
    }

    const query = `
    UPDATE payments
    SET bill_no = ?, client_id = ?, employee_id = ?, payment_date = ?, discount = ?, total_amount = ?, payment_method = ?, payment_status = ?
    WHERE id = ?
    `;

    db.execute(query, [
        bill_no,
        client_id,
        employee_id,
        utcpaymentDate,
        discount !== undefined && discount !== null ? discount : null,
        total_amount,
        payment_method,
        payment_status,
        id
    ], (err, result) => {
        if (err) {
            console.error('Error updating payment data:', err);
            return res.status(500).json({ error: 'Failed to update payment data', details: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        res.json({ message: 'Payment data updated successfully' });
    });
});

// DELETE: Delete a payment by ID
router.delete('/:id', (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM payments WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('Error deleting payment data:', err);
            return res.status(500).json({ error: 'Failed to delete payment data', details: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        res.status(204).send(); // No content indicates successful deletion
    });
});
router.get('/invoice/:invoiceId', (req, res) => {
    const invoiceId = req.params.invoiceId; // Use params to access the route parameter
    // Fetch payment details from the database based on invoiceId
    db.query(`
  SELECT 
   p.*,
    CAST(p.discount AS DECIMAL(10, 2)) AS discount,
    CAST(p.total_amount AS DECIMAL(10, 2)) AS total_amount,
    CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
    c.name AS client_name,
    e.*
  FROM 
    payments p
  JOIN 
    employees e ON p.employee_id = e.id
  JOIN 
    clients c ON p.client_id = c.id
  WHERE 
    p.id = ?
`, [invoiceId], (err, results) => {
        if (err) {
            return res.status(500).send({ message: 'Error fetching payment details' });
        }
        res.send(results);
    });
});

// GET payments for logged-in client
router.get('/clientpayments/:id', (req, res) => {
    const client_id = req.params.id; // Get client_id from the route parameter

    // SQL query to fetch payments with concatenated employee name
    const query = `
        SELECT p.*, CONCAT(e.first_name, ' ', e.last_name) AS employee_name
        FROM payments p
        LEFT JOIN employees e ON p.employee_id = e.id
        WHERE p.client_id = ?
    `;

    db.query(query, [client_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query error' });
        }
        res.json(results);
    });
});


module.exports = router;
