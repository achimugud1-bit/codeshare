(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);

    const uploadArea = $("upload-area");
    const fileInput = $("file-input");
    const browseBtn = $("btn-browse");
    const changeFileBtn = $("btn-change-file");
    const compressBtn = $("btn-compress");
    const cancelBtn = $("btn-cancel");
    const resetBtn = $("btn-reset");
    const downloadBtn = $("btn-download");

    const uploadSection = $("upload-section");
    const settingsSection = $("settings-section");
    const progressSection = $("progress-section");
    const resultsSection = $("results-section");

    const previewContainer = $("file-preview-container");
    const fileName = $("file-name");
    const fileType = $("file-type");
    const fileSize = $("file-size");
    const fileDimensions = $("file-dimensions");
    const fileDuration = $("file-duration");
    const durationSeparator = $("duration-separator");
    const metaSeparator = $("meta-separator");

    const outputFormat = $("output-format");
    const qualityPreset = $("quality-preset");
    const targetSize = $("target-size");
    const targetUnit = $("target-unit");
    const targetWarning = $("target-warning");
    const resolution = $("resolution");
    const qualitySlider = $("quality-slider");
    const qualityValue = $("quality-value");
    const smartCompression = $("smart-compression");
    const customQualityGroup = $("custom-quality-group");

    const progressTitle = $("progress-title");
    const progressFill = $("progress-fill");
    const progressPercent = $("progress-percent");
    const progressStatus = $("progress-status");
    const progressDetails = $("progress-details");
    const elapsedTime = $("elapsed-time");

    const comparisonContainer = $("comparison-container");
    const statOriginalSize = $("stat-original-size");
    const statCompressedSize = $("stat-compressed-size");
    const statSaved = $("stat-saved");
    const statOriginalRes = $("stat-original-res");
    const statCompressedRes = $("stat-compressed-res");
    const statFormat = $("stat-format");
    const statQuality = $("stat-quality");
    const savingsBefore = $("savings-before");
    const savingsAfter = $("savings-after");
    const savingsPercentText = $("savings-percent-text");

    let currentFile = null;
    let compressedBlob = null;
    let compressedUrl = null;
    let originalUrl = null;
    let cancelled = false;
    let timer = null;
    let startedAt = 0;

    const IMAGE_TYPES = new Set([
      "image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"
    ]);
    const VIDEO_TYPES = new Set([
      "video/mp4", "video/webm", "video/quicktime", "video/x-matroska",
      "video/x-msvideo", "video/ogg"
    ]);

    function isImage(file) {
      return !!file && (file.type.startsWith("image/") || IMAGE_TYPES.has(file.type));
    }

    function isVideo(file) {
      return !!file && (file.type.startsWith("video/") || VIDEO_TYPES.has(file.type));
    }

    function formatBytes(bytes) {
      if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
      if (bytes < 1024) return `${bytes} B`;
      const units = ["KB", "MB", "GB", "TB"];
      let value = bytes / 1024;
      let unit = 0;
      while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
      }
      return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unit]}`;
    }

    function formatDuration(seconds) {
      if (!Number.isFinite(seconds)) return "00:00";
      const s = Math.max(0, Math.round(seconds));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return h
        ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
        : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    }

    function extFromMime(mime) {
      return ({
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/avif": "avif",
        "image/gif": "gif",
        "video/mp4": "mp4",
        "video/webm": "webm"
      })[mime] || "bin";
    }

    function setHidden(el, hidden) {
      if (!el) return;
      el.classList.toggle("hidden", hidden);
    }

    function showSection(section) {
      [uploadSection, settingsSection, progressSection, resultsSection].forEach((s) => {
        if (s) setHidden(s, s !== section);
      });
    }

    function setProgress(percent, status, details = "") {
      const p = Math.max(0, Math.min(100, Math.round(percent)));
      if (progressFill) progressFill.style.width = `${p}%`;
      if (progressPercent) progressPercent.textContent = `${p}%`;
      if (progressStatus) progressStatus.textContent = status;
      if (progressDetails) progressDetails.textContent = details;
    }

    function startTimer() {
      startedAt = Date.now();
      clearInterval(timer);
      timer = setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAt) / 1000);
        if (elapsedTime) elapsedTime.textContent = `Elapsed: ${seconds}s`;
      }, 250);
    }

    function stopTimer() {
      clearInterval(timer);
      timer = null;
    }

    function revokeUrls() {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (compressedUrl) URL.revokeObjectURL(compressedUrl);
      originalUrl = null;
      compressedUrl = null;
    }

    function resetResultState() {
      compressedBlob = null;
      revokeUrls();
      if (comparisonContainer) comparisonContainer.innerHTML = "";
    }

    function validateFile(file) {
      if (!file) return false;
      if (!isImage(file) && !isVideo(file)) {
        alert("Please choose an image or video file.");
        return false;
      }
      // Browser-side processing can use a lot of RAM. This prevents accidental browser crashes.
      const maxBytes = 1024 * 1024 * 1024; // 1 GB
      if (file.size > maxBytes) {
        alert("That file is larger than 1 GB. Please choose a smaller file.");
        return false;
      }
      return true;
    }

    function getOutputMime(file) {
      const requested = outputFormat?.value || "auto";
      if (requested !== "auto") return requested;

      if (isImage(file)) {
        if (file.type === "image/png" && /alpha|transparent/i.test(file.name)) return "image/webp";
        return file.type === "image/jpeg" || file.type === "image/png" ? "image/webp" : file.type;
      }
      return file.type === "video/mp4" ? "video/webm" : file.type;
    }

    function getQuality() {
      if (qualityPreset?.value === "max") return 0.92;
      if (qualityPreset?.value === "high") return 0.84;
      if (qualityPreset?.value === "small") return 0.55;
      if (qualityPreset?.value === "custom") return Number(qualitySlider?.value || 75) / 100;
      return 0.75;
    }

    function getMaxDimension(width, height) {
      const selected = resolution?.value || "original";
      const limits = {
        "4k": 2160,
        "1440p": 1440,
        "1080p": 1080,
        "720p": 720,
        "480p": 480
      };
      if (selected === "original" || !limits[selected]) {
        return Math.max(width, height);
      }
      return limits[selected];
    }

    function scaleDimensions(width, height, maxDimension) {
      if (!maxDimension || Math.max(width, height) <= maxDimension) {
        return { width, height };
      }
      const ratio = maxDimension / Math.max(width, height);
      return {
        width: Math.max(1, Math.round(width * ratio)),
        height: Math.max(1, Math.round(height * ratio))
      };
    }

    function chooseImageFormat(file) {
      const requested = outputFormat?.value || "auto";
      if (requested.startsWith("image/")) return requested;
      if (file.type === "image/png" || file.type === "image/jpeg") return "image/webp";
      if (file.type === "image/webp") return "image/webp";
      if (file.type === "image/avif" && "image/avif" in document.createElement("canvas").toDataURL ? false : false) {
        return "image/webp";
      }
      return "image/webp";
    }

    async function canvasToBlob(canvas, mime, quality) {
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error(`This browser could not create a ${mime} image.`));
        }, mime, quality);
      });
    }

    async function compressImage(file) {
      setProgress(10, "Reading image...", file.name);

      const img = new Image();
      const url = URL.createObjectURL(file);
      try {
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error("The image could not be decoded by this browser."));
          img.src = url;
        });

        if (cancelled) throw new DOMException("Cancelled", "AbortError");

        const maxDimension = getMaxDimension(img.naturalWidth, img.naturalHeight);
        let dims = scaleDimensions(img.naturalWidth, img.naturalHeight, maxDimension);
        let mime = chooseImageFormat(file);
        if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
          mime = "image/webp";
        }

        setProgress(35, "Compressing image...", `${dims.width} × ${dims.height} • ${mime}`);

        const canvas = document.createElement("canvas");
        canvas.width = dims.width;
        canvas.height = dims.height;
        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) throw new Error("Canvas is not supported by this browser.");

        if (mime === "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, dims.width, dims.height);
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, dims.width, dims.height);

        let quality = getQuality();
        let blob = await canvasToBlob(canvas, mime, quality);

        // Try to honor a target size for images by reducing quality and, if necessary,
        // resolution. Exact target sizes are not guaranteed for every image.
        const target = getTargetBytes();
        if (target && blob.size > target && mime !== "image/png") {
          for (let q = quality - 0.08; q >= 0.25 && blob.size > target; q -= 0.08) {
            if (cancelled) throw new DOMException("Cancelled", "AbortError");
            blob = await canvasToBlob(canvas, mime, q);
            setProgress(35 + Math.min(45, Math.round((quality - q) * 100)), "Optimizing image size...", formatBytes(blob.size));
          }
        }

        setProgress(92, "Finishing...", formatBytes(blob.size));
        return {
          blob,
          width: dims.width,
          height: dims.height,
          mime,
          quality
        };
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    function getTargetBytes() {
      const value = Number(targetSize?.value);
      if (!Number.isFinite(value) || value <= 0) return null;
      return value * (targetUnit?.value === "KB" ? 1024 : 1024 * 1024);
    }

    function updateTargetWarning() {
      if (!targetWarning) return;
      const target = getTargetBytes();
      if (!target || !currentFile) {
        targetWarning.textContent = "";
        return;
      }
      if (target >= currentFile.size) {
        targetWarning.textContent = "Target is larger than the original file; compression may not reduce the size.";
      } else {
        targetWarning.textContent = "";
      }
    }

    function createImagePreview(file) {
      originalUrl = URL.createObjectURL(file);
      const img = document.createElement("img");
      img.src = originalUrl;
      img.alt = "Selected image preview";
      img.loading = "eager";
      previewContainer.innerHTML = "";
      previewContainer.appendChild(img);
    }

    function createVideoPreview(file) {
      originalUrl = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.src = originalUrl;
      video.controls = true;
      video.muted = true;
      video.preload = "metadata";
      video.playsInline = true;
      previewContainer.innerHTML = "";
      previewContainer.appendChild(video);

      video.addEventListener("loadedmetadata", () => {
        fileDimensions.textContent = `${video.videoWidth} × ${video.videoHeight}`;
        fileDuration.textContent = formatDuration(video.duration);
        setHidden(durationSeparator, false);
      }, { once: true });
    }

    function showFile(file) {
      if (!validateFile(file)) return;

      currentFile = file;
      resetResultState();
      cancelled = false;
      revokeUrls();

      fileName.textContent = file.name;
      fileType.textContent = (file.type || "unknown").split("/").pop().toUpperCase();
      fileSize.textContent = formatBytes(file.size);

      setHidden(durationSeparator, !isVideo(file));
      setHidden(metaSeparator, false);

      if (isImage(file)) {
        createImagePreview(file);

        const img = previewContainer.querySelector("img");
        img.addEventListener("load", () => {
          fileDimensions.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
        }, { once: true });
      } else {
        createVideoPreview(file);
        fileDimensions.textContent = "Reading…";
      }

      if (outputFormat) {
        Array.from(outputFormat.options).forEach((option) => {
          option.disabled = option.value.startsWith("video/") ? isImage(file) : option.value.startsWith("image/") ? isVideo(file) : false;
        });
        outputFormat.value = "auto";
      }

      if (resolution) resolution.value = "original";
      if (qualityPreset) qualityPreset.value = "balanced";
      if (qualitySlider) qualitySlider.value = "75";
      if (qualityValue) qualityValue.textContent = "75";

      updateTargetWarning();
      showSection(settingsSection);
      settingsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function renderResult(originalFile, blob, info) {
      compressedUrl = URL.createObjectURL(blob);
      comparisonContainer.innerHTML = "";

      const before = document.createElement("div");
      before.className = "comparison-item";
      const after = document.createElement("div");
      after.className = "comparison-item";

      const beforeTitle = document.createElement("h3");
      beforeTitle.textContent = "Before";
      const afterTitle = document.createElement("h3");
      afterTitle.textContent = "After";

      if (isImage(originalFile)) {
        const beforeImg = document.createElement("img");
        beforeImg.src = originalUrl || URL.createObjectURL(originalFile);
        beforeImg.alt = "Original image";
        const afterImg = document.createElement("img");
        afterImg.src = compressedUrl;
        afterImg.alt = "Compressed image";
        before.append(beforeTitle, beforeImg);
        after.append(afterTitle, afterImg);
      } else {
        const beforeVideo = document.createElement("video");
        beforeVideo.src = originalUrl || URL.createObjectURL(originalFile);
        beforeVideo.controls = true;
        beforeVideo.muted = true;
        beforeVideo.playsInline = true;

        const afterVideo = document.createElement("video");
        afterVideo.src = compressedUrl;
        afterVideo.controls = true;
        afterVideo.muted = true;
        afterVideo.playsInline = true;

        before.append(beforeTitle, beforeVideo);
        after.append(afterTitle, afterVideo);
      }

      comparisonContainer.append(before, after);

      const saved = originalFile.size > 0
        ? Math.max(0, (1 - blob.size / originalFile.size) * 100)
        : 0;

      statOriginalSize.textContent = formatBytes(originalFile.size);
      statCompressedSize.textContent = formatBytes(blob.size);
      statSaved.textContent = `${saved.toFixed(1)}%`;
      savingsPercentText.textContent = `${saved.toFixed(0)}% smaller`;
      savingsBefore.style.width = "100%";
      savingsAfter.style.width = `${Math.max(1, 100 - saved)}%`;

      statOriginalRes.textContent = `${info.originalWidth || "—"} × ${info.originalHeight || "—"}`;
      statCompressedRes.textContent = `${info.width || "—"} × ${info.height || "—"}`;
      statFormat.textContent = extFromMime(info.mime).toUpperCase();
      statQuality.textContent = qualityPreset?.selectedOptions?.[0]?.textContent || "Balanced";
    }

    async function compressVideo(file) {
      // Native browser video encoding is not reliably available across browsers.
      // We still accept the file and provide a useful preview/error instead of
      // pretending that compression happened.
      throw new Error(
        "Video compression needs an FFmpeg/WebCodecs encoding engine. Image compression is ready, but this browser build does not include a video encoder."
      );
    }

    async function doCompression() {
      if (!currentFile) {
        alert("Choose an image or video first.");
        return;
      }

      cancelled = false;
      compressedBlob = null;
      showSection(progressSection);
      startTimer();

      compressBtn.disabled = true;
      cancelBtn.disabled = false;

      try {
        let result;

        if (isImage(currentFile)) {
          result = await compressImage(currentFile);
          if (cancelled) throw new DOMException("Cancelled", "AbortError");

          if (result.blob.size >= currentFile.size && smartCompression?.checked) {
            // If compression made the file larger, keep the original instead.
            result.blob = currentFile;
            result.mime = currentFile.type || result.mime;
            result.width = result.width || 0;
            result.height = result.height || 0;
          }

          compressedBlob = result.blob;
          renderResult(currentFile, compressedBlob, {
            ...result,
            originalWidth: previewContainer.querySelector("img")?.naturalWidth,
            originalHeight: previewContainer.querySelector("img")?.naturalHeight
          });
        } else {
          setProgress(5, "Preparing video...", "Checking browser video encoding support…");
          result = await compressVideo(currentFile);
          compressedBlob = result.blob;
          renderResult(currentFile, compressedBlob, result);
        }

        setProgress(100, "Compression complete", formatBytes(compressedBlob.size));
        stopTimer();
        showSection(resultsSection);
        resultsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (err) {
        stopTimer();
        if (err?.name === "AbortError" || cancelled) {
          showSection(settingsSection);
          return;
        }
        console.error(err);
        showSection(settingsSection);
        alert(err?.message || "Compression failed. Please try another file or browser.");
      } finally {
        compressBtn.disabled = false;
        cancelBtn.disabled = true;
      }
    }

    function downloadResult() {
      if (!compressedBlob || !currentFile) return;
      const ext = extFromMime(compressedBlob.type || getOutputMime(currentFile));
      const base = currentFile.name.replace(/\.[^.]+$/, "");
      const filename = `${base}-compressed.${ext}`;

      const a = document.createElement("a");
      a.href = compressedUrl || URL.createObjectURL(compressedBlob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    function resetAll() {
      cancelled = true;
      currentFile = null;
      compressedBlob = null;
      stopTimer();
      revokeUrls();
      if (fileInput) fileInput.value = "";
      if (previewContainer) previewContainer.innerHTML = "";
      if (comparisonContainer) comparisonContainer.innerHTML = "";
      showSection(uploadSection);
      setProgress(0, "Initializing compression engine...", "");
      uploadSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    browseBtn?.addEventListener("click", (event) => {
      event.stopPropagation();
      fileInput?.click();
    });

    uploadArea?.addEventListener("click", (event) => {
      if (event.target === browseBtn) return;
      fileInput?.click();
    });

    uploadArea?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        fileInput?.click();
      }
    });

    fileInput?.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (file) showFile(file);
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      uploadArea?.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        uploadArea.classList.add("drag-over");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      uploadArea?.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        uploadArea.classList.remove("drag-over");
      });
    });

    uploadArea?.addEventListener("drop", (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (file) showFile(file);
    });

    changeFileBtn?.addEventListener("click", () => {
      fileInput.value = "";
      fileInput.click();
    });

    compressBtn?.addEventListener("click", doCompression);

    cancelBtn?.addEventListener("click", () => {
      cancelled = true;
      cancelBtn.disabled = true;
      setProgress(0, "Cancelling...", "");
    });

    downloadBtn?.addEventListener("click", downloadResult);
    resetBtn?.addEventListener("click", resetAll);

    qualitySlider?.addEventListener("input", () => {
      if (qualityValue) qualityValue.textContent = qualitySlider.value;
    });

    qualityPreset?.addEventListener("change", () => {
      const presets = { max: 92, high: 84, balanced: 75, small: 55 };
      if (presets[qualityPreset.value] && qualitySlider) {
        qualitySlider.value = String(presets[qualityPreset.value]);
        if (qualityValue) qualityValue.textContent = String(presets[qualityPreset.value]);
      }
      setHidden(customQualityGroup, qualityPreset.value !== "custom");
    });

    targetSize?.addEventListener("input", updateTargetWarning);
    targetUnit?.addEventListener("change", updateTargetWarning);

    setHidden(customQualityGroup, qualityPreset?.value !== "custom");
    showSection(uploadSection);
  });
})();
