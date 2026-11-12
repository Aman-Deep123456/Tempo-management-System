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
    const baseHeaders = [
      'Name',
      'Email',
      'Password',
      'Role',
      'Sex',
      'Aadhar',
      'VehicleType',
      'VehicleNo',
      'Phone',
      'Status',
      'Warning',
      'MaintenanceDue',
      'Rating',
      'Timestamp'
    ];
    const extraHeaders = [];
    users.forEach(user => {
      Object.keys(user || {}).forEach(key => {
        if (!baseHeaders.includes(key) && !extraHeaders.includes(key)) {
          extraHeaders.push(key);
        }
      });
    });

    const ws = XLSX.utils.json_to_sheet(users, {
      header: [...baseHeaders, ...extraHeaders]
    });
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

// ✅ Add new user to users.xlsx (used during signup and admin driver onboarding)
function addUser({ name, email, password, role, sex, aadhar, vehicleType, vehicleNo, phone }) {
  if (!name || !email || !password || !role) {
    throw new Error('All required fields must be filled');
  }

  const cleanEmail = email.trim();
  const cleanPassword = String(password).trim();
  const cleanName = name.trim();
  const cleanRole = role.trim();
  const cleanPhone = phone ? String(phone).trim() : '';

  let driverDetails = {};
  if (cleanRole.toLowerCase() === 'driver') {
    const cleanSex = sex ? String(sex).trim() : '';
    const cleanAadhar = aadhar ? String(aadhar).replace(/[\s-]/g, '').trim() : '';
    const cleanVehicleType = vehicleType ? String(vehicleType).trim() : '';
    const cleanVehicleNo = vehicleNo ? String(vehicleNo).trim().toUpperCase() : '';

    if (!cleanSex || !cleanAadhar || !cleanVehicleType || !cleanVehicleNo) {
      throw new Error('All driver details (Sex, Aadhar, Vehicle Type, Vehicle No) are required');
    }

    if (!/^\d{12}$/.test(cleanAadhar)) {
      throw new Error('Please enter a valid 12-digit Aadhar number');
    }

    driverDetails = {
      Sex: cleanSex,
      Aadhar: cleanAadhar,
      VehicleType: cleanVehicleType,
      VehicleNo: cleanVehicleNo,
      Phone: cleanPhone || `+91 98765 ${Math.floor(10000 + Math.random() * 90000)}`,
      Status: 'Active',
      Warning: '',
      MaintenanceDue: 'Dec 20, 2026',
      Rating: '5.0'
    };
  } else if (cleanPhone) {
    driverDetails = {
      Phone: cleanPhone
    };
  }

  const users = readUsersFromExcel();

  // Check for duplicate email (case-insensitive)
  const existingUser = users.find(
    u => u.Email && u.Email.toLowerCase() === cleanEmail.toLowerCase()
  );

  if (existingUser) {
    const err = new Error('An account with this email already exists');
    err.statusCode = 409;
    throw err;
  }

  const newUser = {
    Name: cleanName,
    Email: cleanEmail,
    Password: cleanPassword,
    Role: cleanRole,
    ...driverDetails,
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
  return users.map((u, index) => {
    const isDriver = u.Role && u.Role.toLowerCase() === 'driver';
    return {
      id: index + 1,
      name: u.Name || 'Unnamed User',
      email: u.Email || '',
      role: u.Role || 'Passenger',
      sex: u.Sex || (isDriver ? 'Male' : ''),
      aadhar: u.Aadhar || '',
      vehicleType: u.VehicleType || (isDriver ? 'Four Seater' : ''),
      vehicleNo: u.VehicleNo || (isDriver ? `UK-07-TA-${1000 + (index + 1) * 137}` : ''),
      status: u.Status || 'Active',
      warning: u.Warning || '',
      maintenanceDue: u.MaintenanceDue || 'Dec 20, 2026',
      rating: u.Rating || '4.9',
      phone: u.Phone || `+91 98765 ${String(10000 + (index * 733) % 90000)}`,
      timestamp: u.Timestamp || new Date().toISOString()
    };
  });
}

// ✅ Get all drivers specifically with complete verified details
function getAllDrivers() {
  const users = getAllUsers();
  return users.filter(u => u.role && u.role.toLowerCase() === 'driver');
}

// ✅ Delete user by email from users.xlsx
function deleteUserByEmail(email) {
  if (!email) throw new Error('Email is required to remove user');
  const cleanEmail = email.trim().toLowerCase();
  const users = readUsersFromExcel();
  const index = users.findIndex(u => u.Email && u.Email.toLowerCase() === cleanEmail);
  if (index === -1) {
    throw new Error('User account not found in users.xlsx');
  }
  const removed = users.splice(index, 1)[0];
  saveUsersToExcel(users);
  return { name: removed.Name, email: removed.Email, role: removed.Role };
}

// ✅ Update driver account status (Active <-> Suspended)
function updateDriverStatus(email, status) {
  if (!email || !status) throw new Error('Email and status are required');
  const cleanEmail = email.trim().toLowerCase();
  const cleanStatus = status.trim();
  const users = readUsersFromExcel();
  const user = users.find(u => u.Email && u.Email.toLowerCase() === cleanEmail);
  if (!user) throw new Error('Driver account not found in users.xlsx');
  user.Status = cleanStatus;
  saveUsersToExcel(users);
  return { name: user.Name, email: user.Email, status: user.Status };
}

// ✅ Issue warning or maintenance request to driver
function warnDriver(email, warningMessage, maintenanceDue) {
  if (!email) throw new Error('Driver email is required');
  const cleanEmail = email.trim().toLowerCase();
  const users = readUsersFromExcel();
  const user = users.find(u => u.Email && u.Email.toLowerCase() === cleanEmail);
  if (!user) throw new Error('Driver account not found in users.xlsx');
  user.Warning = warningMessage ? warningMessage.trim() : '';
  if (maintenanceDue && maintenanceDue.trim()) {
    user.MaintenanceDue = maintenanceDue.trim();
  }
  saveUsersToExcel(users);
  return {
    name: user.Name,
    email: user.Email,
    warning: user.Warning,
    maintenanceDue: user.MaintenanceDue || 'Dec 20, 2026'
  };
}

// ✅ Full admin update of driver profile in users.xlsx
function adminUpdateDriver(email, { name, sex, vehicleType, vehicleNo, aadhar, phone, rating, status, warning, maintenanceDue }) {
  if (!email) throw new Error('Driver email is required');
  const cleanEmail = email.trim().toLowerCase();
  const users = readUsersFromExcel();
  const user = users.find(u => u.Email && u.Email.toLowerCase() === cleanEmail);
  if (!user) throw new Error('Driver account not found in users.xlsx');

  if (name && name.trim()) user.Name = name.trim();
  if (sex && sex.trim()) user.Sex = sex.trim();
  if (vehicleType && vehicleType.trim()) user.VehicleType = vehicleType.trim();
  if (vehicleNo && vehicleNo.trim()) user.VehicleNo = vehicleNo.trim().toUpperCase();
  if (aadhar && aadhar.trim()) user.Aadhar = aadhar.trim();
  if (phone && phone.trim()) user.Phone = phone.trim();
  if (rating && String(rating).trim()) user.Rating = String(rating).trim();
  if (status && status.trim()) user.Status = status.trim();
  if (typeof warning === 'string') user.Warning = warning.trim();
  if (typeof maintenanceDue === 'string' && maintenanceDue.trim()) user.MaintenanceDue = maintenanceDue.trim();

  saveUsersToExcel(users);
  return {
    name: user.Name,
    email: user.Email,
    role: user.Role,
    sex: user.Sex || '',
    vehicleType: user.VehicleType || '',
    vehicleNo: user.VehicleNo || '',
    aadhar: user.Aadhar || '',
    phone: user.Phone || '',
    status: user.Status || 'Active',
    warning: user.Warning || '',
    maintenanceDue: user.MaintenanceDue || 'Dec 20, 2026',
    rating: user.Rating || '4.9'
  };
}

// ✅ Clear driver warning and mark maintenance inspection completed
function clearDriverWarning(email) {
  if (!email) throw new Error('Driver email is required');
  const cleanEmail = email.trim().toLowerCase();
  const users = readUsersFromExcel();
  const user = users.find(u => u.Email && u.Email.toLowerCase() === cleanEmail);
  if (!user) throw new Error('Driver account not found in users.xlsx');
  
  user.Warning = '';
  // Set next maintenance 3 months ahead
  const nextDate = new Date();
  nextDate.setMonth(nextDate.getMonth() + 3);
  const formatted = nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  user.MaintenanceDue = formatted;

  saveUsersToExcel(users);
  return {
    name: user.Name,
    email: user.Email,
    warning: '',
    maintenanceDue: user.MaintenanceDue,
    status: user.Status || 'Active'
  };
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

// ✅ Update driver profile details in users.xlsx
function updateDriverProfile({ email, name, sex, vehicleType, vehicleNo }) {
  if (!email) {
    throw new Error('Driver email is required');
  }

  const cleanEmail = email.trim().toLowerCase();
  const users = readUsersFromExcel();
  const user = users.find(
    u => u.Email && u.Email.toLowerCase() === cleanEmail && u.Role && u.Role.toLowerCase() === 'driver'
  );

  if (!user) {
    throw new Error('Driver account not found in users.xlsx');
  }

  if (name && name.trim()) user.Name = name.trim();
  if (sex && sex.trim()) user.Sex = sex.trim();
  if (vehicleType && vehicleType.trim()) user.VehicleType = vehicleType.trim();
  if (vehicleNo && vehicleNo.trim()) user.VehicleNo = vehicleNo.trim().toUpperCase();

  saveUsersToExcel(users);

  return {
    name: user.Name,
    email: user.Email,
    role: user.Role,
    sex: user.Sex || '',
    vehicleType: user.VehicleType || '',
    vehicleNo: user.VehicleNo || ''
  };
}

module.exports = {
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
  adminUpdateDriver,
  readUsersFromExcel,
  saveUsersToExcel
};
