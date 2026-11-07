const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Excel database file path
const userFile = path.join(__dirname, 'users.xlsx');

// Helper: Read all users from users.xlsx
function readUsersFromExcel() {
  if (!fs.existsSync(userFile)) {
    return [];
  }
  try {
    const wb = XLSX.readFile(userFile);
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json(ws);
  } catch (err) {
    console.error('❌ Failed to read users.xlsx:', err.message);
    return [];
  }
}

// Helper: Save users array directly to users.xlsx
function saveUsersToExcel(users) {
  try {
    const ws = XLSX.utils.json_to_sheet(users);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, userFile);
    return true;
  } catch (err) {
    console.error('❌ Failed to write to users.xlsx:', err.message);
    throw new Error('Database write failure: ' + err.message);
  }
}

// Ensure default Admin account exists in users.xlsx
function ensureAdminAccount() {
  const users = readUsersFromExcel();
  let modified = false;

  const adminEmail = 'admin@temponavigator.in';
  const hasAdmin = users.some(u => u.Email && u.Email.toLowerCase() === adminEmail.toLowerCase());

  if (!hasAdmin) {
    users.push({
      Name: 'System Administrator',
      Email: adminEmail,
      Password: 'admin123',
      Role: 'Admin',
      Timestamp: new Date().toISOString()
    });
    modified = true;
  }

  if (modified) {
    saveUsersToExcel(users);
  }
}

// Initialize admin check on load
ensureAdminAccount();

// ✅ Add new user to users.xlsx (used during signup)
function addUser({ name, email, password, role }) {
  if (!name || !email || !password || !role) {
    throw new Error('All fields are required');
  }

  const cleanEmail = email.trim();
  const cleanPassword = String(password).trim();
  const cleanName = name.trim();
  const cleanRole = role.trim();

  const users = readUsersFromExcel();

  // Check for duplicate email (case-insensitive)
  const existingUser = users.find(
    u => u.Email && u.Email.toLowerCase() === cleanEmail.toLowerCase()
  );

  if (existingUser) {
    throw new Error('An account with this email already exists');
  }

  const newUser = {
    Name: cleanName,
    Email: cleanEmail,
    Password: cleanPassword,
    Role: cleanRole,
    Timestamp: new Date().toISOString()
  };

  users.push(newUser);
  saveUsersToExcel(users);

  return newUser;
}

// ✅ Authenticate user from users.xlsx on login
function authenticateUser(email, password, role) {
  if (!email || !password || !role) return null;

  const users = readUsersFromExcel();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = String(password).trim();
  const cleanRole = role.trim().toLowerCase();

  const user = users.find(
    u =>
      u.Email &&
      u.Email.toLowerCase() === cleanEmail &&
      String(u.Password).trim() === cleanPassword &&
      u.Role &&
      u.Role.toLowerCase() === cleanRole
  );

  return user || null;
}

// ✅ Find user by email in users.xlsx
function getUserByEmail(email) {
  if (!email) return null;
  const users = readUsersFromExcel();
  const cleanEmail = email.trim().toLowerCase();
  return users.find(u => u.Email && u.Email.toLowerCase() === cleanEmail) || null;
}

// ✅ Get all users from users.xlsx (for Admin dashboard, without passwords)
function getAllUsers() {
  const users = readUsersFromExcel();
  return users.map((u, index) => ({
    id: index + 1,
    name: u.Name,
    email: u.Email,
    role: u.Role,
    timestamp: u.Timestamp
  }));
}

// ✅ Update user password in users.xlsx
function updateUserPassword(email, newPassword) {
  if (!email || !newPassword) {
    throw new Error('Email and new password are required');
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = String(newPassword).trim();

  const users = readUsersFromExcel();
  const user = users.find(u => u.Email && u.Email.toLowerCase() === cleanEmail);

  if (!user) {
    throw new Error('No account found with this email');
  }

  user.Password = cleanPassword;
  saveUsersToExcel(users);

  return {
    Name: user.Name,
    Email: user.Email,
    Role: user.Role
  };
}

module.exports = {
  addUser,
  authenticateUser,
  getUserByEmail,
  getAllUsers,
  updateUserPassword,
  readUsersFromExcel,
  saveUsersToExcel
};
