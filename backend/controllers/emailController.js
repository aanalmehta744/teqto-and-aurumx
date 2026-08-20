const db = require('../connection'); // Import the database connection (non-promise version)

// Get emails by folder (e.g., Inbox, Sent, etc.)
exports.getEmailsByFolder = (req, res) => {
    const { folder } = req.params;

    db.query('SELECT * FROM emails WHERE folder = ?', [folder], (error, emails) => {
        if (error) {
            return res.status(500).json({ message: `Error fetching emails in ${folder}`, error: error.message });
        }
        res.status(200).json(emails);
    });
};

// Get emails by label (e.g., Family, Work, etc.)
exports.getEmailsByLabel = (req, res) => {
    const { label } = req.params;

    db.query('SELECT * FROM emails WHERE FIND_IN_SET(?, labels)', [label], (error, emails) => {
        if (error) {
            return res.status(500).json({ message: `Error fetching emails with label ${label}`, error: error.message });
        }
        res.status(200).json(emails);
    });
};

// Create a new email
exports.addEmail = (req, res) => {
    const { subject, body, sender_user_type, sender_user_id, recipient_user_type, recipient_user_id, folder, labels } = req.body;

    const query = `
        INSERT INTO emails (subject, body, sender_user_type, sender_user_id, recipient_user_type, recipient_user_id, folder, labels)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(query, [
        subject,
        body,
        sender_user_type,
        sender_user_id,
        recipient_user_type,
        recipient_user_id,
        folder,
        labels
    ], (error, result) => {
        if (error) {
            console.error('Error adding email:', error.message);
            return res.status(500).json({ message: 'Error adding email', error: error.message });
        }

        res.status(201).json({ message: 'Email created successfully', id: result.insertId });
    });
};
