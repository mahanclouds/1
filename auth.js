// ========== سیستم احراز هویت ==========

// کلیدهای ذخیره‌سازی در LocalStorage
const AUTH_KEY = 'stream_app_users';
const SESSION_KEY = 'stream_app_session';

// ---------- ثبت‌نام ----------
function registerUser(event) {
    event.preventDefault();
    
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const fullName = document.getElementById('regFullName').value.trim();
    const role = document.getElementById('regRole').value;
    
    const errorDiv = document.getElementById('registerError');
    
    // اعتبارسنجی
    if (username.length < 3) {
        errorDiv.textContent = '❌ نام کاربری باید حداقل ۳ کاراکتر باشد!';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (password.length < 6) {
        errorDiv.textContent = '❌ رمز عبور باید حداقل ۶ کاراکتر باشد!';
        errorDiv.style.display = 'block';
        return;
    }
    
    // دریافت کاربران موجود
    let users = JSON.parse(localStorage.getItem(AUTH_KEY) || '[]');
    
    // بررسی تکراری نبودن
    if (users.find(u => u.username === username)) {
        errorDiv.textContent = '❌ این نام کاربری قبلاً ثبت شده است!';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (users.find(u => u.email === email)) {
        errorDiv.textContent = '❌ این ایمیل قبلاً ثبت شده است!';
        errorDiv.style.display = 'block';
        return;
    }
    
    // ایجاد کاربر جدید
    const newUser = {
        id: Date.now().toString(),
        username,
        email,
        password, // توجه: در پروژه واقعی باید هش شود!
        fullName: fullName || username,
        role,
        createdAt: new Date().toISOString(),
        videos: [],
        stats: { totalViews: 0, totalLikes: 0 }
    };
    
    users.push(newUser);
    localStorage.setItem(AUTH_KEY, JSON.stringify(users));
    
    errorDiv.style.display = 'none';
    alert('✅ ثبت‌نام با موفقیت انجام شد! لطفاً وارد شوید.');
    window.location.href = 'login.html';
}

// ---------- ورود ----------
function loginUser(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    let users = JSON.parse(localStorage.getItem(AUTH_KEY) || '[]');
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
        errorDiv.textContent = '❌ نام کاربری یا رمز عبور اشتباه است!';
        errorDiv.style.display = 'block';
        return;
    }
    
    // ایجاد نشست
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        userId: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        loginTime: new Date().toISOString()
    }));
    
    errorDiv.style.display = 'none';
    window.location.href = 'index.html';
}

// ---------- خروج ----------
function logoutUser() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
}

// ---------- بررسی وضعیت ورود ----------
function getCurrentUser() {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    try {
        return JSON.parse(session);
    } catch {
        return null;
    }
}

function isLoggedIn() {
    return getCurrentUser() !== null;
}

// ---------- دریافت اطلاعات کامل کاربر ----------
function getFullUser() {
    const session = getCurrentUser();
    if (!session) return null;
    
    const users = JSON.parse(localStorage.getItem(AUTH_KEY) || '[]');
    return users.find(u => u.id === session.userId) || null;
}

// ---------- بروزرسانی وضعیت کاربر در صفحه ----------
function updateUserStatus() {
    const user = getCurrentUser();
    const statusEl = document.getElementById('userStatus');
    const authBtn = document.getElementById('authButton');
    const dashboardBtn = document.getElementById('dashboardButton');
    const logoutBtn = document.getElementById('logoutButton');
    
    if (user) {
        statusEl.textContent = `👤 ${user.fullName || user.username}`;
        authBtn.textContent = '👤 پروفایل';
        authBtn.onclick = () => window.location.href = 'dashboard.html';
        dashboardBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'inline-block';
    } else {
        statusEl.textContent = '⚠️ مهمان';
        authBtn.textContent = 'ورود / ثبت‌نام';
        authBtn.onclick = () => window.location.href = 'login.html';
        dashboardBtn.style.display = 'none';
        logoutBtn.style.display = 'none';
    }
}

// ---------- هدایت به داشبورد ----------
function goToDashboard() {
    if (isLoggedIn()) {
        window.location.href = 'dashboard.html';
    } else {
        alert('⚠️ لطفاً ابتدا وارد حساب کاربری خود شوید!');
        window.location.href = 'login.html';
    }
}

function goToHome() {
    window.location.href = 'index.html';
}

function handleAuth() {
    if (isLoggedIn()) {
        window.location.href = 'dashboard.html';
    } else {
        window.location.href = 'login.html';
    }
}

// ========== اجرای اولیه ==========
if (document.getElementById('userStatus')) {
    updateUserStatus();
}
