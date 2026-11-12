const express = require('express');
const {
    addUser,
    authenticateUser,
    getUserByEmail,
    getAllUsers,
    getAllDrivers,
    updateUserPassword,
    updateDriverProfile,
    deleteUserByEmail,
    updateDriverStatus,
    warnDriver,
    clearDriverWarning,
    adminUpdateDriver
} = require('./userExcel');
const { getAllRoutes, addRoute, deleteRoute, findRoute } = require('./routeExcel');
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
    const { name, email, password, role, sex, aadhar, vehicleType, vehicleNo } = req.body;
    if (role === 'Admin') {
        return res.status(403).json({ message: 'Admin accounts cannot be self-registered. Credentials must be provided by the team.' });
    }
    if (!['Passenger', 'Driver'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role. Only Passenger and Driver accounts can be registered.' });
    }
    try {
        const user = addUser({ name, email, password, role, sex, aadhar, vehicleType, vehicleNo });
        res.status(201).json({
            message: role === 'Driver'
                ? 'Driver account and vehicle details registered successfully!'
                : 'Signup successful',
            user: {
                name: user.Name,
                email: user.Email,
                role: user.Role,
                sex: user.Sex || '',
                vehicleType: user.VehicleType || '',
                vehicleNo: user.VehicleNo || ''
            }
        });
    } catch (err) {
        const statusCode = err.statusCode || 400;
        res.status(statusCode).json({ message: err.message });
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

    if (user.Status && user.Status.toLowerCase() === 'suspended') {
        return res.status(403).json({
            message: '⚠️ Your account has been suspended by administration. Please contact transit dispatch hub.'
        });
    }

    res.json({
        message: 'Login successful',
        user: {
            name: user.Name,
            email: user.Email,
            role: user.Role,
            sex: user.Sex || '',
            vehicleType: user.VehicleType || '',
            vehicleNo: user.VehicleNo || '',
            status: user.Status || 'Active',
            warning: user.Warning || '',
            maintenanceDue: user.MaintenanceDue || 'Dec 20, 2026'
        }
    });
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

// Get registered drivers list from users.xlsx (without passwords or sensitive IDs)
app.get('/api/drivers', (req, res) => {
    const drivers = getAllUsers()
        .filter(u => u.role && u.role.toLowerCase() === 'driver')
        .map(d => ({
            id: d.id,
            name: d.name,
            sex: d.sex || 'Not specified',
            vehicleType: d.vehicleType || 'Four Seater',
            vehicleNo: d.vehicleNo || `UK-07-TA-${1000 + d.id * 137}`
        }));
    res.json(drivers);
});

// Update driver profile in users.xlsx
app.put('/api/driver/profile', (req, res) => {
    const { email, name, sex, vehicleType, vehicleNo } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Driver email is required' });
    }
    try {
        const updatedUser = updateDriverProfile({ email, name, sex, vehicleType, vehicleNo });
        res.json({ message: 'Driver profile updated in users.xlsx!', user: updatedUser });
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
});

// --- Admin Management APIs (users.xlsx) ---

// 1. Get high-level Admin stats & breakdown
app.get('/api/admin/stats', (req, res) => {
    try {
        const users = getAllUsers();
        const drivers = users.filter(u => u.role && u.role.toLowerCase() === 'driver');
        const passengers = users.filter(u => u.role && u.role.toLowerCase() === 'passenger');
        const activeDrivers = drivers.filter(d => (d.status || 'Active').toLowerCase() === 'active');
        const suspendedDrivers = drivers.filter(d => (d.status || '').toLowerCase() === 'suspended');
        const warnedDrivers = drivers.filter(d => Boolean(d.warning));
        const routes = getAllRoutes();

        res.json({
            totalUsers: users.length,
            totalDrivers: drivers.length,
            activeDrivers: activeDrivers.length,
            suspendedDrivers: suspendedDrivers.length,
            warnedDrivers: warnedDrivers.length,
            totalPassengers: passengers.length,
            totalRoutes: routes.length,
            activeTrips: 18
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 1.1 Get all verified driver profiles specifically for Admin console
app.get('/api/admin/drivers', (req, res) => {
    try {
        const drivers = getAllDrivers();
        res.json(drivers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. Remove / Delete a driver permanently from users.xlsx
app.delete('/api/admin/driver', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Driver email is required' });
    }
    try {
        const removed = deleteUserByEmail(email);
        res.json({
            message: `Driver "${removed.name}" (${removed.email}) permanently removed from users.xlsx`,
            driver: removed
        });
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
});

// 2.1 Remove / Delete any user or passenger permanently from users.xlsx
app.delete('/api/admin/user', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'User email is required' });
    }
    try {
        const removed = deleteUserByEmail(email);
        res.json({
            message: `User account "${removed.name}" (${removed.email}) removed from users.xlsx`,
            user: removed
        });
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
});

// 3. Suspend or Reactivate a driver
app.put('/api/admin/driver/status', (req, res) => {
    const { email, status } = req.body;
    if (!email || !status) {
        return res.status(400).json({ message: 'Driver email and status (Active / Suspended) are required' });
    }
    try {
        const result = updateDriverStatus(email, status);
        res.json({
            message: `Driver status changed to "${status}" in users.xlsx`,
            driver: result
        });
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
});

// 4. Issue a formal warning and/or set maintenance request
app.post('/api/admin/driver/warn', (req, res) => {
    const { email, warning, maintenanceDue } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Driver email is required' });
    }
    try {
        const result = warnDriver(email, warning, maintenanceDue);
        res.json({
            message: `Notice & safety directives recorded for driver in users.xlsx`,
            driver: result
        });
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
});

// 4.1 Clear warning and mark maintenance completed
app.post('/api/admin/driver/clear-warning', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Driver email is required' });
    }
    try {
        const result = clearDriverWarning(email);
        res.json({
            message: `Warning resolved and maintenance scheduled forward for driver in users.xlsx`,
            driver: result
        });
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
});

// 5. Edit driver details (Name, Sex, Vehicle Type, Vehicle No, Aadhar, Phone, Rating, Status, Warning, Maintenance)
app.put('/api/admin/driver/edit', (req, res) => {
    const { email, name, sex, vehicleType, vehicleNo, aadhar, phone, rating, status, warning, maintenanceDue } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Driver email is required' });
    }
    try {
        const updated = adminUpdateDriver(email, {
            name,
            sex,
            vehicleType,
            vehicleNo,
            aadhar,
            phone,
            rating,
            status,
            warning,
            maintenanceDue
        });
        res.json({
            message: `Driver details updated successfully in users.xlsx!`,
            driver: updated
        });
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
});

// 6. Admin directly registers a new verified driver
app.post('/api/admin/driver/add', (req, res) => {
    const { name, email, password, sex, aadhar, vehicleType, vehicleNo, phone } = req.body;
    try {
        const newDriver = addUser({
            name,
            email,
            password: password || 'tempo123',
            role: 'Driver',
            sex,
            aadhar,
            vehicleType,
            vehicleNo,
            phone
        });
        res.status(201).json({
            message: `Driver account "${newDriver.Name}" registered and saved in users.xlsx!`,
            driver: newDriver
        });
    } catch (err) {
        const statusCode = err.statusCode || 400;
        res.status(statusCode).json({ message: err.message });
    }
});

// --- Route Management APIs (routes.xlsx) ---

// Get all transit routes
app.get('/api/routes', (req, res) => {
    try {
        const routes = getAllRoutes();
        res.json(routes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add route API
app.post(['/api/add-route', '/api/routes'], (req, res) => {
    const { source, destination, distance, duration, fare } = req.body;
    try {
        const route = addRoute({ source, destination, distance, duration, fare });
        res.status(201).json({ message: 'Route added successfully to routes.xlsx', route });
    } catch (err) {
        res.status(409).json({ message: err.message });
    }
});

// Delete route API
app.delete('/api/routes', (req, res) => {
    const { source, destination } = req.body;
    if (!source || !destination) {
        return res.status(400).json({ message: 'Source and destination are required' });
    }
    try {
        const removed = deleteRoute(source, destination);
        res.json({ message: `Route "${source} -> ${destination}" removed from routes.xlsx`, route: removed });
    } catch (err) {
        res.status(404).json({ message: err.message });
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
