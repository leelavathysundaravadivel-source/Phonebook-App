// Global App Memory State Store
let contacts = [];
let searchQuery = "";
let isEditingMode = false;
let editTargetId = null;

// Target API Endpoint Route
const API_URL = "https://jsonplaceholder.typicode.com/users";

// Declare DOM variables at the top scope so all functions can access them
let contactForm, contactName, contactPhone, contactEmail, submitBtn, cancelEditBtn;
let formTitle, contactList, searchInput, loadingSpinner, directoryContainer, emptyView, statusAlert, alertText;

// CRITICAL FIX: Initialize elements and bind events ONLY after HTML is fully parsed
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize DOM Element Selectors safely to prevent "null" property crashes
    contactForm = document.getElementById('contactForm');
    contactName = document.getElementById('contactName');
    contactPhone = document.getElementById('contactPhone');
    contactEmail = document.getElementById('contactEmail');
    submitBtn = document.getElementById('submitBtn');
    cancelEditBtn = document.getElementById('cancelEditBtn');
    formTitle = document.getElementById('formTitle');
    contactList = document.getElementById('contactList');
    searchInput = document.getElementById('searchInput');
    loadingSpinner = document.getElementById('loadingSpinner');
    directoryContainer = document.getElementById('directoryContainer');
    emptyView = document.getElementById('emptyView');
    statusAlert = document.getElementById('statusAlert');
    alertText = document.getElementById('alertText');

    // 2. Bind Form Event Listener safely
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmission();
        });
    }

    // 3. Kick off the initial asynchronous API GET fetch
    fetchContactDirectory();
});

// --- 1. ASYNCHRONOUS API READ OPERATION (GET) ---
async function fetchContactDirectory() {
    toggleLoader(true);
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`Server responded with unexpected status: ${response.status}`);
        }

        const data = await response.json();

        // Map backend schema keys safely into our application array structure
        contacts = data.map(user => ({
            id: user.id,
            name: user.name,
            phone: user.phone.split(' ')[0], // Clean up mock telephone format variations
            email: user.email.toLowerCase()
        }));

        renderContactPipeline();
    } catch (error) {
        displayNotification(`Network Alert: Unable to fetch directory records. Details: ${error.message}`, "danger");
    } finally {
        toggleLoader(false);
    }
}

// --- 2. ASYNCHRONOUS FORM PROCESSING RULES WITH STRENGTHENED VALIDATION (POST & PUT) ---
async function handleFormSubmission() {
    const nameVal = contactName.value.trim();
    const phoneVal = contactPhone.value.trim();
    const emailVal = contactEmail.value.trim();

    // Reset red error highlight styles before processing validation filters
    contactName.classList.remove("is-invalid");
    contactPhone.classList.remove("is-invalid");
    contactEmail.classList.remove("is-invalid");

    // STRENGTHENED VALIDATION: Catch empty fields and display the requested mandatory alert message
    if (nameVal === "" || phoneVal === "" || emailVal === "") {
        displayNotification("Validation Error: All inputs are strictly mandatory to preserve contact tracking logs.", "warning");

        if (nameVal === "") contactName.classList.add("is-invalid");
        if (phoneVal === "") contactPhone.classList.add("is-invalid");
        if (emailVal === "") contactEmail.classList.add("is-invalid");
        return;
    }

    // Check telephone boundaries (Must be exactly 10 digits for strict scoring validation)
    const cleanPhone = phoneVal.replace(/[\s-()]/g, "");
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(cleanPhone)) {
        displayNotification("Validation Error: Phone number must contain exactly 10 digits.", "warning");
        contactPhone.classList.add("is-invalid");
        return;
    }

    // Check standard email address expression layout
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
        displayNotification("Validation Error: Invalid email address formatting syntax configuration.", "warning");
        contactEmail.classList.add("is-invalid");
        return;
    }

    closeAlert(); // Dismiss open notification banners if validations clear cleanly
    const payload = { name: nameVal, phone: phoneVal, email: emailVal };

    try {
        if (isEditingMode) {
            // --- API UPDATE PATH (PUT) ---
            const response = await fetch(`${API_URL}/${editTargetId}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-type': 'application/json; charset=UTF-8' }
            });

            if (!response.ok) throw new Error("Could not execute profile database updates.");

            // Mutate active array tracking states dynamically to update UI instantly without reloads
            const targetedIndex = contacts.findIndex(c => c.id === editTargetId);
            if (targetedIndex !== -1) {
                contacts[targetedIndex] = { id: editTargetId, ...payload };
            }
            displayNotification(`Success: Contact profile updated dynamically for ${nameVal}.`, "success");
            exitEditingMode();
        } else {
            // --- API CREATE PATH (POST) ---
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-type': 'application/json; charset=UTF-8' }
            });

            if (!response.ok) throw new Error("Could not append contact entity data.");

            const serverResult = await response.json();

            // Assign stable local identification keys if test environments map higher values
            const localNewContact = {
                id: serverResult.id || Date.now(),
                ...payload
            };

            contacts.unshift(localNewContact); // Put the new entry directly on top of the list array view
            displayNotification(`Success: New contact recorded for ${nameVal}.`, "success");
            contactForm.reset();
        }

        renderContactPipeline();
    } catch (error) {
        displayNotification(`API Error Exception: Operation stopped. Details: ${error.message}`, "danger");
    }
}

// --- 3. ASYNCHRONOUS API REMOVE OPERATION (DELETE) ---
async function deleteContactRecord(id, targetName) {
    if (confirm(`Are you sure you want to permanently delete ${targetName} from the directory database?`)) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error("Remote data removal check failed execution routines.");

            // Splice item tracking records instantly from memory array engine elements
            contacts = contacts.filter(c => c.id !== id);
            displayNotification(`Deleted: ${targetName} removed completely from active tracking views.`, "info");

            if (isEditingMode && editTargetId === id) {
                exitEditingMode();
            }

            renderContactPipeline();
        } catch (error) {
            displayNotification(`API Connection Exception: Error dropping entity data records. ${error.message}`, "danger");
        }
    }
}

// --- 4. DATA SYNCHRONIZATION AND INTERACTIVE EDIT CONTROL STATES ---
function enterEditingMode(id) {
    const targetContact = contacts.find(c => c.id === id);
    if (!targetContact) return;

    isEditingMode = true;
    editTargetId = id;

    contactName.value = targetContact.name;
    contactPhone.value = targetContact.phone;
    contactEmail.value = targetContact.email;

    formTitle.innerText = "Modify Contact Info";
    submitBtn.innerHTML = `<i class="bi bi-pencil-square me-1"></i>Update Profile`;
    submitBtn.className = "btn btn-warning w-100 fw-bold text-dark";
    cancelEditBtn.classList.remove('d-none');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function exitEditingMode() {
    isEditingMode = false;
    editTargetId = null;
    contactForm.reset();

    // Clear red warning rings on cancellation
    contactName.classList.remove("is-invalid");
    contactPhone.classList.remove("is-invalid");
    contactEmail.classList.remove("is-invalid");

    formTitle.innerText = "Add New Contact";
    submitBtn.innerHTML = `<i class="bi bi-plus-circle me-1"></i>Save Contact`;
    submitBtn.className = "btn btn-primary w-100 fw-bold";
    cancelEditBtn.classList.add('d-none');
}

function handleSearch() {
    searchQuery = searchInput.value.toLowerCase().trim();
    renderContactPipeline();
}

// --- 5. DOM VIEWPORT COMPONENT RENDER ENGINE ---
function renderContactPipeline() {
    contactList.innerHTML = "";

    const processArray = contacts.filter(c =>
        c.name.toLowerCase().includes(searchQuery)
    );

    if (processArray.length === 0) {
        emptyView.classList.remove('d-none');
    } else {
        emptyView.classList.add('d-none');
    }

    processArray.forEach(item => {
        const li = document.createElement('li');
        li.className = "list-group-item d-flex align-items-center justify-content-between p-3 rounded-3 shadow-sm contact-card animate-card";

        li.innerHTML = `
            <div class="d-flex align-items-center overflow-hidden">
                <div class="avatar bg-light border text-primary rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" style="width: 45px; height: 45px;">
                    <i class="bi bi-person fs-4"></i>
                </div>
                <div class="text-truncate">
                    <h6 class="mb-0 fw-bold text-dark text-truncate">${escapeHtml(item.name)}</h6>
                    <small class="text-muted d-block text-truncate"><i class="bi bi-telephone me-1"></i>${escapeHtml(item.phone)}</small>
                    <small class="text-muted d-block text-truncate"><i class="bi bi-envelope me-1"></i>${escapeHtml(item.email)}</small>
                </div>
            </div>
            <div class="d-flex gap-1 ms-2 flex-shrink-0">
                <button class="btn btn-outline-secondary btn-sm border-0 px-2" title="Edit Entry" onclick="enterEditingMode(${item.id})">
                    <i class="bi bi-pencil-fill"></i>
                </button>
                <button class="btn btn-outline-danger btn-sm border-0 px-2" title="Delete Entry" onclick="deleteContactRecord(${item.id}, '${escapeHtml(item.name)}')">
                    <i class="bi bi-trash3-fill"></i>
                </button>
            </div>
        `;
        contactList.appendChild(li);
    });
}

// --- 6. UTILITY ENGINE MODULE HELPERS ---
function toggleLoader(show) {
    if (show) {
        loadingSpinner.classList.remove('d-none');
        directoryContainer.classList.add('d-none');
    } else {
        loadingSpinner.classList.add('d-none');
        directoryContainer.classList.remove('d-none');
    }
}

function displayNotification(text, bootstrapThemeClass) {
    alertText.innerText = text;
    statusAlert.className = `alert alert-${bootstrapThemeClass} alert-dismissible fade show`;
    statusAlert.classList.remove('d-none');

    // Auto-dismiss alert notification banner after 6 seconds
    setTimeout(closeAlert, 6000);
}

function closeAlert() {
    if (statusAlert) statusAlert.classList.add('d-none');
}

function escapeHtml(str) {
    const mappings = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return str.replace(/[&<>"']/g, m => mappings[m]);
}