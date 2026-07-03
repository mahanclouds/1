// ========== منطق داشبورد ==========

// ---------- بارگذاری ویدیوهای کاربر ----------
function loadMyVideos() {
    const session = getCurrentUser();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    
    const fullUser = getFullUser();
    if (!fullUser) return;
    
    document.getElementById('dashboardUser').textContent = `👤 ${fullUser.fullName || fullUser.username}`;
    
    const myVideos = fullUser.videos || [];
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
    updateStats(fullUser);
}

// ---------- بروزرسانی آمار ----------
function updateStats(user) {
    const videos = user.videos || [];
    document.getElementById('totalVideos').textContent = videos.length;
    
    let totalViews = 0, totalLikes = 0;
    videos.forEach(v => {
        totalViews += v.views || ۰;
        totalLikes += v.likes || ۰;
    });
    document.getElementById('totalViews').textContent = totalViews;
    document.getElementById('totalLikes').textContent = totalLikes;
}

// ---------- آپلود ویدیو ----------
function uploadVideo(event) {
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
    
    // بررسی حجم فایل (حداکثر ۱۰۰ مگابایت برای دمو)
    if (file.size > 100 * 1024 * 1024) {
        alert('❌ حجم فایل بیش از ۱۰۰ مگابایت است!');
        return;
    }
    
    // نمایش پیشرفت
    const progressDiv = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    progressDiv.style.display = 'block';
    
    // خواندن فایل به صورت Base64
    const reader = new FileReader();
    reader.onprogress = (e) => {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            progressFill.style.width = percent + '%';
            progressText.textContent = percent + '%';
        }
    };
    
    reader.onload = function(e) {
        const videoData = e.target.result;
        
        // خواندن تصویر بندانگشتی
        let thumbnailData = null;
        if (thumbnailInput.files && thumbnailInput.files.length > 0) {
            const thumbReader = new FileReader();
            thumbReader.onload = function(te) {
                thumbnailData = te.target.result;
                saveVideoToUser(title, description, category, videoData, thumbnailData);
            };
            thumbReader.readAsDataURL(thumbnailInput.files[0]);
        } else {
            saveVideoToUser(title, description, category, videoData, null);
        }
    };
    
    reader.readAsDataURL(file);
}

// ---------- ذخیره ویدیو در حساب کاربر ----------
function saveVideoToUser(title, description, category, videoData, thumbnailData) {
    const session = getCurrentUser();
    if (!session) return;
    
    const users = JSON.parse(localStorage.getItem(AUTH_KEY) || '[]');
    const userIndex = users.findIndex(u => u.id === session.userId);
    if (userIndex === -1) return;
    
    const newVideo = {
        id: 'vid_' + Date.now(),
        title,
        description,
        category,
        videoData: videoData, // Base64 encoded
        thumbnail: thumbnailData,
        uploadDate: new Date().toISOString(),
        views: 0,
        likes: 0,
        duration: '۰۰:۰۰' // در پروژه واقعی از متادیتا استخراج می‌شود
    };
    
    if (!users[userIndex].videos) users[userIndex].videos = [];
    users[userIndex].videos.push(newVideo);
    
    localStorage.setItem(AUTH_KEY, JSON.stringify(users));
    
    // ریست کردن فرم
    document.getElementById('uploadForm').reset();
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressText').textContent = '۰%';
    
    alert('✅ ویدیو با موفقیت آپلود شد!');
    loadMyVideos();
}

// ---------- حذف ویدیو ----------
function deleteVideo(videoId) {
    if (!confirm('آیا از حذف این ویدیو مطمئن هستید؟')) return;
    
    const session = getCurrentUser();
    if (!session) return;
    
    const users = JSON.parse(localStorage.getItem(AUTH_KEY) || '[]');
    const userIndex = users.findIndex(u => u.id === session.userId);
    if (userIndex === -1) return;
    
    users[userIndex].videos = users[userIndex].videos.filter(v => v.id !== videoId);
    localStorage.setItem(AUTH_KEY, JSON.stringify(users));
    
    loadMyVideos();
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
