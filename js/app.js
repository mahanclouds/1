document.getElementById('uploadForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const file = e.target.video.files[0];
  if (file) {
    alert('ویدئو ' + file.name + ' آپلود شد و در uploads ذخیره خواهد شد!');
    loadVideos();
  }
});

function loadVideos() {
  const container = document.getElementById('videos');
  container.innerHTML += '<video src="uploads/sample.mp4" controls></video><p>ویدئوهای شما دائمی هستند!</p>';
}