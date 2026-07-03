// ========== منطق داشبورد با IndexedDB ==========

const DB_NAME = 'StreamDB';
const DB_VERSION = 1;

// ---------- باز کردن دیتابیس ----------
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('users')) {
                db.createObjectStore('users', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('videos')) {
                const videoStore = db.createObjectStore('videos', { keyPath: 'id' });
                videoStore.createIndex('uploaderId', 'uploaderId', { unique: false });
            }
        };
    });
}

// ---------- ذخیره کاربر در IndexedDB ----------
async function saveUserToDB(user) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        const request = store.put(user);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ---------- دریافت کاربر از IndexedDB ----------
async function getUserFromDB(userId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const request = store.get(userId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ---------- دریافت ویدیوها از IndexedDB ----------
async function getAllVideosFromDB() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['videos'], 'readonly');
        const store = transaction.objectStore('videos');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ---------- ذخیره ویدیو در IndexedDB ----------
async function saveVideoToDB(video) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['videos'], 'readwrite');
        const store = transaction.objectStore('videos');
        const request = store.put(video);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ---------- حذف ویدیو از IndexedDB ----------
async function deleteVideoFromDB(videoId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['videos'], 'readwrite');
        const store = transaction.objectStore('videos');
        const request = store.delete(videoId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ---------- بارگذاری ویدیوهای کاربر ----------
async function loadMyVideos() {
    const session = getCurrentUser();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    
    const user = await getUserFromDB(session.userId);
    if (!user) return;
    
    document.getElementById('dashboardUser').textContent = `👤 ${user.fullName || user.username}`;
    
    // دریافت ویدیوهای کاربر از فروشگاه ویدیوها
    const allVideos = await getAllVideosFromDB();
    const myVideos = allVideos.filter(v => v.uploaderId === session.userId);
    
    const list = document.getElementById('myVideosList');
    
    if (myVideos.length === 0) {
        list.innerHTML = '<p style="color:rgba(255,255,255,0.4);">هنوز ویدیویی آپلود نکرده‌اید!</p>';
    } else {
        list.innerHTML = myVideos.map(video => `
            <div class="my-video-item">
                <span class="video-name">${video.title}</span>
                <div class="video-actions">
                    <span style="font-size:12px;color:rgba(255,255,255,0.4);">👁️ ${video.views || ۰}</span>
                    <button onclick="deleteVideo('${video.id}')" class="delete-btn">🗑️</button>
                </div>
            </div>
        `).join('');
    }
    
    // بروزرسانی آمار
    await updateStats(user, myVideos);
}

// ---------- بروزرسانی آمار ----------
async function updateStats(user, myVideos) {
    document.getElementById('totalVideos').textContent = myVideos.length;
    
    let totalViews = 0, totalLikes = 0;
    myVideos.forEach(v => {
        totalViews += v.views || ۰;
        totalLikes += v.likes || ۰;
    });
    document.getElementById('totalViews').textContent = totalViews;
    document.getElementById('totalLikes').textContent = totalLikes;
}

// ---------- آپلود ویدیو ----------
async function uploadVideo(event) {
    event.preventDefault();
    
    const session = getCurrentUser();
    if (!session) {
        alert('⚠️ لطفاً ابتدا وارد شوید!');
        return;
    }
    
    const title = document.getElementById('videoTitleInput').value.trim();
    const description = document.getElementById('videoDescriptionInput').value.trim();
    const category = document.getElementById('videoCategoryInput').value;
    const fileInput = document.getElementById('videoFileInput');
    const thumbnailInput = document.getElementById('thumbnailInput');
    
    if (!title || !fileInput.files || fileInput.files.length === 0) {
        alert('⚠️ لطفاً عنوان و فایل ویدیو را انتخاب کنید!');
        return;
    }
    
    const file = fileInput.files[0];
    
    // بررسی حجم فایل (حداکثر ۵۰۰ مگابایت)
    if (file.size > 500 * 1024 * 1024) {
        alert('❌ حجم فایل بیش از ۵۰۰ مگابایت است!');
        return;
    }
    
    // نمایش پیشرفت
    const progressDiv = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    progressDiv.style.display = 'block';
    
    try {
        // خواندن فایل ویدیو
        const videoData = await readFileAsDataURL(file, (progress) => {
            progressFill.style.width = progress + '%';
            progressText.textContent = progress + '%';
        });
        
        // خواندن تصویر بند انگشتی
        let thumbnailData = null;
        if (thumbnailInput.files && thumbnailInput.files.length > 0) {
            thumbnailData = await readFileAsDataURL(thumbnailInput.files[0]);
        }
        
        // ایجاد ویدیو جدید
        const newVideo = {
            id: 'vid_' + Date.now(),
            title,
            description,
            category,
            videoData: videoData,
            thumbnail: thumbnailData,
            uploaderId: session.userId,
            uploaderName: session.fullName || session.username,
            uploadDate: new Date().toISOString(),
            views: 0,
            likes: 0,
            duration: '۰۰:۰۰'
        };
        
        // ذخیره در IndexedDB
        await saveVideoToDB(newVideo);
        
        // بروزرسانی کاربر (برای سازگاری با کد قدیمی)
        const user = await getUserFromDB(session.userId);
        if (user) {
            if (!user.videos) user.videos = [];
            user.videos.push(newVideo);
            await saveUserToDB(user);
        }
        
        // ریست کردن فرم
        document.getElementById('uploadForm').reset();
        progressDiv.style.display = 'none';
        progressFill.style.width = '0%';
        progressText.textContent = '۰%';
        
        alert('✅ ویدیو با موفقیت آپلود شد!');
        await loadMyVideos();
        
        // بروزرسانی صفحه اصلی
        if (window.opener) {
            window.opener.location.reload();
        }
        
    } catch (error) {
        console.error('خطا در آپلود:', error);
        alert('❌ خطا در آپلود ویدیو: ' + error.message);
        progressDiv.style.display = 'none';
    }
}

// ---------- تابع کمکی برای خواندن فایل ----------
function readFileAsDataURL(file, onProgress) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        };
        
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
        reader.readAsDataURL(file);
    });
}

// ---------- حذف ویدیو ----------
async function deleteVideo(videoId) {
    if (!confirm('آیا از حذف این ویدیو مطمئن هستید؟')) return;
    
    try {
        await deleteVideoFromDB(videoId);
        
        // حذف از لیست کاربر
        const session = getCurrentUser();
        if (session) {
            const user = await getUserFromDB(session.userId);
            if (user && user.videos) {
                user.videos = user.videos.filter(v => v.id !== videoId);
                await saveUserToDB(user);
            }
        }
        
        await loadMyVideos();
        alert('✅ ویدیو با موفقیت حذف شد!');
    } catch (error) {
        alert('❌ خطا در حذف ویدیو: ' + error.message);
    }
}

// ---------- بارگذاری اولیه داشبورد ----------
if (document.getElementById('myVideosList')) {
    if (!isLoggedIn()) {
        alert('⚠️ لطفاً ابتدا وارد حساب کاربری خود شوید!');
        window.location.href = 'login.html';
    } else {
        loadMyVideos();
        updateUserStatus();
    }
                       }
