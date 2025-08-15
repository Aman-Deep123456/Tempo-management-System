const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Define Excel file path
const userFile = path.join(__dirname, 'users.xlsx');
let users = [];

// ✅ Load users from Excel if file exists
if (fs.existsSync(userFile)) {
    try {
        const wb = XLSX.readFile(userFile);
        const ws = wb.Sheets[wb.SheetNames[0]];
        users = XLSX.utils.sheet_to_json(ws);
    } catch (err) {
        console.error("❌ Failed to read users.xlsx:", err.message);
    }
}

// ✅ Save users array to Excel
function saveUsers() {
    try {
        const ws = XLSX.utils.json_to_sheet(users);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Users');
        XLSX.writeFile(wb, userFile);
    } catch (err) {
        console.error("❌ Failed to save users.xlsx:", err.message);
    }
}

// ✅ Add new user (used during signup)
function addUser({ name, email, password, role }) {
    if (!name || !email || !password || !role) {
        throw new Error('All fields are required');
    }

    // Check for duplicate email
    const existingUser = users.find(u => u.Email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
        throw new Error('Email already exists');
    }

    const user = {
        Name: name,
        Email: email,
        Password: password,
        Role: role,
        Timestamp: new Date().toISOString()
    };

    users.push(user);
    saveUsers();
    return user;
}

// ✅ Authenticate user on login
function authenticateUser(email, password, role) {
    return users.find(
        u =>
            u.Email.toLowerCase() === email.toLowerCase() &&
            u.Password === password &&
            u.Role.toLowerCase() === role.toLowerCase()
    );
}

// Export functions
module.exports = { addUser, authenticateUser };
