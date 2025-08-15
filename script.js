function toggleStatus() {
  const btn = document.getElementById('toggleStatusBtn');
  const badge = document.getElementById('statusBadge');

  if (btn.textContent === 'Go Online') {
    btn.textContent = 'Go Offline';
    badge.textContent = 'Online';
    badge.className = 'online-badge';
  } 
  else {
    btn.textContent = 'Go Online';
    badge.textContent = 'Offline';
    badge.className = 'offline-badge';
  }
}

function toggleProfileSettings() {
  const settings = document.getElementById('profileSettings');
  settings.style.display = settings.style.display === 'block' ? 'none' : 'block';
}

function saveProfile() {
  const name = document.getElementById('name').value;
  const vehicleId = document.getElementById('vehicleId').value;

  if (name) document.getElementById('displayName').textContent = name;
  if (vehicleId) document.getElementById('displayVehicleId').textContent = vehicleId;

  alert('Profile updated successfully!');
}