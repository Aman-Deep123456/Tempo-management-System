const express = require('express');
const { addUser, authenticateUser } = require('./userExcel');
const { addRoute, findRoute } = require('./routeExcel');
const path = require('path');

const app = express();
app.use(express.json());

// ✅ Serve static files (HTML, CSS, JS) from the "public" folder
app.use(express.static('public'));

// ✅ When visiting "/", load signup.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Signup API
app.post('/api/signup', (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const user = addUser({ name, email, password, role });
        res.status(201).json({ message: 'Signup successful', user });
    } catch (err) {
        res.status(409).json({ message: err.message });
    }
});

// Login API
app.post('/api/login', (req, res) => {
    const { email, password, role } = req.body;
    const user = authenticateUser(email, password, role);
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.json({ message: 'Login successful', role: user.Role });
});

// Add route API
app.post('/api/add-route', (req, res) => {
    const { source, destination, distance, duration } = req.body;
    try {
        const route = addRoute({ source, destination, distance, duration });
        res.status(201).json({ message: 'Route added', route });
    } catch (err) {
        res.status(409).json({ message: err.message });
    }
});

// Find route API
app.post('/api/find-route', (req, res) => {
    const { source, destination } = req.body;
    const route = findRoute(source, destination);
    if (!route) {
        return res.status(404).json({ message: 'Route not found' });
    }
    res.json(route);
});

app.listen(3000, () => console.log('✅ Server running on http://localhost:3000'));
