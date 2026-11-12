const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const routeFile = path.join(__dirname, 'routes.xlsx');

const defaultRoutes = [
  { source: "Clock Tower", destination: "Rajpur Road", distance: 4, duration: "15 mins", fare: 50 },
  { source: "Clock Tower", destination: "Ballupur", distance: 3, duration: "12 mins", fare: 40 },
  { source: "Ballupur", destination: "Prem Nagar", distance: 5, duration: "18 mins", fare: 60 },
  { source: "Prem Nagar", destination: "ISBT", distance: 6, duration: "22 mins", fare: 70 },
  { source: "ISBT", destination: "Clock Tower", distance: 7, duration: "25 mins", fare: 80 },
  { source: "Dehradun", destination: "Clock Tower", distance: 2, duration: "8 mins", fare: 30 },
  { source: "Dehradun", destination: "Prem Nagar", distance: 3, duration: "12 mins", fare: 40 },
  { source: "Dehradun", destination: "Maldevta", distance: 8, duration: "30 mins", fare: 90 },
  { source: "Clock Tower", destination: "Paltan Bazaar", distance: 1, duration: "5 mins", fare: 20 },
  { source: "Paltan Bazaar", destination: "Saharanpur Chowk", distance: 2, duration: "8 mins", fare: 30 },
  { source: "Saharanpur Chowk", destination: "ISBT", distance: 3, duration: "12 mins", fare: 40 },
  { source: "Ballupur", destination: "Vasant Vihar", distance: 3, duration: "10 mins", fare: 40 },
  { source: "Vasant Vihar", destination: "Mussoorie Road", distance: 5, duration: "20 mins", fare: 60 },
  { source: "Rajpur Road", destination: "Mussoorie Road", distance: 6, duration: "22 mins", fare: 70 },
  { source: "Dharampur", destination: "ISBT", distance: 2, duration: "8 mins", fare: 30 },
  { source: "Dharampur", destination: "Paltan Bazaar", distance: 1.5, duration: "6 mins", fare: 25 },
  { source: "Dehradun", destination: "Paltan Bazaar", distance: 2, duration: "8 mins", fare: 30 },
  { source: "Dehradun", destination: "Vasant Vihar", distance: 4, duration: "15 mins", fare: 50 }
];

function readRoutesFromExcel() {
  if (!fs.existsSync(routeFile)) {
    saveRoutesToExcel(defaultRoutes.map(r => ({
      Source: r.source,
      Destination: r.destination,
      Distance: r.distance,
      Duration: r.duration,
      Fare: r.fare,
      Timestamp: new Date().toISOString()
    })));
  }
  try {
    const wb = XLSX.readFile(routeFile);
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json(ws);
  } catch (err) {
    console.error('❌ Failed to read routes.xlsx:', err.message);
    return [];
  }
}

function saveRoutesToExcel(routesList) {
  try {
    const ws = XLSX.utils.json_to_sheet(routesList);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Routes');
    XLSX.writeFile(wb, routeFile);
    return true;
  } catch (err) {
    console.error('❌ Failed to write to routes.xlsx:', err.message);
    throw new Error('Database write failure: ' + err.message);
  }
}

function getAllRoutes() {
  const routes = readRoutesFromExcel();
  return routes.map((r, index) => ({
    id: index + 1,
    source: r.Source || r.source || 'Unknown Hub',
    destination: r.Destination || r.destination || 'Unknown Hub',
    distance: parseFloat(r.Distance || r.distance || 0),
    duration: r.Duration || r.duration || `${Math.round((r.Distance || r.distance || 3) * 3.5)} mins`,
    fare: parseInt(r.Fare || r.fare || Math.round((r.Distance || r.distance || 3) * 10 + 10)),
    timestamp: r.Timestamp || new Date().toISOString()
  }));
}

function addRoute({ source, destination, distance, duration, fare }) {
  if (!source || !destination) {
    throw new Error('Source and destination stops are required');
  }
  const cleanSource = source.trim();
  const cleanDest = destination.trim();
  const cleanDist = parseFloat(distance) || 4.0;
  const cleanDur = duration ? duration.trim() : `${Math.round(cleanDist * 3.5)} mins`;
  const cleanFare = fare ? parseInt(fare) : Math.round(cleanDist * 10 + 10);

  const routes = readRoutesFromExcel();
  const exists = routes.find(
    r => (r.Source || '').toLowerCase() === cleanSource.toLowerCase() &&
         (r.Destination || '').toLowerCase() === cleanDest.toLowerCase()
  );
  if (exists) {
    throw new Error(`Route from "${cleanSource}" to "${cleanDest}" already exists`);
  }

  const newRoute = {
    Source: cleanSource,
    Destination: cleanDest,
    Distance: cleanDist,
    Duration: cleanDur,
    Fare: cleanFare,
    Timestamp: new Date().toISOString()
  };

  routes.push(newRoute);
  saveRoutesToExcel(routes);
  return newRoute;
}

function deleteRoute(source, destination) {
  if (!source || !destination) {
    throw new Error('Source and destination are required to remove route');
  }
  const cleanSource = source.trim().toLowerCase();
  const cleanDest = destination.trim().toLowerCase();

  const routes = readRoutesFromExcel();
  const index = routes.findIndex(
    r => (r.Source || '').toLowerCase() === cleanSource &&
         (r.Destination || '').toLowerCase() === cleanDest
  );

  if (index === -1) {
    throw new Error(`Route from "${source}" to "${destination}" not found`);
  }

  const removed = routes.splice(index, 1)[0];
  saveRoutesToExcel(routes);
  return removed;
}

function findRoute(source, destination) {
  const routes = readRoutesFromExcel();
  const cleanSource = (source || '').trim().toLowerCase();
  const cleanDest = (destination || '').trim().toLowerCase();
  return routes.find(
    r => (r.Source || '').toLowerCase() === cleanSource &&
         (r.Destination || '').toLowerCase() === cleanDest
  ) || null;
}

module.exports = {
  getAllRoutes,
  addRoute,
  deleteRoute,
  findRoute,
  readRoutesFromExcel
};
