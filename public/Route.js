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

const toRad = deg => (deg * Math.PI) / 180;

function haversineDistance([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
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
places.forEach((p, i) => (placeIndices[p] = i));

const adjList = {};
places.forEach(p => (adjList[p] = []));
routes.forEach(({ source, destination, distance }) => {
  adjList[source].push({ node: destination, weight: distance });
  adjList[destination].push({ node: source, weight: distance });
});

function resolveCanonicalPlace(input) {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  return places.find(p => p.toLowerCase() === normalized) || null;
}

function findNearestHub(coords) {
  let nearest = places[0];
  let bestDist = Infinity;
  places.forEach(place => {
    const d = haversineDistance(coords, coordinates[place]);
    if (d < bestDist) {
      bestDist = d;
      nearest = place;
    }
  });
  return { hub: nearest, distanceKm: Number(bestDist.toFixed(2)) };
}

function getFloydPath(source, destination) {
  const n = places.length;
  const dist = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const next = Array.from({ length: n }, () => Array(n).fill(null));

  for (let i = 0; i < n; i++) dist[i][i] = 0;

  routes.forEach(({ source: src, destination: dst, distance }) => {
    const i = placeIndices[src];
    const j = placeIndices[dst];
    dist[i][j] = distance;
    dist[j][i] = distance;
    next[i][j] = j;
    next[j][i] = i;
  });

  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
          next[i][j] = next[i][k];
        }
      }
    }
  }

  const u = placeIndices[source];
  const v = placeIndices[destination];
  if (u === undefined || v === undefined || dist[u][v] === Infinity) return null;

  const pathIndices = [];
  let at = u;
  while (at !== v) {
    pathIndices.push(at);
    at = next[at][v];
  }
  pathIndices.push(v);

  return {
    path: pathIndices.map(i => places[i]),
    distance: Number(dist[u][v].toFixed(2))
  };
}

function getAStarPath(source, destination) {
  if (!coordinates[source] || !coordinates[destination]) return null;
  const openSet = new Set([source]);
  const cameFrom = {};
  const gScore = {};
  const fScore = {};

  places.forEach(p => {
    gScore[p] = Infinity;
    fScore[p] = Infinity;
  });

  gScore[source] = 0;
  fScore[source] = haversineDistance(coordinates[source], coordinates[destination]);

  while (openSet.size > 0) {
    let current = [...openSet].reduce((a, b) => (fScore[a] < fScore[b] ? a : b));
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
        const edge = routes.find(
          r =>
            (r.source === from && r.destination === to) ||
            (r.source === to && r.destination === from)
        );
        totalDist += edge ? edge.distance : 0;
      }

      return { path, distance: Number(totalDist.toFixed(2)) };
    }

    openSet.delete(current);
    for (const neighbor of adjList[current]) {
      const tentativeG = gScore[current] + neighbor.weight;
      if (tentativeG < gScore[neighbor.node]) {
        cameFrom[neighbor.node] = current;
        gScore[neighbor.node] = tentativeG;
        fScore[neighbor.node] =
          tentativeG + haversineDistance(coordinates[neighbor.node], coordinates[destination]);
        openSet.add(neighbor.node);
      }
    }
  }

  return null;
}

window.TempoRouter = {
  places,
  coordinates,
  priceMultiplier,
  haversineDistance,
  resolveCanonicalPlace,
  findNearestHub,
  getFloydPath,
  getAStarPath
};
