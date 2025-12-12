// UI Helper functions

export const showToast = (message, type = 'info') => {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3000);
};

export const updateProgressBar = (show, width = 0) => {
  const container = document.getElementById('progress-bar-container');
  const bar = document.getElementById('progress-bar');
  const text = document.getElementById('status-text');

  if (show) {
    container.style.display = 'block';
    // Use requestAnimationFrame to ensure display change applies before width
    requestAnimationFrame(() => {
        bar.style.width = `${width}%`;
    });
  } else {
    bar.style.width = '0%';
    setTimeout(() => {
        container.style.display = 'none';
    }, 300);
    text.innerText = '';
  }
};

export const updateStatusText = (text) => {
    const el = document.getElementById('status-text');
    if (el) el.innerText = text;
}

export const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

// Modal logic
export const openPreviewModal = (imageRecord) => {
    const modal = document.getElementById('preview-modal');
    const modalImg = document.getElementById('modal-img');
    const modalDetails = document.getElementById('modal-details');

    if (!modal || !modalImg || !modalDetails) return;

    // Create object URL
    const url = URL.createObjectURL(imageRecord.blob);
    modalImg.src = url;
    modalImg.onload = () => URL.revokeObjectURL(url); // Revoke after load? Or keep for session?
    // Actually safer to keep it while modal is open, but simple revoke on load is standard for one-off.
    // However, if the user closes and opens, we regen.

    // Populate details
    let html = `<h3>Metadata</h3>`;
    html += `<p><strong>Prompt:</strong> ${imageRecord.prompt}</p>`;
    if (imageRecord.negative_prompt) html += `<p><strong>Negative Prompt:</strong> ${imageRecord.negative_prompt}</p>`;
    html += `<p><strong>Seed:</strong> ${imageRecord.seed}</p>`;
    html += `<p><strong>Model:</strong> ${imageRecord.model}</p>`;
    html += `<p><strong>Steps:</strong> ${imageRecord.steps} | <strong>Sampler:</strong> ${imageRecord.sampler}</p>`;
    html += `<p><strong>CFG:</strong> ${imageRecord.cfg_scale}</p>`;
    html += `<p><strong>Dimensions:</strong> ${imageRecord.width}x${imageRecord.height}</p>`;
    html += `<p><strong>Time:</strong> ${new Date(imageRecord.timestamp).toLocaleString()}</p>`;
    if (imageRecord.lora) html += `<p><strong>Lora:</strong> ${imageRecord.lora}</p>`;

    html += `<div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">`;
    html += `<button class="btn-primary" id="modal-download-btn">Download</button>`;
    html += `<button class="btn-danger" id="modal-delete-btn">Delete</button>`;
    html += `<button class="btn-secondary" id="modal-restore-btn">Restore Settings</button>`;
    html += `</div>`;

    modalDetails.innerHTML = html;

    // Event listeners for modal buttons
    document.getElementById('modal-download-btn').onclick = () => {
        saveAs(imageRecord.blob, `seed_${imageRecord.seed}_${imageRecord.timestamp}.png`);
    };

    document.getElementById('modal-delete-btn').onclick = () => {
        if(confirm('Delete this image?')) {
            const deleteEvent = new CustomEvent('delete-image', { detail: { id: imageRecord.id } });
            document.dispatchEvent(deleteEvent);
            modal.style.display = 'none';
        }
    };

    document.getElementById('modal-restore-btn').onclick = () => {
        const restoreEvent = new CustomEvent('restore-settings', { detail: imageRecord });
        document.dispatchEvent(restoreEvent);
        modal.style.display = 'none';
        showToast('Settings restored!');
    };

    modal.style.display = 'flex';
};

export const closePreviewModal = () => {
    const modal = document.getElementById('preview-modal');
    if (modal) modal.style.display = 'none';
}
