const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const routeFile = path.join(__dirname, 'routes.xlsx');
let routes = [];

if (fs.existsSync(routeFile)) {
    const wb = XLSX.readFile(routeFile);
    const ws = wb.Sheets[wb.SheetNames[0]];
    routes = XLSX.utils.sheet_to_json(ws);
}

function saveRoutes() {
    const ws = XLSX.utils.json_to_sheet(routes);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Routes');
    XLSX.writeFile(wb, routeFile);
}

function addRoute({ source, destination, distance, duration }) {
    if (routes.find(r => r.Source === source && r.Destination === destination)) {
        throw new Error('Route already exists');
    }
    const route = {
        Source: source,
        Destination: destination,
        Distance: distance,
        Duration: duration,
        Timestamp: new Date().toISOString()
    };
    routes.push(route);
    saveRoutes();
    return route;
}

function findRoute(source, destination) {
    return routes.find(r => r.Source === source && r.Destination === destination);
}

module.exports = { addRoute, findRoute };