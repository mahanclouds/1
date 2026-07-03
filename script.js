// ========== منطق اصلی با IndexedDB ==========

let videos = [];
let currentVideoId = null;

// ---------- بارگذاری ویدیوها از IndexedDB ----------
async function loadVideos() {
    try {
        const db = await openDB();
        const allVideos = await getAllVideosFromDB();
        
        videos = allVideos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
        
        if (videos.length === 0) {
            document.getElementById('emptyMessage').style.display = 'block';
            document.getElementById('videoGrid').style.display = 'none';
        } else {
            document.getElementById('emptyMessage').style.display = 'none';
            document.getElementById('videoGrid').style.display = 'grid';
            renderVideos(videos);
        }
    } catch (error) {
        console.error('خطا در بارگذاری ویدیوها:', error);
        document.getElementById('emptyMessage').style.display = 'block';
        document.getElementById('videoGrid').style.display = 'none';
    }
}

// ---------- رندر ویدیوها ----------
function renderVideos(videoList) {
    const grid = document.getElementById('videoGrid');
    grid.innerHTML = '';
    
    if (videoList.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:40px;">🎥 هیچ ویدیویی با این جستجو پیدا نشد!</p>';
        return;
    }
    
    videoList.forEach(video => {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <div class="thumbnail">
                <span class="play-icon">▶️</span>
                ${video.thumbnail ? `<img src="${video.thumbnail}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">` : ''}
                <span class="video-duration">${video.duration || '۰۰:۰۰'}</span>
            </div>
            <div class="video-info">
                <h3>${video.title}</h3>
                <p style="font-size:13px;color:rgba(255,255,255,0.5);">${video.uploaderName || 'کاربر ناشناس'}</p>
                <div class="meta">
                    <span class="category-tag">${video.category || 'سایر'}</span>
                    <span>👁️ ${video.views || ۰}</span>
                </div>
            </div>
        `;
        card.addEventListener('click', () => openPlayer(video.id));
        grid.appendChild(card);
    });
}

// ---------- پخش ویدیو ----------
function openPlayer(videoId) {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;
    
    currentVideoId = videoId;
    
    document.getElementById('videoTitle').textContent = video.title;
    document.getElementById('videoDescription').textContent = video.description || 'بدون توضیحات';
    document.getElementById('videoUploader').textContent = `👤 آپلود کننده: ${video.uploaderName || 'کاربر ناشناس'}`;
    document.getElementById('videoCategory').textContent = `📂 دسته: ${video.category || 'سایر'}`;
    document.getElementById('videoDate').textContent = `📅 تاریخ: ${new Date(video.uploadDate).toLocaleDateString('fa-IR')}`;
    document.getElementById('videoViews').textContent = `👁️ بازدید: ${video.views || ۰}`;
    document.getElementById('likeCount').textContent = video.likes || ۰;
    
    // بررسی اینکه کاربر قبلاً لایک کرده یا نه
    const currentUser = getCurrentUser();
    if (currentUser) {
        const user = getUserFromDB(currentUser.userId);
        user.then(u => {
            if (u && u.likedVideos && u.likedVideos.includes(videoId)) {
                document.querySelector('.like-btn').classList.add('liked');
            } else {
                document.querySelector('.like-btn').classList.remove('liked');
            }
        });
    }
    
    // تنظیم ویدیو
    const videoSource = document.getElementById('videoSource');
    if (video.videoData) {
        videoSource.src = video.videoData;
    } else {
        // ویدیوی نمونه برای تست
        videoSource.src = 'https://www.w3schools.com/html/mov_bbb.mp4';
    }
    
    document.getElementById('videoPlayer').load();
    document.getElementById('playerPanel').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // افزایش بازدید
    incrementView(videoId);
    document.getElementById('videoPlayer').play();
}

// ---------- افزایش بازدید ----------
async function incrementView(videoId) {
    try {
        const video = await getVideoFromDB(videoId);
        if (video) {
            video.views = (video.views || ۰) + 1;
            await saveVideoToDB(video);
            
            // بروزرسانی لیست
            await loadVideos();
        }
    } catch (error) {
        console.error('خطا در افزایش بازدید:', error);
    }
}

// ---------- دریافت ویدیو از دیتابیس ----------
async function getVideoFromDB(videoId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['videos'], 'readonly');
        const store = transaction.objectStore('videos');
        const request = store.get(videoId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ---------- بستن پخش‌کننده ----------
function closePlayer() {
    document.getElementById('playerPanel').classList.add('hidden');
    document.body.style.overflow = 'auto';
    document.getElementById('videoPlayer').pause();
}

// ---------- لایک کردن ----------
async function likeVideo() {
    if (!currentVideoId) return;
    
    const session = getCurrentUser();
    if (!session) {
        alert('⚠️ برای لایک کردن باید وارد حساب خود شوید!');
        return;
    }
    
    try {
        const video = await getVideoFromDB(currentVideoId);
        if (!video) return;
        
        const user = await getUserFromDB(session.userId);
        if (!user) return;
        
        if (!user.likedVideos) user.likedVideos = [];
        const alreadyLiked = user.likedVideos.includes(currentVideoId);
        const likeBtn = document.querySelector('.like-btn');
        
        if (!alreadyLiked) {
            video.likes = (video.likes || ۰) + 1;
            user.likedVideos.push(currentVideoId);
            likeBtn.classList.add('liked');
        } else {
            video.likes = Math.max((video.likes || ۰) - 1, 0);
            user.likedVideos = user.likedVideos.filter(id => id !== currentVideoId);
            likeBtn.classList.remove('liked');
        }
        
        await saveVideoToDB(video);
        await saveUserToDB(user);
        
        document.getElementById('likeCount').textContent = video.likes || ۰;
        await loadVideos();
        
    } catch (error) {
        console.error('خطا در لایک:', error);
        alert('❌ خطا در ثبت لایک');
    }
}

// ---------- جستجو و فیلتر ----------
function filterVideos() {
    const searchText = document.getElementById('searchInput').value.trim().toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    
    const filtered = videos.filter(video => {
        const matchSearch = video.title.includes(searchText) ||
                           (video.description && video.description.includes(searchText)) ||
                           (video.uploaderName && video.uploaderName.includes(searchText));
        const matchCategory = category === 'all' || video.category === category;
        return matchSearch && matchCategory;
    });
    
    renderVideos(filtered);
}

// رویدادهای جستجو
if (document.getElementById('searchInput')) {
    document.getElementById('searchInput').addEventListener('input', filterVideos);
    document.getElementById('categoryFilter').addEventListener('change', filterVideos);
}

// ---------- بارگذاری اولیه ----------
if (document.getElementById('videoGrid')) {
    loadVideos();
    updateUserStatus();
}
