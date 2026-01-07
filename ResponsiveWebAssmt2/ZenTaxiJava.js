/* Track markers and route objects */
let map;
let pickupMarker, destMarker;
let routingControl;
let taxiMarkers = [];

/* Define custom taxi car icon */
const taxiIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    iconSize: [35, 35],
    iconAnchor: [17, 17]
});

/* Create map and load tiles */
function initMap() {
    const mapDiv = document.getElementById('map');
    if (!mapDiv) return;

    map = L.map('map').setView([25.2048, 55.2708], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    setTimeout(() => {
        map.invalidateSize();
    }, 200);

    findMyLocation();
}

/* Convert text input into map coordinates */
async function searchLocation(type) {
    const query = document.getElementById(`${type}-input`).value;
    if (query.length < 3) return;

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data && data.length > 0) {
            const result = data[0];
            const lat = parseFloat(result.lat);
            const lon = parseFloat(result.lon);
            const name = result.display_name.split(',')[0];
            setLoc(lat, lon, type, name);
            map.setView([lat, lon], 15);
        } else {
            alert("Location not found.");
        }
    } catch (error) {
        console.error(error);
    }
}

/* Get coordinates from browser GPS */
function findMyLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                .then(res => res.json())
                .then(data => {
                    const name = data.display_name.split(',')[0] || "Current Location";
                    setLoc(lat, lng, 'pickup', name);
                    map.setView([lat, lng], 15);
                })
                .catch(() => {
                    setLoc(lat, lng, 'pickup', 'Current Location');
                    map.setView([lat, lng], 15);
                });
        });
    }
}

/* Exchange data between pickup and destination */
function swapLocations() {
    const pickupInput = document.getElementById('pickup-input');
    const destInput = document.getElementById('dest-input');

    const tempText = pickupInput.value;
    pickupInput.value = destInput.value;
    destInput.value = tempText;

    if (pickupMarker && destMarker) {
        const pickupCoords = pickupMarker.getLatLng();
        const destCoords = destMarker.getLatLng();

        setLoc(destCoords.lat, destCoords.lng, 'pickup', pickupInput.value);
        setLoc(pickupCoords.lat, pickupCoords.lng, 'dest', destInput.value);
        
        map.setView(destCoords, 14);
    }

    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
}

/* Show location dropdown */
function showSuggestions(type) {
    document.getElementById(`${type}-suggestions`).style.display = 'flex';
}

/* Hide location dropdown */
function hideSuggestions(type) {
    setTimeout(() => {
        const el = document.getElementById(`${type}-suggestions`);
        if (el) el.style.display = 'none';
    }, 200);
}

/* Place marker and update text */
function setLoc(lat, lng, type, name) {
    const coords = [lat, lng];
    if (type === 'pickup') {
        if (pickupMarker) map.removeLayer(pickupMarker);
        pickupMarker = L.marker(coords, {draggable: true}).addTo(map).bindPopup("Pickup: " + name).openPopup();
        document.getElementById('pickup-input').value = name;
    } else {
        if (destMarker) map.removeLayer(destMarker);
        destMarker = L.marker(coords, {draggable: true}).addTo(map).bindPopup("Destination: " + name).openPopup();
        document.getElementById('dest-input').value = name;
    }
    
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
}

/* Draw blue path on roads */
function bookRide() {
    if (!pickupMarker || !destMarker) {
        alert("Rizen, please select both Pickup and Destination first!");
        return;
    }

    const start = pickupMarker.getLatLng();
    const end = destMarker.getLatLng();

    if (routingControl) map.removeControl(routingControl);

    routingControl = L.Routing.control({
        waypoints: [L.latLng(start.lat, start.lng), L.latLng(end.lat, end.lng)],
        lineOptions: { styles: [{ color: '#007bff', weight: 6, opacity: 0.8 }] },
        createMarker: function() { return null; },
        addWaypoints: false,
        routeWhileDragging: false
    }).addTo(map);

    spawnTaxis(start.lat, start.lng);
}

/* Create random taxi markers */
function spawnTaxis(lat, lng) {
    taxiMarkers.forEach(t => map.removeLayer(t));
    taxiMarkers = [];
    for (let i = 0; i < 3; i++) {
        const offsetLat = (Math.random() - 0.5) * 0.01;
        const offsetLng = (Math.random() - 0.5) * 0.01;
        const taxi = L.marker([lat + offsetLat, lng + offsetLng], { icon: taxiIcon }).addTo(map);
        taxiMarkers.push(taxi);
    }
}

/* Show or hide pop-up windows */
function toggleModal(id) {
    const m = document.getElementById(id);
    const isOpen = m.style.display === 'block';
    closeModals();
    if (!isOpen) m.style.display = 'block';
}

/* Open specific form modal */
function openForm(id) {
    closeModals();
    document.getElementById(id).style.display = 'block';
}

/* Hide all active modals */
function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

/* Alert on form submission */
function handleSend(type) {
    alert(`${type} sent! Thank you, Rizen.`);
    closeModals();
}

/* Save profile to local storage */
function saveProfile() {
    const data = {
        name: document.getElementById('p-name').value,
        phone: document.getElementById('p-phone').value,
        email: document.getElementById('p-email').value
    };
    localStorage.setItem('zenProfile', JSON.stringify(data));
    alert("Profile Saved, Rizen!");
    closeModals();
}

/* Load profile from local storage */
function loadProfile() {
    const saved = localStorage.getItem('zenProfile');
    if (saved) {
        const p = JSON.parse(saved);
        document.getElementById('p-name').value = p.name || 'Rizen';
        document.getElementById('p-phone').value = p.phone || '';
        document.getElementById('p-email').value = p.email || '';
    }
}

/* Run startup functions */
window.onload = () => {
    initMap();
    loadProfile();
};
