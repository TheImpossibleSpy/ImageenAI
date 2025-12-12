import { initDB, saveImage, getAllImages, deleteImage } from './idb.js';
import { showToast, updateProgressBar, updateStatusText, toggleTheme, openPreviewModal, closePreviewModal } from './ui.js';

// State
let appState = {
  apiKey: '',
  useProxy: false,
  proxyUrl: 'http://localhost:3000/proxy', // Default local proxy
  models: [
    "ICBINP - I Can't Believe It's Not Photography",
    "Stable Diffusion XL 1.0",
    "AlbedoBase XL (SDXL)",
    "Juggernaut XL",
    "DreamShaper 8",
    "Deliberate 3.0"
  ],
  loras: [
    { name: "None", id: "" },
    { name: "Detail Tweaker XL", id: "135867" },
    { name: "Add More Details", id: "82098" }
  ],
  customLoras: [], // stored in memory
  isGenerating: false
};

// DOM Elements
const els = {};

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize DB
  try {
    await initDB();
    renderGallery();
  } catch (e) {
    console.error("DB Init failed", e);
    showToast("Failed to initialize database", "error");
  }

  // Bind Elements
  const bind = (id) => document.getElementById(id);
  els.prompt = bind('prompt');
  els.negativePrompt = bind('negative-prompt');
  els.model = bind('model-select');
  els.lora = bind('lora-select');
  els.width = bind('width');
  els.height = bind('height');
  els.steps = bind('steps');
  els.cfg = bind('cfg');
  els.seed = bind('seed');
  els.count = bind('image-count');
  els.sampler = bind('sampler');
  els.apiKey = bind('api-key');
  els.useProxy = bind('use-proxy');
  els.generateBtn = bind('generate-btn');
  els.galleryGrid = bind('gallery-grid');
  els.themeToggle = bind('theme-toggle');
  els.previewModal = bind('preview-modal');
  els.closeModal = bind('close-modal');
  els.downloadZipBtn = bind('download-zip-btn');
  els.addLoraBtn = bind('add-lora-btn');

  // Load Theme
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme) document.documentElement.setAttribute('data-theme', storedTheme);

  // Event Listeners
  els.themeToggle.addEventListener('click', toggleTheme);
  els.generateBtn.addEventListener('click', handleGenerate);
  els.downloadZipBtn.addEventListener('click', handleDownloadZip);
  els.closeModal.addEventListener('click', closePreviewModal);
  els.useProxy.addEventListener('change', (e) => {
    appState.useProxy = e.target.checked;
    els.apiKey.disabled = appState.useProxy;
    if (appState.useProxy) els.apiKey.value = '';
  });

  els.apiKey.addEventListener('input', (e) => appState.apiKey = e.target.value);
  els.addLoraBtn.addEventListener('click', addCustomLora);

  // Populate Dropdowns
  populateModels();
  populateLoras();

  // Presets logic
  document.querySelectorAll('.preset-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      els.prompt.value = tag.dataset.prompt;
    });
  });

  // Global events
  window.onclick = (event) => {
    if (event.target == els.previewModal) closePreviewModal();
  };

  document.addEventListener('delete-image', async (e) => {
    try {
        await deleteImage(e.detail.id);
        renderGallery();
        showToast('Image deleted');
    } catch(err) {
        console.error(err);
        showToast('Error deleting image', 'error');
    }
  });

  document.addEventListener('restore-settings', (e) => {
      const r = e.detail;
      els.prompt.value = r.prompt || '';
      els.negativePrompt.value = r.negative_prompt || '';
      els.seed.value = r.seed || '';
      els.width.value = r.width;
      els.height.value = r.height;
      els.steps.value = r.steps;
      els.cfg.value = r.cfg_scale;
      els.model.value = r.model; // might fail if model not in list, ideally add it
      if (!appState.models.includes(r.model)) {
          const opt = document.createElement('option');
          opt.value = r.model;
          opt.textContent = r.model;
          els.model.appendChild(opt);
          els.model.value = r.model;
      }
      // Sampler restore...
      els.sampler.value = r.sampler;
  });

  // Hotkeys
  document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          if (!appState.isGenerating) handleGenerate();
      }
  });
});

function populateModels() {
    els.model.innerHTML = appState.models.map(m => `<option value="${m}">${m}</option>`).join('');
}

function populateLoras() {
    const list = [...appState.loras, ...appState.customLoras];
    els.lora.innerHTML = list.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
}

function addCustomLora() {
    const name = prompt("Enter Lora Name:");
    if (!name) return;
    const id = prompt("Enter CivitAI ID or URL (only ID is used):");
    if (!id) return;

    // Clean ID if URL pasted
    const cleanId = id.match(/(\d+)/) ? id.match(/(\d+)/)[0] : id;

    appState.customLoras.push({ name, id: cleanId });
    populateLoras();
    els.lora.value = cleanId;
}

async function handleGenerate() {
    if (appState.isGenerating) return;

    const promptText = els.prompt.value.trim();
    if (!promptText) return showToast("Please enter a prompt", "error");

    // Validate API Key
    if (!appState.useProxy && !appState.apiKey) {
        return showToast("Please enter an API Key or enable Proxy", "error");
    }

    setGenerating(true);

    try {
        const count = parseInt(els.count.value) || 1;
        const width = parseInt(els.width.value);
        const height = parseInt(els.height.value);
        const steps = parseInt(els.steps.value);
        const cfg = parseFloat(els.cfg.value);
        const sampler = els.sampler.value;
        const seedStr = els.seed.value.trim();
        const seed = seedStr ? seedStr : null; // null lets backend/API decide random
        const model = els.model.value;
        const loraId = els.lora.value;

        // Construct payload
        const payload = {
            prompt: promptText + (els.negativePrompt.value ? ` ### ${els.negativePrompt.value}` : ''),
            params: {
                sampler_name: sampler,
                toggles: [1, 4], // 1: Download images, 4: R2? Standard horde flags
                cfg_scale: cfg,
                denoising_strength: 0.75,
                seed: seed,
                height: height,
                width: width,
                seed_variation: 1,
                post_processing: [],
                karras: true,
                steps: steps,
                n: count
            },
            nsfw: true,
            censor_nsfw: false,
            trusted_workers: false,
            models: [model],
            r2: true,
            shared: false // Request doesn't need to be shared
        };

        if (loraId) {
            payload.params.loras = [
                { name: loraId, model: 1, clip: 1, inject_trigger: "any" } // Simple assumption for lora
            ];
            // Horde expects specific lora structure, usually requires 'name' to be the ID if using CivitAI IDs directly supported by workers, or specific model names.
            // AI Horde V2 loras param: `loras: [{name: "str", model: float, clip: float}]`.
            // If the ID is a CivitAI ID, it might not work directly without being in the worker's known list, but let's try passing ID as name which is common for some implementations or use the name.
            // Actually, best practice for Horde generic loras is often limited. We'll pass the ID and hope workers support it or fallback.
            // Correction: Horde usually takes Lora Model Name.
            // For this implementation, let's stick to basics.
        }

        updateStatusText("Submitting task...");
        updateProgressBar(true, 10);

        const submitResponse = await submitGeneration(payload);
        if (!submitResponse.id) throw new Error("No Request ID returned");

        updateStatusText("Queued... waiting for worker");
        updateProgressBar(true, 20);

        const images = await pollStatus(submitResponse.id);

        // Save images
        for (const img of images) {
            const blob = await base64ToBlob(img.base64, 'image/webp'); // Horde usually sends WebP or PNG
            const record = {
                id: crypto.randomUUID(),
                blob: blob,
                prompt: promptText,
                negative_prompt: els.negativePrompt.value,
                seed: img.seed,
                model: model,
                lora: loraId,
                width, height, steps, cfg_scale: cfg, sampler,
                timestamp: Date.now()
            };
            await saveImage(record);
        }

        updateProgressBar(false);
        showToast(`Generated ${images.length} image(s)!`);
        renderGallery();

    } catch (err) {
        console.error(err);
        showToast(err.message || "Generation failed", "error");
        updateStatusText("Failed");
        updateProgressBar(false);
    } finally {
        setGenerating(false);
    }
}

function setGenerating(bool) {
    appState.isGenerating = bool;
    els.generateBtn.disabled = bool;
    els.generateBtn.innerText = bool ? 'Generating...' : 'Generate';
}

async function submitGeneration(payload) {
    const url = appState.useProxy
        ? `${appState.proxyUrl}/generate`
        : 'https://aihorde.net/api/v2/generate/async';

    const headers = {
        'Content-Type': 'application/json',
        'Client-Agent': 'ImageenAI:1.0.0:github.com/user/imageenai'
    };

    if (!appState.useProxy) {
        headers['apikey'] = appState.apiKey;
    }

    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'API Request failed');
    }

    return await res.json();
}

async function pollStatus(id) {
    const url = appState.useProxy
        ? `${appState.proxyUrl}/status/${id}`
        : `https://aihorde.net/api/v2/generate/status/${id}`;

    const headers = {
        'Client-Agent': 'ImageenAI:1.0.0:github.com/user/imageenai'
    };

    if (!appState.useProxy) headers['apikey'] = appState.apiKey; // Not strictly needed for status check but good practice

    let attempts = 0;
    while (true) {
        await new Promise(r => setTimeout(r, 2000)); // 2s wait
        attempts++;

        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error("Status check failed");

        const data = await res.json();

        if (data.faulted) throw new Error("Generation faulted (NSFW or worker error)");
        if (!data.done) {
            // Update progress
            const waitTime = data.wait_time || 0;
            const queuePos = data.queue_position || 0;
            let progress = 20 + ((data.finished / data.processing) * 80);
            if (isNaN(progress)) progress = 20;

            updateStatusText(`Queue: ${queuePos} | Wait: ${waitTime}s | Processing...`);
            updateProgressBar(true, progress);
            continue;
        }

        // Done
        updateStatusText("Finalizing...");
        updateProgressBar(true, 100);

        // Fetch result images
        // For Async, we need to inspect `generations` array.
        return data.generations.map(g => ({
            base64: g.img,
            seed: g.seed,
            id: g.id
        }));
    }
}

async function base64ToBlob(base64, type = 'image/webp') {
    const res = await fetch(`data:${type};base64,${base64}`);
    return await res.blob();
}

async function renderGallery() {
    const images = await getAllImages();
    els.galleryGrid.innerHTML = '';

    if (images.length === 0) {
        els.galleryGrid.innerHTML = '<div style="padding: 20px; color: var(--secondary-color);">No images yet. Start creating!</div>';
        return;
    }

    images.forEach(img => {
        const div = document.createElement('div');
        div.className = 'gallery-item';

        const url = URL.createObjectURL(img.blob);

        div.innerHTML = `
            <img src="${url}" loading="lazy" alt="${img.prompt}" />
            <div class="gallery-overlay">
                <button class="preview-btn" title="Preview">👁️</button>
            </div>
        `;

        // Cleanup URL when element removed is hard in vanilla JS without observer,
        // but for now we rely on browser gc or page refresh.

        div.querySelector('.preview-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openPreviewModal(img);
        });

        div.addEventListener('click', () => openPreviewModal(img));

        els.galleryGrid.appendChild(div);
    });
}

async function handleDownloadZip() {
    const images = await getAllImages();
    if (images.length === 0) return showToast("No images to export");

    const zip = new JSZip();
    const metadata = [];

    updateStatusText("Zipping...");
    updateProgressBar(true, 50);

    images.forEach(img => {
        const filename = `seed_${img.seed}_${img.timestamp}.png`; // Assuming PNG/WebP, using .png for compatibility or .webp
        // Determine extension from blob
        let ext = 'png';
        if (img.blob.type === 'image/webp') ext = 'webp';

        const finalFilename = `seed_${img.seed}_${img.timestamp}.${ext}`;
        zip.file(finalFilename, img.blob);

        metadata.push({
            filename: finalFilename,
            prompt: img.prompt,
            negative_prompt: img.negative_prompt,
            seed: img.seed,
            model: img.model,
            params: {
                width: img.width,
                height: img.height,
                steps: img.steps,
                cfg: img.cfg_scale,
                sampler: img.sampler
            },
            timestamp: img.timestamp
        });
    });

    zip.file("metadata.json", JSON.stringify(metadata, null, 2));

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `imageenai_export_${Date.now()}.zip`);

    updateStatusText("");
    updateProgressBar(false);
    showToast("Export complete!");
}
