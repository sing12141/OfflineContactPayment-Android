const KEY = 'offline_contact_payment_v2';

let contacts = [];
let headers = [];
let years = [];
let searchQuery = '';
let activeView = 'all';

const fileInput = document.getElementById('file');
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('searchBtn');
const list = document.getElementById('list');
const summary = document.getElementById('summary');
const stats = document.getElementById('stats');
const message = document.getElementById('message');
const clearBtn = document.getElementById('clearBtn');
const topBtn = document.getElementById('topBtn');

function saveData() {
    localStorage.setItem(KEY, JSON.stringify({
        contacts,
        headers,
        years
    }));
}

function loadData() {
    try {
        const raw = localStorage.getItem(KEY);

        if (!raw) {
            contacts = [];
            headers = [];
            years = [];
            return;
        }

        const data = JSON.parse(raw);

        contacts = Array.isArray(data.contacts) ? data.contacts : [];
        headers = Array.isArray(data.headers) ? data.headers : [];
        years = Array.isArray(data.years) ? data.years : [];

        normalizeData();
    } catch (e) {
        contacts = [];
        headers = [];
        years = [];
    }
}

function normalizeData() {
    contacts.forEach(c => {
        if (!Array.isArray(c.remarks)) {
            c.remarks = [];
        }

        if (typeof c.called !== 'boolean') {
            c.called = false;
        }

        if (typeof c.calledAt !== 'string') {
            c.calledAt = '';
        }

        /*
         * Convert old "Called At" values to DD/MM/YYYY
         * when possible.
         */
        if (c.calledAt) {
            c.calledAt = normalizeDate(c.calledAt);
        }
    });
}

function normalizeDate(value) {
    if (!value) return '';

    const text = String(value).trim();

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
        return text;
    }

    const d = new Date(text);

    if (isNaN(d.getTime())) {
        return text;
    }

    return formatDate(d);
}

function formatDate(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();

    return `${dd}/${mm}/${yyyy}`;
}

function isYear(h) {
    /*
     * Supports:
     * 2021
     * 2022
     * 2023
     *
     * and:
     * 2021-22
     * 2022-23
     * 2023-24
     */
    return /^(19|20)\d{2}(-\d{2})?$/.test(
        String(h).trim()
    );
}

function isBlank(value) {
    return value === undefined ||
           value === null ||
           String(value).trim() === '';
}

function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getYearStatus(contact, year) {
    const value = contact.payments
        ? contact.payments[year]
        : '';

    return isBlank(value) ? 'unpaid' : 'paid';
}

function getPaidYears(contact) {
    return years.filter(y => getYearStatus(contact, y) === 'paid');
}

function getUnpaidYears(contact) {
    return years.filter(y => getYearStatus(contact, y) === 'unpaid');
}

function isFullyPaid(contact) {
    if (!years.length) return false;

    return getUnpaidYears(contact).length === 0;
}

function hasUnpaid(contact) {
    return getUnpaidYears(contact).length > 0;
}

function getFilteredContacts() {
    let result = contacts;

    if (activeView === 'fullyPaid') {
        result = result.filter(isFullyPaid);
    }

    if (activeView === 'hasUnpaid') {
        result = result.filter(hasUnpaid);
    }

    if (activeView === 'notCalled') {
        result = result.filter(c => !c.called);
    }

    if (activeView === 'called') {
        result = result.filter(c => c.called);
    }

    if (searchQuery) {
        const q = searchQuery.toLowerCase();

        result = result.filter(c => {
            const name = String(c.name || '').toLowerCase();
            const phone = String(c.contact || '').toLowerCase();

            const remarks = Array.isArray(c.remarks)
                ? c.remarks.join(' ').toLowerCase()
                : '';

            return name.includes(q) ||
                   phone.includes(q) ||
                   remarks.includes(q);
        });
    }

    return result;
}

function renderStats() {
    const total = contacts.length;
    const fullyPaid = contacts.filter(isFullyPaid).length;
    const unpaid = contacts.filter(hasUnpaid).length;
    const notCalled = contacts.filter(c => !c.called).length;
    const called = contacts.filter(c => c.called).length;

    stats.innerHTML = `
        <button class="stat statBtn ${activeView === 'all' ? 'active' : ''}"
                onclick="setView('all')"
                type="button">
            <b>${total}</b>
            <span>TOTAL</span>
        </button>

        <button class="stat statBtn ok ${activeView === 'fullyPaid' ? 'active' : ''}"
                onclick="setView('fullyPaid')"
                type="button">
            <b>${fullyPaid}</b>
            <span>FULLY PAID</span>
        </button>

        <button class="stat statBtn bad ${activeView === 'hasUnpaid' ? 'active' : ''}"
                onclick="setView('hasUnpaid')"
                type="button">
            <b>${unpaid}</b>
            <span>HAS UNPAID</span>
        </button>

        <button class="stat statBtn ${activeView === 'notCalled' ? 'active' : ''}"
                onclick="setView('notCalled')"
                type="button">
            <b>${notCalled}</b>
            <span>NOT CALLED</span>
        </button>

        <button class="stat statBtn ${activeView === 'called' ? 'active' : ''}"
                onclick="setView('called')"
                type="button">
            <b>${called}</b>
            <span>TOTAL CALLED</span>
        </button>
    `;
}

function setView(view) {
    activeView = view;
    render();
}

function render() {
    renderStats();

    const filtered = getFilteredContacts();

    if (!contacts.length) {
        summary.innerHTML = '';
        list.innerHTML = `
            <div class="empty">
                No Data
            </div>
        `;
        return;
    }

    if (searchQuery && !filtered.length) {
        summary.innerHTML = '';
        list.innerHTML = `
            <div class="empty">
                No Data Match
            </div>
        `;
        return;
    }

    summary.innerHTML = `
        Showing ${filtered.length} of ${contacts.length} contacts
    `;

    list.innerHTML = filtered
        .map((contact) => {
            const index = contacts.indexOf(contact);
            return renderCard(contact, index);
        })
        .join('');
}

function renderCard(c, index) {
    const paidYears = getPaidYears(c);
    const unpaidYears = getUnpaidYears(c);

    const fullyPaid = years.length > 0 &&
                      unpaidYears.length === 0;

    const statusText = fullyPaid
        ? 'PAID'
        : `NOT PAID – ${unpaidYears.join(', ')}`;

    const statusClass = fullyPaid
        ? 'paid'
        : 'unpaid';

    let yearsHtml = '';

    if (years.length) {
        yearsHtml = `
            <div class="yearsTitle">
                PAYMENT STATUS
            </div>

            <div class="years">
                ${years.map(year => {
                    const paid =
                        getYearStatus(c, year) === 'paid';

                    return `
                        <span class="year ${paid ? 'yearPaid' : 'yearUnpaid'}">
                            ${esc(year)}
                        </span>
                    `;
                }).join('')}
            </div>

            <div class="yearSummary">
                ${
                    paidYears.length
                    ? `<div class="paidText">
                         Paid: ${paidYears.map(esc).join(', ')}
                       </div>`
                    : ''
                }

                ${
                    unpaidYears.length
                    ? `<div class="unpaidText">
                         Not Paid: ${unpaidYears.map(esc).join(', ')}
                       </div>`
                    : ''
                }
            </div>
        `;
    }

    let savedRemarksHtml = '';

    if (Array.isArray(c.remarks) && c.remarks.length) {
        savedRemarksHtml = `
            <div class="savedRemarks">
                <div class="savedRemarksTitle">
                    Saved Remarks
                </div>

                ${c.remarks.map((remark, n) => `
                    <div class="savedRemarkItem">
                        <span class="savedRemarkText">
                            <b>${n + 1}.</b> ${esc(remark)}
                        </span>

                        <div class="remarkActions">
                            <button
                                class="remarkEditBtn"
                                onclick="editRemark(${index},${n})"
                                type="button">
                                Edit
                            </button>

                            <button
                                class="remarkDeleteBtn"
                                onclick="deleteRemark(${index},${n})"
                                type="button">
                                Delete
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    const calledClass = c.called ? 'called' : '';

    return `
        <article class="card ${calledClass}">
            <div class="top">
                <div>
                    <div class="name">
                        ${esc(c.name)}
                    </div>

                    <div class="phone">
                        ${esc(c.contact)}
                    </div>
                </div>
            </div>

            <div class="status ${statusClass}">
                ${esc(statusText)}
            </div>

            ${yearsHtml}

            ${savedRemarksHtml}

            <label class="remarksLabel">
                Add Remark
            </label>

            <textarea
                class="remarks"
                id="remark_${index}"
                placeholder="Write a remark..."></textarea>

            <button
                class="saveRemark"
                onclick="saveRemark(${index})"
                type="button">
                Save Remark
            </button>

            ${
                c.calledAt
                ? `<div class="calledAt">
                     Called: ${esc(c.calledAt)}
                   </div>`
                : ''
            }

            <div class="actions">
                <button
                    class="call"
                    onclick="callContact(${index})"
                    type="button">
                    CALL
                </button>

                <button
                    onclick="markCalled(${index})"
                    type="button">
                    ${c.called ? 'CALLED' : 'NOT CALLED'}
                </button>
            </div>
        </article>
    `;
}

function saveRemark(index) {
    const input = document.getElementById(`remark_${index}`);

    if (!input) return;

    const text = input.value.trim();

    if (!text) {
        showMessage('Please enter a remark.');
        return;
    }

    if (!Array.isArray(contacts[index].remarks)) {
        contacts[index].remarks = [];
    }

    contacts[index].remarks.push(text);

    saveData();
    render();

    showMessage('Remark saved.');
}

function showRemarkModal(title, html) {
    const old = document.getElementById('remarkModal');

    if (old) {
        old.remove();
    }

    document.body.insertAdjacentHTML(
        'beforeend',
        `
        <div
            id="remarkModal"
            class="remarkModal"
            onclick="if(event.target===this) closeRemarkModal()">

            <div class="remarkModalBox">
                <div class="remarkModalTitle">
                    ${title}
                </div>

                ${html}
            </div>
        </div>
        `
    );
}

function closeRemarkModal() {
    const modal = document.getElementById('remarkModal');

    if (modal) {
        modal.remove();
    }
}

function editRemark(index, remarkIndex) {
    const contact = contacts[index];

    if (!contact ||
        !Array.isArray(contact.remarks) ||
        !contact.remarks[remarkIndex]) {
        return;
    }

    const current = contact.remarks[remarkIndex];

    showRemarkModal(
        'Edit Remark',
        `
        <textarea
            id="remarkModalInput"
            class="remarkModalInput"
            autofocus>${esc(current)}</textarea>

        <div class="remarkModalActions">
            <button
                class="remarkCancelBtn"
                onclick="closeRemarkModal()"
                type="button">
                Cancel
            </button>

            <button
                class="remarkSaveBtn"
                onclick="saveEditedRemark(${index},${remarkIndex})"
                type="button">
                Save
            </button>
        </div>
        `
    );

    setTimeout(() => {
        const input =
            document.getElementById('remarkModalInput');

        if (input) {
            input.focus();
            input.setSelectionRange(
                input.value.length,
                input.value.length
            );
        }
    }, 50);
}

function saveEditedRemark(index, remarkIndex) {
    const input =
        document.getElementById('remarkModalInput');

    if (!input) return;

    const text = input.value.trim();

    if (!text) {
        showMessage('Remark cannot be empty.');
        return;
    }

    if (!contacts[index] ||
        !Array.isArray(contacts[index].remarks)) {
        return;
    }

    contacts[index].remarks[remarkIndex] = text;

    saveData();
    closeRemarkModal();
    render();

    showMessage('Remark updated.');
}

function deleteRemark(index, remarkIndex) {
    const contact = contacts[index];

    if (!contact ||
        !Array.isArray(contact.remarks) ||
        !contact.remarks[remarkIndex]) {
        return;
    }

    const remark = contact.remarks[remarkIndex];

    showRemarkModal(
        'Delete Remark',
        `
        <div class="remarkDeleteText">
            Delete this remark?
        </div>

        <div class="remarkDeletePreview">
            ${esc(remark)}
        </div>

        <div class="remarkModalActions">
            <button
                class="remarkCancelBtn"
                onclick="closeRemarkModal()"
                type="button">
                Cancel
            </button>

            <button
                class="remarkDeleteConfirmBtn"
                onclick="confirmDeleteRemark(${index},${remarkIndex})"
                type="button">
                Delete
            </button>
        </div>
        `
    );
}

function confirmDeleteRemark(index, remarkIndex) {
    if (!contacts[index] ||
        !Array.isArray(contacts[index].remarks)) {
        return;
    }

    contacts[index].remarks.splice(remarkIndex, 1);

    saveData();
    closeRemarkModal();
    render();

    showMessage('Remark deleted.');
}

function callContact(index) {
    const contact = contacts[index];

    if (!contact) return;

    const phone = String(contact.contact || '').trim();

    if (!phone) {
        showMessage('No contact number available.');
        return;
    }

    /*
     * MainActivity handles tel: and opens
     * the Android dialer.
     */
    window.location.href =
        `tel:${encodeURIComponent(phone)}`;
}

function markCalled(index) {
    const contact = contacts[index];

    if (!contact) return;

    contact.called = true;
    contact.calledAt = formatDate(new Date());

    saveData();
    render();

    showMessage('Marked as called.');
}

function showMessage(text) {
    if (!message) return;

    message.textContent = text;
    message.classList.add('show');

    clearTimeout(showMessage.timer);

    showMessage.timer = setTimeout(() => {
        message.classList.remove('show');
    }, 2500);
}

function updateSearchButton() {
    const value = searchInput.value.trim();

    searchBtn.disabled = value.length === 0;
}

function performSearch() {
    const value = searchInput.value.trim();

    if (!value) {
        searchQuery = '';
        activeView = 'all';
        render();
        return;
    }

    /*
     * Numeric-only searches require the complete
     * 10-digit contact number.
     */
    if (/^\d+$/.test(value) && value.length !== 10) {
        showMessage(
            'Enter the complete 10-digit contact number.'
        );
        return;
    }

    searchQuery = value;
    render();
}

searchInput.addEventListener('input', () => {
    updateSearchButton();

    /*
     * Clearing the search immediately restores
     * all contacts.
     */
    if (!searchInput.value.trim()) {
        searchQuery = '';
        activeView = 'all';
        render();
    }
});

searchBtn.addEventListener('click', performSearch);

searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        performSearch();
    }
});

importBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];

    if (!file) return;

    try {
        const buffer = await file.arrayBuffer();

        /*
         * XLSX must be available in app.js / HTML.
         */
        const workbook = XLSX.read(buffer, {
            type: 'array'
        });

        const firstSheet =
            workbook.Sheets[workbook.SheetNames[0]];

        const rows = XLSX.utils.sheet_to_json(
            firstSheet,
            {
                defval: ''
            }
        );

        if (!rows.length) {
            showMessage('Excel file is empty.');
            return;
        }

        importRows(rows);

    } catch (error) {
        console.error(error);
        showMessage('Could not read the Excel file.');
    }

    fileInput.value = '';
});

function importRows(rows) {
    const originalHeaders = Object.keys(rows[0] || {});

    headers = originalHeaders.slice();

    years = headers
        .filter(isYear)
        .map(h => String(h).trim());

    /*
     * If duplicate year/session headers exist,
     * keep only one.
     */
    years = [...new Set(years)];

    contacts = rows.map(row => {
        const nameKey = findHeader(
            originalHeaders,
            [
                'Name',
                'name',
                'NAME'
            ]
        );

        const contactKey = findHeader(
            originalHeaders,
            [
                'Contact',
                'contact',
                'Phone',
                'phone',
                'Mobile',
                'mobile',
                'Phone Number',
                'Mobile Number'
            ]
        );

        const payments = {};

        years.forEach(year => {
            payments[year] = row[year] ?? '';
        });

        return {
            name: nameKey
                ? String(row[nameKey] ?? '').trim()
                : '',

            contact: contactKey
                ? String(row[contactKey] ?? '').trim()
                : '',

            payments,

            remarks: [],

            called: false,

            calledAt: ''
        };
    });

    /*
     * Remove completely empty rows.
     */
    contacts = contacts.filter(c =>
        c.name ||
        c.contact ||
        Object.values(c.payments).some(v => !isBlank(v))
    );

    searchQuery = '';
    activeView = 'all';

    saveData();
    render();

    showMessage(
        `${contacts.length} contacts imported successfully.`
    );
}

function findHeader(headerList, names) {
    for (const name of names) {
        const found = headerList.find(
            h => String(h).trim() === name
        );

        if (found) return found;
    }

    return null;
}

exportBtn.addEventListener('click', () => {
    if (!contacts.length) {
        showMessage('No data to export.');
        return;
    }

    exportExcel();
});

function exportExcel() {
    try {
        const rows = contacts.map(c => {
            const row = {};

            row['Name'] = c.name;
            row['Contact'] = c.contact;

            years.forEach(year => {
                row[year] =
                    c.payments
                        ? c.payments[year] ?? ''
                        : '';
            });

            row['Called'] = c.called
                ? 'Called'
                : 'Not Called';

            row['Called At'] = c.calledAt || '';

            if (Array.isArray(c.remarks)) {
                row['Remarks'] = c.remarks
                    .map((r, i) =>
                        `${i + 1}. ${r}`
                    )
                    .join('\n');
            } else {
                row['Remarks'] = '';
            }

            return row;
        });

        const worksheet =
            XLSX.utils.json_to_sheet(rows);

        /*
         * Make columns reasonably wide.
         */
        const widths = [
            {
                wch: 25
            },
            {
                wch: 16
            }
        ];

        years.forEach(() => {
            widths.push({
                wch: 14
            });
        });

        widths.push(
            {
                wch: 15
            },
            {
                wch: 15
            },
            {
                wch: 45
            }
        );

        worksheet['!cols'] = widths;

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            'Contacts'
        );

        const filename =
            `Contact_Payment_${formatFileDate()}.xlsx`;

        /*
         * AndroidBridge handles the actual
         * Android file save.
         */
        if (
            window.AndroidBridge &&
            typeof window.AndroidBridge.saveExcel === 'function'
        ) {
            const base64 =
                workbookToBase64(workbook);

            window.AndroidBridge.saveExcel(
                base64,
                filename
            );

            showMessage('Excel export started.');
        } else {
            /*
             * Browser fallback.
             */
            XLSX.writeFile(
                workbook,
                filename
            );

            showMessage('Excel exported.');
        }

    } catch (error) {
        console.error(error);
        showMessage('Could not export Excel.');
    }
}

function workbookToBase64(workbook) {
    const output = XLSX.write(
        workbook,
        {
            bookType: 'xlsx',
            type: 'base64'
        }
    );

    return output;
}

function formatFileDate() {
    const d = new Date();

    const yyyy = d.getFullYear();
    const mm = String(
        d.getMonth() + 1
    ).padStart(2, '0');

    const dd = String(
        d.getDate()
    ).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
}

clearBtn.addEventListener('click', () => {
    const ok = window.confirm(
        'Clear all saved data from this app?'
    );

    if (!ok) return;

    contacts = [];
    headers = [];
    years = [];
    searchQuery = '';
    activeView = 'all';

    localStorage.removeItem(KEY);

    searchInput.value = '';
    updateSearchButton();

    render();

    showMessage('All data cleared.');
});

function goTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

window.addEventListener('scroll', () => {
    if (!topBtn) return;

    if (window.scrollY > 350) {
        topBtn.classList.add('show');
    } else {
        topBtn.classList.remove('show');
    }
});

loadData();
updateSearchButton();
render();
