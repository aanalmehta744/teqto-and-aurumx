const express = require('express');
const app = express();
const projectRouter = require('./projects/projects'); // Adjust the path if necessary
const estimatesRoutes = require('./estimates/estimates'); // Import estimates routes


// Middleware to parse JSON bodies
app.use(express.json());

// Basic route to check API is working
app.get('/', (req, res) => {
    console.log('API route hit');
    res.send('API is working');
});

// Use your routes
app.use('/api', projectRouter);
router.use('/estimates', estimatesRoutes);

app.listen(5001, () => {
    console.log('Server is running on port 5001');
});
