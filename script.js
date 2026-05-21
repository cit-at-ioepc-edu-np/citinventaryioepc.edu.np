// Local Application Database Mock State
let currentRole = "admin";
let inventory = [
    { id: "1", name: "Cisco Switch 24-Port", serial: "CS-98321", totalReceived: 10, available: 7 },
    { id: "2", name: "CAT6 Cable Roll (100m)", serial: "CR-4402", totalReceived: 5, available: 5 }
];
let historyLogs = [
    { timestamp: "2026-05-21 10:14", item: "Cisco Switch 24-Port", action: "System Init", qty: 10, details: "Initial Warehouse Stock Setup" },
    { timestamp: "2026-05-21 11:30", item: "Cisco Switch 24-Port", action: "Dispatched", qty: 3, details: "Issued to Ram Prasad / Computer Lab A" }
];

// Handles switching user login target role
function selectRole(role) {
    currentRole = role;
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-role="${role}"]`).classList.add('active');
}

// User authorization processing 
function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value;

    if (currentRole === "admin") {
        if (username === "admin" && password === "admin") {
            launchSystem(username, "Administrator");
        } else {
            alert("Invalid Admin Credentials! (Hint: admin / admin123)");
        }
    } else {
        if (username === "staff" && password === "staff") {
            launchSystem(username, "Staff User");
        } else {
            alert("Invalid Staff Credentials! (Hint: staff / staff123)");
        }
    }
}

// Configures accessibility options across roles and enters dashboard UI 
function launchSystem(username, roleName) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainSystem').style.display = 'flex';
    
    document.getElementById('displayUserName').innerText = username;
    document.getElementById('displayUserRole').innerText = roleName;

    // Apply role view limitations
    const adminCells = document.querySelectorAll('.admin-only-cell');
    const navAddInventory = document.getElementById('nav-add-item');

    if (currentRole === 'user') {
        navAddInventory.style.display = 'none';
        adminCells.forEach(cell => cell.style.display = 'none');
    } else {
        navAddInventory.style.display = 'flex';
        adminCells.forEach(cell => cell.style.display = 'table-cell');
    }

    switchView('view-stock');
    renderStock();
    renderHistory();
    updateIssueOptions();
}

// System Views Tab control toggler
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    document.getElementById(viewId).classList.add('active');
    
    // Highlight sidebar active state matching selection
    const targetNavIndex = ['view-stock', 'view-add', 'view-issue', 'view-history'].indexOf(viewId);
    if(targetNavIndex !== -1) {
        document.querySelectorAll('.nav-menu .nav-item')[targetNavIndex].classList.add('active');
    }
}

// Render dynamic elements to Stock Table template
function renderStock() {
    const tbody = document.querySelector('#stockTable tbody');
    tbody.innerHTML = '';

    inventory.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td><code style="background:#e5e7eb; padding:2px 6px; border-radius:4px;">${item.serial || 'N/A'}</code></td>
            <td>${item.totalReceived}</td>
            <td><span style="color:${item.available > 0 ? 'var(--secondary)' : 'var(--danger)'}; font-weight:bold;">${item.available}</span></td>
            <td class="admin-only-cell" style="display: ${currentRole === 'admin' ? 'table-cell' : 'none'}">
                <button class="btn-delete" onclick="deleteItem('${item.id}')">Remove</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Render logging tracking data
function renderHistory() {
    const tbody = document.querySelector('#historyTable tbody');
    tbody.innerHTML = '';

    // Render upside down to track newly incoming activity entries first
    [...historyLogs].reverse().forEach(log => {
        const tr = document.createElement('tr');
        let actionBadgeColor = log.action === 'Dispatched' ? 'orange' : 'teal';
        if (log.action === 'Deleted') actionBadgeColor = 'red';

        tr.innerHTML = `
            <td style="font-size:13px; color:#6b7280;">${log.timestamp}</td>
            <td>${log.item}</td>
            <td><span style="background:${actionBadgeColor}; color:white; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold;">${log.action}</span></td>
            <td>${log.qty}</td>
            <td><small>${log.details}</small></td>
        `;
        tbody.appendChild(tr);
    });
}

// Population management routine for Dispatch selection components
function updateIssueOptions() {
    const select = document.getElementById('issueItemSelect');
    select.innerHTML = '<option value="" disabled selected>-- Choose Available Resource --</option>';

    inventory.forEach(item => {
        if(item.available > 0) {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.innerText = `${item.name} (Avail: ${item.available})`;
            select.appendChild(opt);
        }
    });
}

// Processing addition submission entries
function handleAddInventory(event) {
    event.preventDefault();
    const name = document.getElementById('itemName').value.trim();
    const serial = document.getElementById('itemSerial').value.trim();
    const qty = parseInt(document.getElementById('itemQty').value);

    // Verify if serial already exists to increment metrics rather than push duplicate profiles
    const preExistingItem = inventory.find(i => i.serial.toLowerCase() === serial.toLowerCase() && serial !== "");

    if (preExistingItem) {
        preExistingItem.totalReceived += qty;
        preExistingItem.available += qty;
    } else {
        inventory.push({
            id: Date.now().toString(),
            name: name,
            serial: serial,
            totalReceived: qty,
            available: qty
        });
    }

    logTransaction(name, "Restock Entry", qty, `Added items to warehouse database store.`);
    
    // Clear Input Profile Elements and re-draw matching states
    document.getElementById('storeForm').reset();
    renderStock();
    updateIssueOptions();
    switchView('view-stock');
}

// Process distribution tracking metrics
function handleIssueInventory(event) {
    event.preventDefault();
    const itemId = document.getElementById('issueItemSelect').value;
    const borrower = document.getElementById('borrowerName').value.trim();
    const targetDestination = document.getElementById('location').value.trim();
    const qty = parseInt(document.getElementById('issueQty').value);

    const targetItem = inventory.find(i => i.id === itemId);
    if (!targetItem) return;

    if (qty > targetItem.available) {
        alert(`Insufficient Stock Balance! Currently you only have (${targetItem.available}) item units available.`);
        return;
    }

    // Deduct stock levels safely
    targetItem.available -= qty;
    
    logTransaction(targetItem.name, "Dispatched", qty, `Issued to ${borrower} inside ${targetDestination}`);

    document.getElementById('issueForm').reset();
    renderStock();
    updateIssueOptions();
    switchView('view-stock');
}

// Target elements data removal logic structure safely managed
function deleteItem(id) {
    if(!confirm("Are you absolute sure you want to drop this inventory listing profile line entirely?")) return;
    
    const index = inventory.findIndex(i => i.id === id);
    if(index !== -1) {
        const item = inventory[index];
        logTransaction(item.name, "Deleted", item.available, "Inventory profile dropped clean via administration action privileges.");
        inventory.splice(index, 1);
        renderStock();
        updateIssueOptions();
    }
}

// Automated log management timestamp generation tracker
function logTransaction(item, action, qty, details) {
    const now = new Date();
    const timestampString = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    
    historyLogs.push({
        timestamp: timestampString,
        item: item,
        action: action,
        qty: qty,
        details: details
    });
    renderHistory();
}

// Session drop execution logs system back outward
function logout() {
    document.getElementById('usernameInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('mainSystem').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
}