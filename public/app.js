import { PptxViewer, RECOMMENDED_ZIP_LIMITS } from 'https://cdn.jsdelivr.net/npm/@aiden0z/pptx-renderer/+esm';

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('presentations-grid');
    
    // Upload Modal
    const uploadModal = document.getElementById('upload-modal');
    const openUploadBtn = document.getElementById('open-upload-modal');
    const closeUploadBtn = document.getElementById('close-upload');
    const uploadForm = document.getElementById('upload-form');
    const uploadMessage = document.getElementById('upload-message');
    const uploadBtn = document.getElementById('upload-btn');

    // Delete Modal
    const deleteModal = document.getElementById('delete-modal');
    const closeDeleteBtn = document.getElementById('close-delete');
    const deleteForm = document.getElementById('delete-form');
    const deleteMessage = document.getElementById('delete-message');
    const deleteBtn = document.getElementById('delete-btn');
    const deleteFilenameDisplay = document.getElementById('delete-filename');
    
    let fileToDelete = null;

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
                const displayName = file.filename.replace(/^\d+-/, '');
                
                return `
                    <div class="card">
                        <div class="card-preview" id="preview-${file.filename}" style="position: relative; overflow: hidden; background: #fff;">
                            <div class="loading-thumbnail" style="font-size: 1rem;">Loading...</div>
                        </div>
                        <div class="card-content">
                            <div class="card-title" title="${file.filename}">${displayName}</div>
                            <div class="card-date">${date}</div>
                            <div style="display: flex; gap: 10px;">
                                <a href="/present.html?file=${encodeURIComponent(file.url)}" class="btn primary" style="flex-grow: 1;">Present</a>
                                <button class="btn delete-trigger" data-filename="${file.filename}" style="background: #dc3545; color: white; padding: 0.5rem;">🗑️</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Attach delete listeners
            document.querySelectorAll('.delete-trigger').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    fileToDelete = e.currentTarget.getAttribute('data-filename');
                    deleteFilenameDisplay.textContent = fileToDelete.replace(/^\d+-/, '');
                    deleteModal.classList.add('show');
                    deleteMessage.textContent = '';
                    deleteForm.reset();
                });
            });

            // Generate Thumbnails asynchronously
            files.forEach(async (file) => {
                const previewContainer = document.getElementById(`preview-${file.filename}`);
                const isPdf = file.filename.toLowerCase().endsWith('.pdf');
                
                try {
                    if (isPdf) {
                        const pdf = await pdfjsLib.getDocument(file.url).promise;
                        const page = await pdf.getPage(1);
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const viewport = page.getViewport({ scale: 1 }); // low res is fine for thumbnail
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        canvas.style.width = '100%';
                        canvas.style.height = '100%';
                        canvas.style.objectFit = 'cover';
                        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                        previewContainer.innerHTML = '';
                        previewContainer.appendChild(canvas);
                    } else {
                        // PPTX thumbnail
                        const resp = await fetch(file.url);
                        const arrayBuffer = await resp.arrayBuffer();
                        const pptxWrapper = document.createElement('div');
                        pptxWrapper.style.width = '100%';
                        pptxWrapper.style.height = '100%';
                        pptxWrapper.style.position = 'absolute';
                        pptxWrapper.style.top = '0';
                        pptxWrapper.style.left = '0';
                        // Force scale down so it fits the thumbnail box (assuming typical 1920x1080 slide)
                        pptxWrapper.style.transform = 'scale(0.15)';
                        pptxWrapper.style.transformOrigin = 'top left';
                        
                        await PptxViewer.open(arrayBuffer, pptxWrapper, { zipLimits: RECOMMENDED_ZIP_LIMITS });
                        
                        // Hide all slides except the first one
                        const slides = Array.from(pptxWrapper.children);
                        slides.forEach((slide, i) => {
                            if (i !== 0) slide.style.display = 'none';
                        });
                        
                        previewContainer.innerHTML = '';
                        previewContainer.appendChild(pptxWrapper);
                    }
                } catch (e) {
                    console.error('Thumbnail failed for ' + file.filename, e);
                    previewContainer.innerHTML = `<div style="font-size: 2rem; color: #adb5bd;">${isPdf ? '📄' : '📊'}</div>`;
                }
            });

        } catch (error) {
            grid.innerHTML = '<div class="error">Failed to load presentations.</div>';
        }
    };

    fetchPresentations();

    // Modal logic
    openUploadBtn.addEventListener('click', () => {
        uploadModal.classList.add('show');
        uploadMessage.textContent = '';
        uploadForm.reset();
    });

    closeUploadBtn.addEventListener('click', () => uploadModal.classList.remove('show'));
    closeDeleteBtn.addEventListener('click', () => deleteModal.classList.remove('show'));

    window.addEventListener('click', (e) => {
        if (e.target === uploadModal) uploadModal.classList.remove('show');
        if (e.target === deleteModal) deleteModal.classList.remove('show');
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
        uploadMessage.className = '';

        try {
            const response = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await response.json();

            if (response.ok) {
                uploadMessage.textContent = 'Upload successful!';
                uploadMessage.className = 'success';
                fetchPresentations();
                setTimeout(() => uploadModal.classList.remove('show'), 1500);
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

    // Delete logic
    deleteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const secretCode = document.getElementById('deleteSecretCode').value;
        
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Deleting...';
        deleteMessage.className = '';

        try {
            const response = await fetch(`/api/presentations/${encodeURIComponent(fileToDelete)}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secretCode })
            });
            const data = await response.json();

            if (response.ok) {
                deleteMessage.textContent = 'Deleted successfully!';
                deleteMessage.className = 'success';
                fetchPresentations();
                setTimeout(() => deleteModal.classList.remove('show'), 1500);
            } else {
                deleteMessage.textContent = data.error || 'Delete failed';
                deleteMessage.className = 'error';
            }
        } catch (error) {
            deleteMessage.textContent = 'Network error occurred';
            deleteMessage.className = 'error';
        } finally {
            deleteBtn.disabled = false;
            deleteBtn.textContent = 'Delete Permanently';
        }
    });
});
