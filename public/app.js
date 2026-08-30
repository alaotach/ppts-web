document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('presentations-grid');
    const modal = document.getElementById('upload-modal');
    const openModalBtn = document.getElementById('open-upload-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const uploadForm = document.getElementById('upload-form');
    const uploadMessage = document.getElementById('upload-message');
    const uploadBtn = document.getElementById('upload-btn');

    // Fetch and display presentations
    const fetchPresentations = async () => {
        try {
            const response = await fetch('/api/presentations');
            const files = await response.json();
            
            if (files.length === 0) {
                grid.innerHTML = '<div class="empty-state">No presentations uploaded yet.</div>';
                return;
            }

            grid.innerHTML = files.map(file => {
                const date = new Date(file.createdAt).toLocaleDateString();
                const isPdf = file.filename.toLowerCase().endsWith('.pdf');
                const icon = isPdf ? '📄 PDF' : '📊 PPT';
                
                return `
                    <div class="card">
                        <div class="card-preview">${icon}</div>
                        <div class="card-content">
                            <div class="card-title" title="${file.filename}">${file.filename.replace(/^\d+-/, '')}</div>
                            <div class="card-date">${date}</div>
                            <a href="/present.html?file=${encodeURIComponent(file.url)}" class="btn primary">Present</a>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            grid.innerHTML = '<div class="error">Failed to load presentations.</div>';
        }
    };

    fetchPresentations();

    // Modal logic
    openModalBtn.addEventListener('click', () => {
        modal.classList.add('show');
        uploadMessage.textContent = '';
        uploadForm.reset();
    });

    closeModalBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    // Upload logic
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const secretCode = document.getElementById('secretCode').value;
        const fileInput = document.getElementById('presentation');
        
        if (!fileInput.files[0]) return;

        const formData = new FormData();
        formData.append('secretCode', secretCode);
        formData.append('presentation', fileInput.files[0]);

        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
        uploadMessage.textContent = '';
        uploadMessage.className = '';

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                uploadMessage.textContent = 'Upload successful!';
                uploadMessage.className = 'success';
                fetchPresentations();
                setTimeout(() => {
                    modal.classList.remove('show');
                }, 1500);
            } else {
                uploadMessage.textContent = data.error || 'Upload failed';
                uploadMessage.className = 'error';
            }
        } catch (error) {
            uploadMessage.textContent = 'Network error occurred';
            uploadMessage.className = 'error';
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload';
        }
    });
});
