const express = require('express');
const { addUser, authenticateUser, getUserByEmail, getAllUsers, updateUserPassword } = require('./userExcel');
const { addRoute, findRoute } = require('./routeExcel');
const path = require('path');

const app = express();
app.use(express.json());

// In-memory OTP store: email -> { otp, expiresAt, verified }
const otpStore = new Map();

// ✅ Serve static files (HTML, CSS, JS) from the "public" folder
app.use(express.static('public'));

// ✅ When visiting "/", load signup.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});
// Signup API
app.post('/api/signup', (req, res) => {
    const { name, email, password, role } = req.body;
    if (role === 'Admin') {
        return res.status(403).json({ message: 'Admin accounts cannot be self-registered. Credentials must be provided by the team.' });
    }
    if (!['Passenger', 'Driver'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role. Only Passenger and Driver accounts can be registered.' });
    }
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
    if (!email || !password || !role) {
        return res.status(400).json({ message: 'Please provide email, password, and role' });
    }
    const user = authenticateUser(email, password, role);
    if (!user) {
        const existing = getUserByEmail(email);
        const existingRole = existing ? (existing.Role || existing.role) : null;
        if (existing && existingRole && existingRole.toLowerCase() !== role.toLowerCase()) {
            return res.status(401).json({ message: `Account exists with role "${existingRole}". Please select "${existingRole}" instead of "${role}".` });
        }
        return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.json({ message: 'Login successful', user: { name: user.Name, email: user.Email, role: user.Role } });
});

// 🔑 Forgot Password Step 1: Send OTP to registered email
app.post('/api/forgot-password/send-otp', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Please enter your registered email address' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = getUserByEmail(cleanEmail);
    if (!user) {
        return res.status(404).json({ message: 'No account found registered with this email in the database.' });
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(cleanEmail, { otp, expiresAt, verified: false });

    console.log(`\n========================================`);
    console.log(`🔐 OTP GENERATED FOR ${cleanEmail}: ${otp}`);
    console.log(`⏰ Valid for 10 minutes`);
    console.log(`========================================\n`);

    res.json({
        message: 'A 6-digit verification code has been generated for your email.',
        demoOtp: otp,
        email: cleanEmail
    });
});

// 🔑 Forgot Password Step 2: Verify OTP
app.post('/api/forgot-password/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP verification code are required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const entry = otpStore.get(cleanEmail);
    if (!entry) {
        return res.status(400).json({ message: 'No active OTP request found for this email. Please request a new code.' });
    }

    if (Date.now() > entry.expiresAt) {
        otpStore.delete(cleanEmail);
        return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    if (entry.otp !== cleanOtp) {
        return res.status(400).json({ message: 'Incorrect verification code. Please check and try again.' });
    }

    entry.verified = true;
    res.json({ message: 'Verification code verified successfully!' });
});

// 🔑 Forgot Password Step 3: Reset password in users.xlsx
app.post('/api/forgot-password/reset-password', (req, res) => {
    const { email, newPassword, confirmPassword } = req.body;
    if (!email || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'Please fill out all fields' });
    }
    const cleanEmail = email.trim().toLowerCase();

    const entry = otpStore.get(cleanEmail);
    if (!entry || !entry.verified) {
        return res.status(403).json({ message: 'OTP verification not completed. Please verify your OTP code first.' });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (newPassword.length < 4) {
        return res.status(400).json({ message: 'Password must be at least 4 characters long' });
    }

    try {
        updateUserPassword(cleanEmail, newPassword);
        otpStore.delete(cleanEmail);
        res.json({ message: 'Password successfully updated in users.xlsx! You can now log in with your new password.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get users list (without passwords)
app.get('/api/users', (req, res) => {
    res.json(getAllUsers());
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
