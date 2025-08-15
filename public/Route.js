const routes = [
  { source: "Clock Tower", destination: "Rajpur Road", distance: 4 },
  { source: "Clock Tower", destination: "Ballupur", distance: 3 },
  { source: "Ballupur", destination: "Prem Nagar", distance: 5 },
  { source: "Prem Nagar", destination: "ISBT", distance: 6 },
  { source: "ISBT", destination: "Clock Tower", distance: 7 },
  { source: "Dehradun", destination: "Clock Tower", distance: 2 },
  { source: "Dehradun", destination: "Prem Nagar", distance: 3 },
  { source: "Dehradun", destination: "Maldevta", distance: 8 },
  { source: "Clock Tower", destination: "Paltan Bazaar", distance: 1 },
  { source: "Paltan Bazaar", destination: "Saharanpur Chowk", distance: 2 },
  { source: "Saharanpur Chowk", destination: "ISBT", distance: 3 },
  { source: "Ballupur", destination: "Vasant Vihar", distance: 3 },
  { source: "Vasant Vihar", destination: "Mussoorie Road", distance: 5 },
  { source: "Rajpur Road", destination: "Mussoorie Road", distance: 6 },
  { source: "Dharampur", destination: "ISBT", distance: 2 },
  { source: "Dharampur", destination: "Paltan Bazaar", distance: 1.5 },
  { source: "Dehradun", destination: "Paltan Bazaar", distance: 2 },
  { source: "Dehradun", destination: "Vasant Vihar", distance: 4 }
];

const coordinates = {
  "Clock Tower": [30.3244, 78.0339],
  "Rajpur Road": [30.3683, 78.0800],
  "Ballupur": [30.3115, 77.9977],
  "Prem Nagar": [30.2912, 77.9562],
  "ISBT": [30.2823, 78.0138],
  "Dehradun": [30.3165, 78.0322],
  "Maldevta": [30.3957, 78.1319],
  "Paltan Bazaar": [30.3201, 78.0402],
  "Saharanpur Chowk": [30.3082, 78.0246],
  "Dharampur": [30.3012, 78.0270],
  "Vasant Vihar": [30.3247, 77.9935],
  "Mussoorie Road": [30.4032, 78.1031]
};

const priceMultiplier = {
  "Paltan Bazaar": 1.5,
  "Saharanpur Chowk": 1.2,
  "Vasant Vihar": 0.9,
  "Mussoorie Road": 1.3,
  "ISBT": 1.1,
  "Default": 1.0
};

const toRad = deg => deg * Math.PI / 180;
function haversineDistance([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const placesSet = new Set();
routes.forEach(r => {
  placesSet.add(r.source);
  placesSet.add(r.destination);
});
const places = Array.from(placesSet).sort();
const placeIndices = {};
places.forEach((p, i) => placeIndices[p] = i);

const adjList = {};
places.forEach(p => adjList[p] = []);
routes.forEach(({ source, destination, distance }) => {
  adjList[source].push({ node: destination, weight: distance });
  adjList[destination].push({ node: source, weight: distance });
});

document.addEventListener('DOMContentLoaded', () => {
  const datalist = document.getElementById('places');
  const sourceInput = document.getElementById('source');
  const destinationInput = document.getElementById('destination');
  const resultDiv = document.getElementById('route-result');
  const compareBtn = document.getElementById('compare-btn');

  places.forEach(place => {
    const option = document.createElement('option');
    option.value = place;
    datalist.appendChild(option);
  });

  compareBtn.addEventListener('click', () => {
    const source = sourceInput.value.trim();
    const destination = destinationInput.value.trim();

    if (!placesSet.has(source) || !placesSet.has(destination)) {
      resultDiv.innerHTML = `<p style="color:red;">Please enter valid source and destination.</p>`;
      return;
    }

    const fw = getFloydPath(source, destination);
    const astar = getAStarPath(source, destination);

    if (!fw || !astar) {
      resultDiv.innerHTML = `<p style="color:red;">No route found by one or both algorithms.</p>`;
      return;
    }

    const fwDiv = document.getElementById("floydwarshall-result");
    const astarDiv = document.getElementById("astar-result");

    const fwCost = Math.ceil(fw.distance * 3 * (priceMultiplier[fw.path[0]] || priceMultiplier["Default"]));
    const fwTime = Math.ceil(fw.distance * 2.5);

    const astarCost = Math.ceil(astar.distance * 3 * (priceMultiplier[astar.path[0]] || priceMultiplier["Default"]));
    const astarTime = Math.ceil(astar.distance * 2.5);

    fwDiv.innerHTML = `
      <h3>Floyd-Warshall</h3>
      <p><strong>Path:</strong> ${fw.path.join(" → ")}</p>
      <p><strong>Distance:</strong> ${fw.distance} km</p>
      <p><strong>Time:</strong> ~${fwTime} mins</p>
      <p><strong>Cost:</strong> ₹${fwCost}</p>
    `;

    astarDiv.innerHTML = `
      <h3>A* Algorithm</h3>
      <p><strong>Path:</strong> ${astar.path.join(" → ")}</p>
      <p><strong>Distance:</strong> ${astar.distance} km</p>
      <p><strong>Time:</strong> ~${astarTime} mins</p>
      <p><strong>Cost:</strong> ₹${astarCost}</p>
    `;

    resultDiv.innerHTML += `
      <h3>📊 Comparison:</h3>
      <p><strong>Cheaper:</strong> ${fwCost < astarCost ? "Floyd-Warshall" : (fwCost > astarCost ? "A*" : "Both Same")}</p>
      <p><strong>Faster:</strong> ${fwTime < astarTime ? "Floyd-Warshall" : (fwTime > astarTime ? "A*" : "Both Same")}</p>
      <button id="open-maps">Open in Google Maps</button>
    `;

    // Open in Google Maps
    document.getElementById("open-maps").addEventListener("click", () => {
      const path = fw.distance <= astar.distance ? fw.path : astar.path;
      const url = `https://www.google.com/maps/dir/${path.map(p => encodeURIComponent(p)).join('/')}`;
      window.open(url, "_blank");
    });
  });
});

function getFloydPath(source, destination) {
  const n = places.length;
  const dist = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const next = Array.from({ length: n }, () => Array(n).fill(null));

  for (let i = 0; i < n; i++) dist[i][i] = 0;

  routes.forEach(({ source, destination, distance }) => {
    const i = placeIndices[source];
    const j = placeIndices[destination];
    dist[i][j] = distance;
    dist[j][i] = distance;
    next[i][j] = j;
    next[j][i] = i;
  });

  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
          next[i][j] = next[i][k];
        }

  const u = placeIndices[source], v = placeIndices[destination];
  if (dist[u][v] === Infinity) return null;

  const pathIndices = [];
  let at = u;
  while (at !== v) {
    pathIndices.push(at);
    at = next[at][v];
  }
  pathIndices.push(v);

  return {
    path: pathIndices.map(i => places[i]),
    distance: dist[u][v]
  };
}

function getAStarPath(source, destination) {
  const openSet = new Set([source]);
  const cameFrom = {};
  const gScore = {}, fScore = {};

  places.forEach(p => {
    gScore[p] = Infinity;
    fScore[p] = Infinity;
  });

  gScore[source] = 0;
  fScore[source] = haversineDistance(coordinates[source], coordinates[destination]);

  while (openSet.size > 0) {
    let current = [...openSet].reduce((a, b) => fScore[a] < fScore[b] ? a : b);
    if (current === destination) {
      const path = [];
      let temp = current;
      while (temp) {
        path.unshift(temp);
        temp = cameFrom[temp];
      }

      let totalDist = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        const edge = routes.find(r =>
          (r.source === from && r.destination === to) ||
          (r.source === to && r.destination === from)
        );
        totalDist += edge?.distance || 0;
      }

      return { path, distance: totalDist };
    }

    openSet.delete(current);
    for (const neighbor of adjList[current]) {
      const tentativeG = gScore[current] + neighbor.weight;
      if (tentativeG < gScore[neighbor.node]) {
        cameFrom[neighbor.node] = current;
        gScore[neighbor.node] = tentativeG;
        fScore[neighbor.node] = tentativeG + haversineDistance(coordinates[neighbor.node], coordinates[destination]);
        openSet.add(neighbor.node);
      }
    }
  }

  return null;
}