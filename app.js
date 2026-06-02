let allUsers = JSON.parse(localStorage.getItem('lifeflow_users')) || {};
let currentUserName = localStorage.getItem('lifeflow_currentUser');
let isAmoled = localStorage.getItem('lifeflow_amoled') === 'true';
let appData = currentUserName ? allUsers[currentUserName] : null;

// EMOJI PIN LOGIC & SECURE AUTH
let authMode = 'login';
let selectedEmojis = [];
let stagedBackup = null; 
const emojiList = ['🍎', '🍕', '🚀', '⚽', '🎸', '🐶', '🚗', '📱', '💡', '🔑', '⭐', '🌈', '🔥', '💎', '🎨'];

window.switchAuthTab = function(mode) {
    authMode = mode;
    stagedBackup = null; 
    document.getElementById('user-name').disabled = false;
    document.getElementById('user-name').value = '';
    clearEmojis();
    
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-register').classList.remove('active');
    document.getElementById('register-fields').classList.remove('active');
    
    let inputArea = document.getElementById('auth-input-area');
    let backupArea = document.getElementById('backup-load-area');
    
    if (mode === 'login') {
        document.getElementById('tab-login').classList.add('active');
        inputArea.style.display = 'block';
        backupArea.style.display = 'block'; 
        document.getElementById('backup-text').innerText = "Restoring from a backup file?";
    } else {
        document.getElementById('tab-register').classList.add('active');
        document.getElementById('register-fields').classList.add('active');
        inputArea.style.display = 'block';
        backupArea.style.display = 'none'; 
    }
}

window.importAuthJSON = function(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let importedData = JSON.parse(e.target.result);
            if (!importedData.name || !importedData.password) return showToast("Invalid backup file format!");
            stagedBackup = importedData; 
            document.getElementById('user-name').value = importedData.name;
            document.getElementById('user-name').disabled = true; 
            document.getElementById('backup-load-area').style.display = 'none';
            showToast("Backup staged. Enter your 4-Emoji PIN to restore.");
        } catch (err) { showToast("Error reading file."); }
        event.target.value = ''; 
    };
    reader.readAsText(file);
}

function renderEmojiGrid() {
    const grid = document.getElementById('emoji-grid');
    grid.innerHTML = emojiList.map(e => `<button class="emoji-btn" onclick="addEmoji('${e}')">${e}</button>`).join('');
}

window.addEmoji = function(emoji) {
    if (selectedEmojis.length < 4) {
        selectedEmojis.push(emoji);
        document.getElementById('emoji-display').innerText = selectedEmojis.join('');
    }
}
window.clearEmojis = function() { selectedEmojis = []; document.getElementById('emoji-display').innerText = ''; }

function saveData() {
    if (currentUserName && appData) {
        allUsers[currentUserName] = appData;
        localStorage.setItem('lifeflow_users', JSON.stringify(allUsers));
    }
}

function applyTheme(gender) {
    document.body.classList.remove('theme-pink', 'theme-amoled');
    if (gender === 'female') document.body.classList.add('theme-pink');
    if (isAmoled) document.body.classList.add('theme-amoled');
}

window.toggleDarkMode = function() {
    isAmoled = !isAmoled;
    localStorage.setItem('lifeflow_amoled', isAmoled);
    applyTheme(appData.gender);
}

// Ensure Daily Resets & Save Historical Data for Graphs
function checkDailyResets() {
    let today = new Date().toDateString();
    
    // Water Reset & History
    if (!appData.water) appData.water = { goal: 3000, current: 0, lastDate: today, history: [] };
    if (!appData.water.history) appData.water.history = [];
    if (appData.water.lastDate !== today) {
        appData.water.history.push({ date: appData.water.lastDate, amount: appData.water.current });
        if (appData.water.history.length > 7) appData.water.history.shift(); // Keep last 7 days
        appData.water.current = 0;
        appData.water.lastDate = today;
    }
    
    // Supplement Reset
    if (!appData.supplements) appData.supplements = [];
    appData.supplements.forEach(sup => {
        if (sup.lastTaken !== today) sup.takenToday = false;
    });
    saveData();
}

document.addEventListener('DOMContentLoaded', () => {
    renderEmojiGrid();
    switchAuthTab('login'); 
    
    if (appData) { 
        checkDailyResets();
        applyTheme(appData.gender); 
        loadDashboard(); 
    }

    let selectedGender = null;
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
            selectedGender = e.currentTarget.dataset.gender;
            applyTheme(selectedGender); 
        });
    });

    document.getElementById('login-btn').addEventListener('click', () => {
        let nameInput = document.getElementById('user-name').value.trim();
        if (!nameInput) return showToast("Please enter a username!");
        if (selectedEmojis.length !== 4) return showToast("Please select exactly 4 emojis for your PIN!");
        
        let nameKey = nameInput.toLowerCase();
        let passKey = selectedEmojis.join('');

        if (authMode === 'login') {
            if (stagedBackup) {
                if (stagedBackup.password !== passKey) {
                    clearEmojis(); return showToast("❌ Wrong PIN for this backup file!");
                }
                allUsers[nameKey] = stagedBackup;
                appData = stagedBackup;
                stagedBackup = null; 
                document.getElementById('user-name').disabled = false;
                showToast(`Backup restored! Welcome back, ${appData.name}!`);
            } 
            else {
                if (!allUsers[nameKey]) return showToast("User not found. Please load a backup file.");
                if (allUsers[nameKey].password !== passKey) {
                    clearEmojis(); return showToast("❌ Wrong Emoji PIN!");
                }
                appData = allUsers[nameKey];
                showToast(`Welcome back, ${appData.name}!`);
            }
        } else {
            if (allUsers[nameKey]) return showToast("Username already exists. Please log in.");
            if (!selectedGender) return showToast("Please select a gender for your new account!");
            
            let defaultHabits = selectedGender === 'male' 
                ? [{ id: 1, name: 'Lift Heavy', streak: 0, lastDone: null }, { id: 2, name: 'Read 10 Pages', streak: 0, lastDone: null }]
                : [{ id: 1, name: 'Morning Skincare', streak: 0, lastDone: null }, { id: 2, name: 'Stretch', streak: 0, lastDone: null }];

            appData = {
                name: nameInput, password: passKey, joinDate: new Date().toLocaleDateString(),
                gender: selectedGender, reminders: [], workouts: [], diet: [],
                health: { periodLength: 5, cycleLength: 28, cycleHistory: [], logs: {} },
                habits: defaultHabits, gallery: [], diary: [],
                water: { goal: 3000, current: 0, lastDate: new Date().toDateString(), history: [] },
                supplements: []
            };
            allUsers[nameKey] = appData;
            showToast(`Account created for ${nameInput}!`);
        }
        
        currentUserName = nameKey;
        localStorage.setItem('lifeflow_currentUser', nameKey);
        checkDailyResets();
        saveData(); applyTheme(appData.gender); loadDashboard();
    });
});

window.logout = function() {
    if (appData) { exportJSON(); showToast("Backup downloading..."); }
    currentUserName = null; appData = null; localStorage.removeItem('lifeflow_currentUser');
    setTimeout(() => { location.reload(); }, 1200);
}

// ==========================================
// DASHBOARD & WATER WIDGET
// ==========================================
function loadDashboard() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('hidden');
    document.getElementById('greeting-text').innerText = `Hi, ${appData.name}`;
    
    // Water Widget Logic
    let goal = appData.water.goal || 3000;
    let waterPercent = (appData.water.current / goal) * 100;
    let isExceeded = waterPercent >= 100;
    let barWidth = Math.min(waterPercent, 100);
    let barColor = isExceeded ? '#10b981' : '#0ea5e9'; // Green if achieved
    let statusText = isExceeded ? `🏆 Goal Achieved! (${appData.water.current}ml)` : `${appData.water.current} / ${goal} ml`;

    let waterWidget = `
        <div class="glass-card slide-up" style="margin-bottom: 20px; text-align: center;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="color:var(--text-main); margin:0;">💧 Daily Hydration</h3>
                <span style="font-size:0.9rem; font-weight:bold; color:${barColor};">${statusText}</span>
            </div>
            <div class="macro-bar" style="height: 12px; margin-bottom: 15px; background: rgba(0,0,0,0.1);">
                <div class="macro-fill" style="width:${barWidth}%; background:${barColor};"></div>
            </div>
            <button class="btn" style="width:auto; padding: 8px 20px;" onclick="addWater(250)">+ 250ml Glass</button>
            <button class="btn" style="width:auto; padding: 8px 20px; background: #0ea5e9;" onclick="addWater(500)">+ 500ml Bottle</button>
        </div>
    `;
    
    let menuItems = [
        { title: '📈 Lifetime Stats', id: 'stats' },
        { title: '💊 Supplements', id: 'supplements' },
        { title: '🔥 Habits & Streaks', id: 'habits' },
        { title: '💪 Workout Analytics', id: 'workout' },
        { title: '🥗 Macro Diet', id: 'diet' },
        { title: '📓 My Diary', id: 'diary' }, 
        { title: '📸 Progress Gallery', id: 'gallery' },
        { title: '⏰ Reminders', id: 'reminders' }
    ];
    if (appData.gender === 'female') menuItems.splice(3, 0, { title: '🌸 Health Tracker', id: 'female-health' });
    menuItems.push({ title: '⚙️ Settings', id: 'settings' });

    document.getElementById('menu-grid').innerHTML = waterWidget + `<div class="dashboard-grid">` + menuItems.map(item => 
        `<div class="menu-card slide-up" onclick="openDetail('${item.id}')">${item.title}</div>`
    ).join('') + `</div>`;
}

window.addWater = function(amount) {
    appData.water.current += amount;
    saveData(); loadDashboard(); showToast(`Added ${amount}ml of water!`);
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div'); toast.className = 'toast'; toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
}

function openModal(html) { document.getElementById('modal-overlay').classList.remove('hidden'); document.getElementById('modal-content').innerHTML = html; }
window.closeModal = function() { document.getElementById('modal-overlay').classList.add('hidden'); }

window.openDetail = function(section) {
    document.getElementById('dashboard-screen').classList.add('hidden');
    document.getElementById('detail-screen').classList.remove('hidden');
    
    const title = document.getElementById('detail-title');
    const content = document.getElementById('detail-content');
    
    const bgImages = {
        'settings': 'url("./assets/images/setting.jpg")',
        'reminders': 'url("./assets/images/reminder.jpg")',
        'workout': 'url("./assets/images/workout.jpg")',
        'diet': 'url("./assets/images/food.jpg")',
        'female-health': 'url("./assets/images/pink.avif")',
        'diary': 'url("./assets/images/diary.jpg")',
        'supplements': 'url("./assets/images/food.jpg")'
    };

    if (bgImages[section]) {
        document.body.style.backgroundImage = `linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.85)), ${bgImages[section]}`;
        document.body.style.backgroundSize = '100vw 100vh'; 
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
    } else { document.body.style.backgroundImage = ''; }

    if (section === 'stats') { title.innerText = 'Lifetime Stats'; renderStats(content); }
    if (section === 'supplements') { title.innerText = 'Supplements'; renderSupplements(content); }
    if (section === 'settings') { title.innerText = 'Settings'; renderSettings(content); }
    if (section === 'reminders') { title.innerText = 'Reminders'; renderReminders(content); }
    if (section === 'workout') { title.innerText = 'Workout Analytics'; renderWorkout(content); }
    if (section === 'diet') { title.innerText = 'Macro Diet Plan'; renderDiet(content); }
    if (section === 'female-health') { title.innerText = 'Health Tracker'; renderFemaleHealth(content); }
    if (section === 'habits') { title.innerText = 'Daily Habits'; renderHabits(content); }
    if (section === 'gallery') { title.innerText = 'Progress Gallery'; renderGallery(content); }
    if (section === 'diary') { title.innerText = 'My Diary'; renderDiary(content); }
}

window.closeDetail = function() {
    document.getElementById('detail-screen').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('hidden');
    document.body.style.backgroundImage = '';
    loadDashboard(); 
}

// CSS GRAPH GENERATOR UTILITY
function buildBarGraph(dataArray, color) {
    if(!dataArray || dataArray.length === 0) return `<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">Not enough data yet. Keep tracking!</div>`;
    let max = Math.max(...dataArray, 1);
    let bars = dataArray.map(val => {
        let height = (val / max) * 100;
        return `<div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100px;">
            <div style="width:80%; max-width:20px; height:${height}%; background:${color}; border-radius:3px 3px 0 0; transition:0.3s;"></div>
        </div>`;
    }).join('');
    return `<div style="display:flex; width:100%; height:100px; gap:4px; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:5px;">${bars}</div>`;
}

// ==========================================
// MODULE: LIFETIME STATS & GRAPHS
// ==========================================
window.renderStats = function(container) {
    if(!appData.joinDate) { appData.joinDate = new Date().toLocaleDateString(); saveData(); }
    
    let totalWorkouts = appData.workouts.length;
    let totalVolume = appData.workouts.reduce((sum, w) => sum + (w.sets * w.reps * w.weight), 0);
    let highestStreak = appData.habits.reduce((max, h) => h.streak > max ? h.streak : max, 0);

    // Extracting Data for Graphs (Last 7 Days)
    let waterHistoryData = (appData.water.history || []).map(h => h.amount);
    
    // Diet Data Grouping
    let dietData = [];
    if(appData.diet && appData.diet.length > 0) {
        let last7Days = [...new Array(7)].map((_,i) => { let d = new Date(); d.setDate(d.getDate() - i); return d.toDateString(); }).reverse();
        dietData = last7Days.map(date => {
            let dayCals = appData.diet.filter(d => d.date === date).reduce((sum, d) => sum + d.cal, 0);
            return dayCals;
        });
    }

    // Health Flow Data
    let flowData = [];
    if(appData.health && appData.health.logs) {
        let last7Days = [...new Array(7)].map((_,i) => { let d = new Date(); d.setDate(d.getDate() - i); return d.toDateString(); }).reverse();
        const flowValues = { 'Heavy': 3, 'Medium': 2, 'Light': 1, 'Spotting': 0.5, 'None': 0 };
        flowData = last7Days.map(date => {
            let log = appData.health.logs[date];
            return log ? (flowValues[log.flow] || 0) : 0;
        });
    }

    let html = `
        <div class="glass-card slide-up" style="text-align:center; padding: 30px 20px; margin-bottom:20px;">
            <div style="font-size: 4rem; margin-bottom: 10px;">${appData.gender === 'male' ? '👨' : '👩'}</div>
            <h2 style="color:var(--text-main); margin-bottom: 5px;">${appData.name}'s Journey</h2>
            <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom: 25px;">Tracking since: ${appData.joinDate}</p>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div style="background:rgba(0,0,0,0.05); padding:15px; border-radius:10px;">
                    <strong style="color:var(--primary); font-size:1.5rem;">${totalWorkouts}</strong><br>
                    <small style="color:var(--text-muted)">Workouts Logged</small>
                </div>
                <div style="background:rgba(0,0,0,0.05); padding:15px; border-radius:10px;">
                    <strong style="color:var(--primary); font-size:1.5rem;">${totalVolume.toLocaleString()} kg</strong><br>
                    <small style="color:var(--text-muted)">Volume Lifted</small>
                </div>
                <div style="background:rgba(0,0,0,0.05); padding:15px; border-radius:10px;">
                    <strong style="color:var(--primary); font-size:1.5rem;">${highestStreak} 🔥</strong><br>
                    <small style="color:var(--text-muted)">Highest Habit Streak</small>
                </div>
                <div style="background:rgba(0,0,0,0.05); padding:15px; border-radius:10px;">
                    <strong style="color:var(--primary); font-size:1.5rem;">${appData.diary.length}</strong><br>
                    <small style="color:var(--text-muted)">Diary Entries</small>
                </div>
            </div>
        </div>

        <div class="glass-card slide-up" style="margin-bottom:20px;">
            <h4 style="color:var(--text-main); margin-bottom:10px;">💧 Hydration (Last 7 Days)</h4>
            ${buildBarGraph(waterHistoryData, '#0ea5e9')}
        </div>

        <div class="glass-card slide-up" style="margin-bottom:20px;">
            <h4 style="color:var(--text-main); margin-bottom:10px;">🥗 Calories (Last 7 Days)</h4>
            ${buildBarGraph(dietData, '#10b981')}
        </div>
    `;

    if (appData.gender === 'female') {
        html += `
        <div class="glass-card slide-up" style="margin-bottom:20px;">
            <h4 style="color:var(--text-main); margin-bottom:10px;">🩸 Flow Intensity (Last 7 Days)</h4>
            ${buildBarGraph(flowData, '#ec4899')}
        </div>`;
    }

    container.innerHTML = html;
}

// ==========================================
// MODULE: SUPPLEMENTS
// ==========================================
window.renderSupplements = function(container) {
    if (!appData.supplements) { appData.supplements = []; saveData(); }
    
    let html = `
        <div style="text-align:center; margin-bottom: 20px;">
            <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:15px;">Track daily vitamins, collagen, and workout shakes.</p>
            <button class="btn" onclick="showAddSupplementModal()">+ Add Supplement</button>
        </div>
    `;

    if (appData.supplements.length === 0) {
        html += `<p style="text-align:center; color:var(--text-muted); margin-top:20px;">No supplements added yet.</p>`;
    } else {
        appData.supplements.forEach(sup => {
            html += `
            <div class="list-item slide-up">
                <div>
                    <strong style="color:var(--text-main);">${sup.name}</strong><br>
                    <small style="color:var(--text-muted)">${sup.dose} • At ${sup.time}</small><br>
                    <small style="color:var(--primary); font-size:0.75rem;">Started: ${sup.startDate || 'Unknown'}</small>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    ${sup.takenToday 
                        ? `<span style="color:#10b981; font-weight:bold; font-size:0.9rem;">✔ Taken</span>` 
                        : `<button class="btn" style="width:auto; margin:0; padding:5px 15px;" onclick="takeSupplement(${sup.id})">Take</button>`}
                    <button class="icon-btn" style="color:var(--danger);" onclick="deleteSupplement(${sup.id})">✖</button>
                </div>
            </div>`;
        });
    }
    container.innerHTML = html;
}

window.showAddSupplementModal = function() {
    openModal(`
        <h3 style="color:var(--text-main); margin-bottom:15px;">New Supplement</h3>
        <input type="text" id="sup-name" placeholder="Name (e.g., Whey Protein, Vitamin D)">
        <input type="text" id="sup-dose" placeholder="Dosage (e.g., 1 Scoop, 2 Pills)">
        <label style="display:block; text-align:left; color:var(--text-main); font-size:0.85rem; margin-bottom:5px;">Daily Reminder Time:</label>
        <input type="time" id="sup-time">
        <button class="btn" onclick="saveSupplement()">Save Supplement</button>
        <button class="btn btn-danger" onclick="closeModal()">Cancel</button>
    `);
}

window.saveSupplement = function() {
    const name = document.getElementById('sup-name').value, dose = document.getElementById('sup-dose').value, time = document.getElementById('sup-time').value;
    if (!name || !time) return showToast("Name and Time are required!");
    if (!appData.supplements) appData.supplements = [];
    appData.supplements.push({ id: Date.now(), name, dose, time, startDate: new Date().toLocaleDateString(), takenToday: false, lastTaken: null, triggeredToday: false });
    saveData(); closeModal(); openDetail('supplements'); showToast("Supplement Saved!");
}
window.takeSupplement = function(id) {
    let sup = appData.supplements.find(s => s.id === id);
    if(sup) { sup.takenToday = true; sup.lastTaken = new Date().toDateString(); saveData(); openDetail('supplements'); showToast(`${sup.name} logged!`); }
}
window.deleteSupplement = function(id) { appData.supplements = appData.supplements.filter(s => s.id !== id); saveData(); openDetail('supplements'); }

// ==========================================
// MODULE: SETTINGS (SECTIONED)
// ==========================================
window.renderSettings = function(container) {
    let goal = appData.water.goal || 3000;
    container.innerHTML = `
        <div class="glass-card slide-up" style="margin-bottom:20px;">
            <h3 style="color:var(--text-main); border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:10px;">Security & Profile</h3>
            <p style="color:var(--text-muted); font-size:0.9rem; margin:10px 0;">Update your 4-Emoji Login PIN.</p>
            <div class="emoji-display" id="update-emoji-display" style="min-height:35px; background:rgba(0,0,0,0.05); margin-bottom:10px;"></div>
            <div class="emoji-grid" id="update-emoji-grid">${emojiList.map(e => `<button class="emoji-btn" onclick="addUpdateEmoji('${e}')">${e}</button>`).join('')}</div>
            <div style="display:flex; gap:10px; margin-top:10px;">
                <button class="btn" style="background:var(--text-muted);" onclick="clearUpdateEmojis()">Clear</button>
                <button class="btn" onclick="updatePassword()">Save New PIN</button>
            </div>
        </div>

        <div class="glass-card slide-up" style="margin-bottom:20px;">
            <h3 style="color:var(--text-main); border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:10px;">Hydration Goal</h3>
            <p style="color:var(--text-muted); font-size:0.9rem; margin:10px 0;">Set your daily water intake target (in ml).</p>
            <input type="number" id="water-goal-input" value="${goal}">
            <button class="btn" onclick="updateWaterGoal()">Save Goal</button>
        </div>

        <div class="glass-card slide-up" style="margin-bottom:20px;">
            <h3 style="color:var(--text-main); border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:10px;">Data Management</h3>
            <button class="btn" style="margin-top:15px;" onclick="exportJSON()">💾 Download Backup</button>
            <button class="btn" style="background:#10b981;" onclick="exportCSV()">📊 Export Workouts to CSV</button>
            
            <h4 style="text-align:left; color:var(--danger); margin-top:35px; margin-bottom:10px;">Danger Zone</h4>
            <button class="btn btn-danger" onclick="deleteAccount()">Delete Account</button>
        </div>
    `;
    window.updateEmojis = [];
}
window.updateWaterGoal = function() {
    let newGoal = parseInt(document.getElementById('water-goal-input').value);
    if(newGoal > 0) { appData.water.goal = newGoal; saveData(); showToast("Hydration target updated!"); }
}
window.addUpdateEmoji = function(emoji) { if (window.updateEmojis.length < 4) { window.updateEmojis.push(emoji); document.getElementById('update-emoji-display').innerText = window.updateEmojis.join(''); } }
window.clearUpdateEmojis = function() { window.updateEmojis = []; document.getElementById('update-emoji-display').innerText = ''; }
window.updatePassword = function() { if (window.updateEmojis.length !== 4) return showToast("Select exactly 4 emojis."); appData.password = window.updateEmojis.join(''); saveData(); clearUpdateEmojis(); showToast("PIN updated successfully!"); }
window.deleteAccount = function() { if(confirm("Are you sure? This deletes your profile permanently.")) { delete allUsers[currentUserName]; localStorage.setItem('lifeflow_users', JSON.stringify(allUsers)); currentUserName = null; appData = null; localStorage.removeItem('lifeflow_currentUser'); showToast("Account deleted."); setTimeout(() => { location.reload(); }, 1500); } }
window.exportJSON = function() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData));
    const a = document.createElement('a'); a.href = dataStr; 
    a.download = `${appData.name}_lifeflow_backup_${timestamp}.json`;
    document.body.appendChild(a); a.click(); a.remove(); 
}
window.exportCSV = function() {
    let csv = "Exercise,Sets,Reps,Weight,Volume,Est. 1RM\n";
    if (appData.workouts) { appData.workouts.forEach(w => { csv += `${w.name},${w.sets},${w.reps},${w.weight},${w.sets*w.reps*w.weight},${Math.round(w.weight*(1+(w.reps/30)))}\n`; }); }
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv); a.download = `${appData.name}_workouts.csv`;
    document.body.appendChild(a); a.click(); a.remove(); showToast("CSV Exported!");
}
/* --- MY DIARY --- */
window.renderDiary = function(container) {
    if (!appData.diary) { appData.diary = []; saveData(); }
    let html = `<div style="text-align:center; margin-bottom: 20px;"><button class="btn" onclick="showAddDiaryModal()">✏️ Write New Entry</button></div>`;
    if (appData.diary.length === 0) { html += `<p style="text-align:center; color:var(--text-muted); margin-top:20px;">Your diary is empty. Start writing!</p>`; } 
    else {
        let sortedDiary = [...appData.diary].sort((a, b) => b.id - a.id);
        sortedDiary.forEach(entry => {
            html += `<div class="glass-card slide-up" style="margin-bottom: 15px; padding: 20px; background: rgba(255,255,255,0.85); color: #1e293b; box-shadow: 0 4px 10px rgba(0,0,0,0.1);"><div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 10px; margin-bottom: 15px;"><small style="color: #64748b; font-family: monospace; font-size: 0.85rem; line-height: 1.4;">🗓️ ${entry.date}<br>🕒 ${entry.time}</small><strong style="text-align: right; font-size: 1.1rem; max-width: 60%;">${entry.title}</strong></div><p style="white-space: pre-wrap; font-size: 0.95rem; line-height: 1.6; margin-bottom: 15px;">${entry.text}</p><div style="text-align: right;"><button class="icon-btn" style="color: #ef4444; font-size: 0.9rem; padding: 5px;" onclick="deleteDiary(${entry.id})">✖ Delete</button></div></div>`;
        });
    }
    container.innerHTML = html;
}
window.showAddDiaryModal = function() { openModal(`<h3 style="color:var(--text-main); margin-bottom: 15px;">New Diary Entry</h3><input type="text" id="diary-title" placeholder="Title (e.g., A great day!)"><textarea id="diary-text" rows="6" style="width: 100%; padding: 12px; margin-bottom: 15px; border-radius: 8px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.9); resize: vertical; outline: none; font-family: inherit;" placeholder="Dear Diary..."></textarea><button class="btn" onclick="saveDiary()">Save Entry</button><button class="btn btn-danger" onclick="closeModal()">Cancel</button>`); }
window.saveDiary = function() {
    const title = document.getElementById('diary-title').value || 'Untitled Entry', text = document.getElementById('diary-text').value;
    if (!text) return showToast("Diary entry cannot be empty!");
    const now = new Date(); if (!appData.diary) appData.diary = [];
    appData.diary.push({ id: Date.now(), title, text, date: now.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }), time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }); saveData(); closeModal(); openDetail('diary'); showToast("Entry Saved!");
}
window.deleteDiary = function(id) { if(confirm("Delete this diary entry?")) { appData.diary = appData.diary.filter(d => d.id !== id); saveData(); openDetail('diary'); showToast("Deleted."); } }

/* --- REMINDERS --- */
window.renderReminders = function(container) {
    if (!appData.reminders) { appData.reminders = []; saveData(); }
    let html = `<div class="glass-card slide-up" style="margin-bottom: 20px; text-align: center;"><h3 style="color:var(--text-main); margin-bottom:10px;">⏰ Your Reminders</h3><p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:15px;">Set daily alerts. We will chime when it's time!</p><button class="btn" onclick="showAddReminderModal()">+ Add New Reminder</button></div>`;
    if (appData.reminders.length === 0) { html += `<p style="text-align:center; color:var(--text-muted); margin-top:20px;">No reminders set yet.</p>`; } 
    else { appData.reminders.forEach(rem => { html += `<div class="list-item slide-up"><div><strong style="color:var(--text-main);">${rem.title}</strong><br><small style="color:var(--text-muted)">${rem.date ? rem.date : 'Every Day'} at ${rem.time}</small></div><button class="icon-btn" style="color:var(--danger)" onclick="deleteReminder(${rem.id})">✖</button></div>`; }); }
    container.innerHTML = html;
}
window.showAddReminderModal = function() { openModal(`<h3 style="color:var(--text-main);">New Reminder</h3><br><input type="text" id="rem-title" placeholder="E.g., Drink Water"><input type="date" id="rem-date"><input type="time" id="rem-time"><button class="btn" onclick="saveReminder()">Save</button><button class="btn btn-danger" onclick="closeModal()">Cancel</button>`); }
window.saveReminder = function() {
    const title = document.getElementById('rem-title').value, date = document.getElementById('rem-date').value, time = document.getElementById('rem-time').value;
    if (!title || !time) return showToast("Title and Time required!");
    if (!appData.reminders) appData.reminders = [];
    appData.reminders.push({ id: Date.now(), title, date, time, triggeredToday: false }); saveData(); closeModal(); openDetail('reminders'); showToast("Reminder Saved!");
}
window.deleteReminder = function(id) { appData.reminders = appData.reminders.filter(r => r.id !== id); saveData(); openDetail('reminders'); }

/* --- HABITS & STREAKS --- */
window.renderHabits = function(container) {
    if (!appData.habits) { appData.habits = []; saveData(); } 
    let today = new Date().toDateString();
    let html = `<button class="btn" onclick="showAddHabitModal()">+ New Habit</button>`;
    if (appData.habits.length === 0) { html += `<p style="text-align:center; color:var(--text-muted); margin-top:20px;">No habits added yet.</p>`; }
    appData.habits.forEach(h => {
        let isDone = h.lastDone === today;
        html += `<div class="list-item slide-up"><div><strong style="color:var(--text-main);">${h.name}</strong><br><span class="streak-fire">🔥 ${h.streak} Day Streak</span></div>${isDone ? `<span style="color:green; font-weight:bold;">✔ Done</span>` : `<button class="btn" style="width:auto; margin:0;" onclick="completeHabit(${h.id})">Complete</button>`}</div>`;
    });
    container.innerHTML = html;
}
window.showAddHabitModal = function() { openModal(`<h3 style="color:var(--text-main);">New Habit</h3><br><input type="text" id="habit-name" placeholder="E.g., Stretch for 10m"><button class="btn" onclick="saveHabit()">Save</button><button class="btn btn-danger" onclick="closeModal()">Cancel</button>`); }
window.saveHabit = function() {
    let name = document.getElementById('habit-name').value; if(!name) return;
    if (!appData.habits) appData.habits = [];
    appData.habits.push({ id: Date.now(), name, streak: 0, lastDone: null }); saveData(); closeModal(); openDetail('habits');
}
window.completeHabit = function(id) {
    if (!appData.habits) return; let habit = appData.habits.find(h => h.id === id);
    if(habit) { habit.streak++; habit.lastDone = new Date().toDateString(); saveData(); openDetail('habits'); showToast("Habit Completed! 🔥"); }
}

/* --- WORKOUT ANALYTICS --- */
window.renderWorkout = function(container) {
    if (!appData.workouts) { appData.workouts = []; saveData(); }
    let html = `<button class="btn" onclick="showAddWorkoutModal()">+ Log Exercise</button>`;
    appData.workouts.forEach(w => {
        let volume = w.sets * w.reps * w.weight; let oneRM = Math.round(w.weight * (1 + (w.reps / 30))); 
        html += `<div class="list-item slide-up" style="flex-direction:column; align-items:flex-start;"><div style="display:flex; justify-content:space-between; width:100%;"><strong style="color:var(--text-main);">${w.name}</strong><button class="icon-btn" style="color:var(--danger)" onclick="deleteWorkout(${w.id})">✖</button></div><small style="color:var(--text-muted);">${w.sets} Sets x ${w.reps} Reps @ ${w.weight}kg</small><div style="margin-top:8px; padding:8px; background:rgba(0,0,0,0.05); border-radius:5px; width:100%; display:flex; justify-content:space-between; font-size:0.85rem;"><span>Total Volume: <strong>${volume}kg</strong></span><span>Est. 1RM: <strong style="color:var(--primary);">${oneRM}kg</strong></span></div></div>`;
    });
    container.innerHTML = html;
}
window.showAddWorkoutModal = function() { openModal(`<h3 style="color:var(--text-main);">Log Lift</h3><br><input type="text" id="wo-name" placeholder="Exercise (e.g., Deadlift)"><div style="display:flex; gap:10px;"><input type="number" id="wo-sets" placeholder="Sets"><input type="number" id="wo-reps" placeholder="Reps"></div><input type="number" id="wo-weight" placeholder="Weight (kg)"><button class="btn" onclick="saveWorkout()">Save</button><button class="btn btn-danger" onclick="closeModal()">Cancel</button>`); }
window.saveWorkout = function() {
    const name = document.getElementById('wo-name').value, sets = document.getElementById('wo-sets').value, reps = document.getElementById('wo-reps').value, weight = document.getElementById('wo-weight').value;
    if (!name || !weight) return showToast("Name and Weight required!");
    if (!appData.workouts) appData.workouts = [];
    appData.workouts.push({ id: Date.now(), name, sets: Number(sets), reps: Number(reps), weight: Number(weight) }); saveData(); closeModal(); openDetail('workout');
}
window.deleteWorkout = function(id) { appData.workouts = appData.workouts.filter(w => w.id !== id); saveData(); openDetail('workout'); }

/* --- MACRO DIET TRACKER --- */
window.renderDiet = function(container) {
    if (!appData.diet) { appData.diet = []; saveData(); }
    let totals = { cal:0, pro:0, carb:0, fat:0 };
    // Only tally today's calories for the top bar
    let todayStr = new Date().toDateString();
    appData.diet.filter(d => d.date === todayStr).forEach(d => { totals.cal += d.cal; totals.pro += d.pro; totals.carb += d.carb; totals.fat += d.fat; });
    let goals = { cal: 2200, pro: 150, carb: 200, fat: 70 };

    let html = `
        <div class="glass-card slide-up" style="margin-bottom:20px;">
            <h3 style="text-align:center; margin-bottom:15px; color:var(--text-main);">Today's Macros: ${totals.cal} / ${goals.cal} kcal</h3>
            <div class="macro-container"><div class="macro-label"><span>Protein</span><span>${totals.pro}g / ${goals.pro}g</span></div><div class="macro-bar"><div class="macro-fill fill-pro" style="width:${Math.min((totals.pro/goals.pro)*100, 100)}%"></div></div></div>
            <div class="macro-container"><div class="macro-label"><span>Carbs</span><span>${totals.carb}g / ${goals.carb}g</span></div><div class="macro-bar"><div class="macro-fill fill-carb" style="width:${Math.min((totals.carb/goals.carb)*100, 100)}%"></div></div></div>
            <div class="macro-container"><div class="macro-label"><span>Fats</span><span>${totals.fat}g / ${goals.fat}g</span></div><div class="macro-bar"><div class="macro-fill fill-fat" style="width:${Math.min((totals.fat/goals.fat)*100, 100)}%"></div></div></div>
        </div>
        <button class="btn" onclick="showAddDietModal()">+ Log Food</button>
    `;
    // Only show today's foods in the list to keep it clean
    appData.diet.filter(d => d.date === todayStr).forEach(d => { html += `<div class="list-item slide-up"><div><strong style="color:var(--text-main);">${d.food}</strong><br><small style="color:var(--text-muted);">${d.cal}cals | ${d.pro}P | ${d.carb}C | ${d.fat}F</small></div><button class="icon-btn" style="color:var(--danger)" onclick="deleteDiet(${d.id})">✖</button></div>`; });
    container.innerHTML = html;
}
window.showAddDietModal = function() { openModal(`<h3 style="color:var(--text-main);">Log Food</h3><br><input type="text" id="diet-food" placeholder="Food Name"><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;"><input type="number" id="diet-cals" placeholder="Calories"><input type="number" id="diet-pro" placeholder="Protein (g)"><input type="number" id="diet-carb" placeholder="Carbs (g)"><input type="number" id="diet-fat" placeholder="Fats (g)"></div><button class="btn" onclick="saveDiet()">Save</button><button class="btn btn-danger" onclick="closeModal()">Cancel</button>`); }
window.saveDiet = function() {
    const food = document.getElementById('diet-food').value, cal = Number(document.getElementById('diet-cals').value), pro = Number(document.getElementById('diet-pro').value), carb = Number(document.getElementById('diet-carb').value), fat = Number(document.getElementById('diet-fat').value);
    if (!food) return showToast("Food required!");
    if (!appData.diet) appData.diet = [];
    appData.diet.push({ id: Date.now(), food, cal, pro, carb, fat, date: new Date().toDateString() }); saveData(); closeModal(); openDetail('diet');
}
window.deleteDiet = function(id) { appData.diet = appData.diet.filter(d => d.id !== id); saveData(); openDetail('diet'); }

/* --- PHOTO PROGRESS GALLERY --- */
window.renderGallery = function(container) {
    if (!appData.gallery) { appData.gallery = []; saveData(); } 
    let html = `<p style="color:var(--text-muted); font-size:0.85rem; text-align:center; margin-bottom:15px;">Photos are saved securely to your browser storage.</p><input type="file" id="image-upload" accept="image/*" style="display:none;" onchange="handleImageUpload(event)"><button class="btn" onclick="document.getElementById('image-upload').click()">+ Upload Progress Photo</button><div class="gallery-grid">`;
    appData.gallery.forEach((img, i) => { html += `<div class="slide-up" style="position:relative;"><img src="${img.data}" class="gallery-item"><button onclick="deletePhoto(${i})" style="position:absolute; top:5px; right:5px; background:red; color:white; border:none; border-radius:50%; width:25px; height:25px; cursor:pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">✖</button><div style="text-align:center; font-size:0.8rem; color:var(--text-main); font-weight:bold; margin-top:5px; background:rgba(255,255,255,0.5); border-radius:5px;">${img.date}</div></div>`; });
    container.innerHTML = html + `</div>`;
}
window.handleImageUpload = function(event) {
    const file = event.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = function(e) {
        if (!appData.gallery) appData.gallery = [];
        try { appData.gallery.push({ data: e.target.result, date: new Date().toLocaleDateString() }); saveData(); openDetail('gallery'); } 
        catch (err) { showToast("Storage Full! Delete old photos."); }
    }; reader.readAsDataURL(file);
}
window.deletePhoto = function(index) { if (!appData.gallery) return; appData.gallery.splice(index, 1); saveData(); openDetail('gallery'); }

// ==========================================
// FEMALE HEALTH TRACKER (WITH LOGGING)
// ==========================================
let currentCalDate = new Date();

window.renderFemaleHealth = function(container) {
    if (!appData.health) appData.health = { periodLength: 5, cycleLength: 28, cycleHistory: [], logs: {} };
    if (!appData.health.logs) appData.health.logs = {};
    if (appData.health.lastStartDate && !appData.health.cycleHistory) { appData.health.cycleHistory = [appData.health.lastStartDate]; delete appData.health.lastStartDate; saveData(); }
    let h = appData.health; if (!h.cycleHistory) h.cycleHistory = [];

    let html = `
        <div class="glass-card slide-up" style="margin-bottom: 20px;">
            <h3 style="margin-bottom:5px; color:var(--text-main); text-align:center;">🌸 Cycle Tracker</h3>
            <p style="text-align:center; color:var(--text-muted); font-size:0.85rem; margin-bottom:15px;">Click to log your start date. Click a nearby date to move it, or twice to delete.</p>
    `;
    html += generateCycleCalendar(h);

    if (h.cycleHistory.length > 0) {
        let latestLog = h.cycleHistory[h.cycleHistory.length - 1]; let start = new Date(latestLog);
        let currentOvulation = new Date(start); currentOvulation.setDate(currentOvulation.getDate() + parseInt(h.cycleLength) - 14);
        let nextPeriod = new Date(start); nextPeriod.setDate(start.getDate() + parseInt(h.cycleLength)); 
        html += `<div style="margin-top: 20px; padding: 15px; background: rgba(236, 72, 153, 0.1); border-radius: 10px; border-left: 4px solid var(--primary);"><p style="margin-bottom:8px;">✨ <strong>Current Ovulation:</strong> <br><span style="color:var(--text-muted)">${currentOvulation.toDateString()}</span></p><p>🩸 <strong>Predicted Next Period:</strong> <br><span style="color:var(--text-muted)">${nextPeriod.toDateString()}</span></p></div>`;
    }
    html += `</div>`; 

    // Daily Symptom / Flow Logger
    let todayStr = new Date().toDateString();
    let todayLog = h.logs[todayStr] || { flow: 'None', med: '' };
    html += `
        <div class="glass-card slide-up" style="margin-bottom:20px;">
            <h3 style="margin-bottom:15px; color:var(--text-main);">📝 Today's Log</h3>
            <label style="display:block; margin-bottom:5px;">Blood Flow Intensity:</label>
            <select id="health-flow" style="margin-bottom:15px;">
                <option value="None" ${todayLog.flow === 'None' ? 'selected' : ''}>None</option>
                <option value="Spotting" ${todayLog.flow === 'Spotting' ? 'selected' : ''}>Spotting</option>
                <option value="Light" ${todayLog.flow === 'Light' ? 'selected' : ''}>Light</option>
                <option value="Medium" ${todayLog.flow === 'Medium' ? 'selected' : ''}>Medium</option>
                <option value="Heavy" ${todayLog.flow === 'Heavy' ? 'selected' : ''}>Heavy</option>
            </select>
            <label style="display:block; margin-bottom:5px;">Medication / Pain Relief taken:</label>
            <input type="text" id="health-med" placeholder="e.g., Ibuprofen, None" value="${todayLog.med}" style="margin-bottom:15px;">
            <button class="btn" onclick="saveHealthLog()">Save Today's Log</button>
        </div>
    `;

    let periodOptions = [3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${h.periodLength == n ? 'selected':''}>${n} Days</option>`).join('');
    let cycleOptions = [21,22,23,24,25,26,27,28,29,30,31,32,33,34,35].map(n => `<option value="${n}" ${h.cycleLength == n ? 'selected':''}>${n} Days</option>`).join('');
    html += `<div class="glass-card slide-up"><h3 style="margin-bottom:15px; color:var(--text-main);">⚙️ Cycle Settings</h3><label style="display:block; margin-bottom:5px;">Period Length:</label><select id="period-length" onchange="updateHealthSettings()" style="margin-bottom:15px;">${periodOptions}</select><label style="display:block; margin-bottom:5px;">Average Cycle Length:</label><select id="cycle-length" onchange="updateHealthSettings()">${cycleOptions}</select></div>`;
    container.innerHTML = html;
}

window.saveHealthLog = function() {
    let todayStr = new Date().toDateString();
    let flow = document.getElementById('health-flow').value;
    let med = document.getElementById('health-med').value;
    if (!appData.health.logs) appData.health.logs = {};
    appData.health.logs[todayStr] = { flow: flow, med: med };
    saveData(); showToast("Health log saved for today!"); openDetail('female-health');
}

window.changeCalMonth = function(offset) { currentCalDate.setMonth(currentCalDate.getMonth() + offset); openDetail('female-health'); }

window.generateCycleCalendar = function(healthData) {
    let today = new Date(), year = currentCalDate.getFullYear(), month = currentCalDate.getMonth(); 
    let daysInMonth = new Date(year, month + 1, 0).getDate(), firstDay = new Date(year, month, 1).getDay();
    let monthName = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
    let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin: 10px 0;"><button class="icon-btn" onclick="changeCalMonth(-1)" style="color:var(--primary); padding:5px 15px; background:rgba(0,0,0,0.05); border-radius:8px;">◀</button><h4 style="color:var(--text-main); margin:0; font-size:1.1rem;">${monthName} ${year}</h4><button class="icon-btn" onclick="changeCalMonth(1)" style="color:var(--primary); padding:5px 15px; background:rgba(0,0,0,0.05); border-radius:8px;">▶</button></div><div class="cal-grid">`;
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => html += `<div class="cal-header">${d}</div>`);
    let periods = [], ovulations = [], history = healthData.cycleHistory || [];
    history.forEach(dateStr => { let s = new Date(dateStr); for(let p = 0; p < healthData.periodLength; p++) { let pDay = new Date(s); pDay.setDate(pDay.getDate() + p); periods.push(pDay.toDateString()); } let oDay = new Date(s); oDay.setDate(oDay.getDate() + healthData.cycleLength - 14); ovulations.push(oDay.toDateString()); });
    if (history.length > 0) { let latestStart = new Date(history[history.length - 1]), nextPStart = new Date(latestStart); nextPStart.setDate(nextPStart.getDate() + healthData.cycleLength); for(let p = 0; p < healthData.periodLength; p++) { let pDay = new Date(nextPStart); pDay.setDate(pDay.getDate() + p); periods.push(pDay.toDateString()); } let nextODay = new Date(nextPStart); nextODay.setDate(nextODay.getDate() + healthData.cycleLength - 14); ovulations.push(nextODay.toDateString()); }
    for(let i = 0; i < firstDay; i++) { html += `<div></div>`; }
    for(let i = 1; i <= daysInMonth; i++) { let dateStr = new Date(year, month, i).toDateString(), todayStr = today.toDateString(); let classes = "cal-day"; if (dateStr === todayStr) classes += " current-day"; if (periods.includes(dateStr)) classes += " period-day"; else if (ovulations.includes(dateStr)) classes += " ovulation-day"; html += `<div class="${classes}" onclick="setCycleStart('${dateStr}')">${i}</div>`; }
    html += `</div><div style="display:flex; justify-content:center; gap:15px; margin-top:15px; font-size:0.8rem; color:var(--text-main);"><div><span style="display:inline-block; width:10px; height:10px; background:var(--danger); border-radius:50%; margin-right:5px;"></span>Period</div><div><span style="display:inline-block; width:10px; height:10px; background:#8b5cf6; border-radius:50%; margin-right:5px;"></span>Ovulation</div></div>`;
    return html;
}

window.setCycleStart = function(dateStr) {
    let history = appData.health.cycleHistory || [], clickedDate = new Date(dateStr);
    let closestIndex = -1, smallestDiff = Infinity;
    for (let i = 0; i < history.length; i++) { let existingDate = new Date(history[i]), diffDays = Math.abs((clickedDate - existingDate) / (1000 * 60 * 60 * 24)); if (diffDays < smallestDiff) { smallestDiff = diffDays; closestIndex = i; } }
    if (closestIndex > -1 && smallestDiff === 0) { history.splice(closestIndex, 1); showToast("Cycle log removed."); } 
    else if (closestIndex > -1 && smallestDiff <= 20) { history[closestIndex] = dateStr; showToast("Cycle start date updated!"); } 
    else { history.push(dateStr); showToast("New cycle logged!"); }
    history.sort((a, b) => new Date(a) - new Date(b)); appData.health.cycleHistory = history; saveData(); openDetail('female-health'); 
}
window.updateHealthSettings = function() { appData.health.periodLength = parseInt(document.getElementById('period-length').value); appData.health.cycleLength = parseInt(document.getElementById('cycle-length').value); saveData(); openDetail('female-health'); showToast("Health settings updated!"); }

// ==========================================
// AUDIO ENGINE & BACKGROUND CHECKER
// ==========================================
window.playReminderSound = function() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext; const ctx = new AudioContext();
        function beep(frequency, startTime) { const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.value = frequency; gain.gain.setValueAtTime(0.1, startTime); gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3); osc.connect(gain); gain.connect(ctx.destination); osc.start(startTime); osc.stop(startTime + 0.3); }
        beep(880, ctx.currentTime); beep(1046.50, ctx.currentTime + 0.15);   
    } catch (e) { console.log("Audio not supported or blocked by browser."); }
}

setInterval(() => {
    if (!appData) return; 
    const now = new Date(); const currentTime = now.toTimeString().slice(0, 5); 
    if (appData.reminders) {
        appData.reminders.forEach(rem => {
            if (rem.time === currentTime && !rem.triggeredToday) { if (typeof playReminderSound === "function") playReminderSound(); showToast(`⏰ Reminder: ${rem.title}`); rem.triggeredToday = true; saveData(); setTimeout(() => { rem.triggeredToday = false; saveData(); }, 60000); }
        });
    }
    if (appData.supplements) {
        appData.supplements.forEach(sup => {
            if (sup.time === currentTime && !sup.triggeredToday && !sup.takenToday) { if (typeof playReminderSound === "function") playReminderSound(); showToast(`💊 Supplement Time: ${sup.name}`); sup.triggeredToday = true; saveData(); setTimeout(() => { sup.triggeredToday = false; saveData(); }, 60000); }
        });
    }
}, 10000);