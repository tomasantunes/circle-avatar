$(function () {
  const canvas = document.getElementById("avatarCanvas");
  const ctx = canvas.getContext("2d");
  const $download = $("#downloadPng");
  const $zoom = $("#zoomRange");
  const state = {
    image: null,
    filename: "avatar",
    mode: "move",
    scale: 1,
    minScale: 0.2,
    imageX: 0,
    imageY: 0,
    crop: { x: 120, y: 120, w: 480, h: 480 },
    drag: null
  };

  const checker = document.createElement("canvas");
  checker.width = 32;
  checker.height = 32;
  const checkerCtx = checker.getContext("2d");
  checkerCtx.fillStyle = "#ffffff";
  checkerCtx.fillRect(0, 0, 32, 32);
  checkerCtx.fillStyle = "#dbe2ea";
  checkerCtx.fillRect(0, 0, 16, 16);
  checkerCtx.fillRect(16, 16, 16, 16);

  function drawEmpty() {
    drawChecker();
    drawCircleGuide();
    ctx.fillStyle = "#526173";
    ctx.font = "700 24px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Carrega uma fotografia", canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillStyle = "#6f7d8e";
    ctx.fillText("Depois arrasta a foto ou o corte retangular", canvas.width / 2, canvas.height / 2 + 24);
  }

  function drawChecker() {
    const pattern = ctx.createPattern(checker, "repeat");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawCircleGuide() {
    const circle = getCircleFromCrop();
    ctx.save();
    ctx.strokeStyle = "rgba(31, 138, 112, 0.95)";
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function getCircleFromCrop() {
    const size = Math.min(state.crop.w, state.crop.h);
    return {
      x: state.crop.x + state.crop.w / 2,
      y: state.crop.y + state.crop.h / 2,
      r: size / 2
    };
  }

  function draw() {
    if (!state.image) {
      drawEmpty();
      return;
    }

    drawChecker();
    ctx.save();
    ctx.drawImage(
      state.image,
      state.imageX,
      state.imageY,
      state.image.width * state.scale,
      state.image.height * state.scale
    );
    ctx.restore();

    drawCropOverlay();
    drawCircleGuide();
  }

  function drawCropOverlay() {
    const crop = state.crop;
    ctx.save();
    ctx.fillStyle = "rgba(24, 32, 41, 0.42)";
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.rect(crop.x, crop.y, crop.w, crop.h);
    ctx.fill("evenodd");

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 7]);
    ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);

    ctx.setLineDash([]);
    ctx.strokeStyle = "#1f8a70";
    ctx.lineWidth = 3;
    ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);

    const handles = getHandles();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#1f8a70";
    handles.forEach((handle) => {
      ctx.beginPath();
      ctx.rect(handle.x - 7, handle.y - 7, 14, 14);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  function getHandles() {
    const c = state.crop;
    return [
      { name: "nw", x: c.x, y: c.y },
      { name: "ne", x: c.x + c.w, y: c.y },
      { name: "sw", x: c.x, y: c.y + c.h },
      { name: "se", x: c.x + c.w, y: c.y + c.h }
    ];
  }

  function resetForImage() {
    const maxCrop = canvas.width * 0.72;
    state.crop = {
      x: (canvas.width - maxCrop) / 2,
      y: (canvas.height - maxCrop) / 2,
      w: maxCrop,
      h: maxCrop
    };
    const coverScale = Math.max(state.crop.w / state.image.width, state.crop.h / state.image.height);
    state.minScale = Math.max(0.05, coverScale * 0.35);
    state.scale = coverScale;
    state.imageX = state.crop.x + (state.crop.w - state.image.width * state.scale) / 2;
    state.imageY = state.crop.y + (state.crop.h - state.image.height * state.scale) / 2;
    $zoom.attr({ min: state.minScale.toFixed(2), max: Math.max(4, coverScale * 4).toFixed(2) });
    $zoom.val(state.scale);
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const touch = event.originalEvent.touches ? event.originalEvent.touches[0] : event;
    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function hitHandle(point) {
    return getHandles().find((handle) => Math.abs(point.x - handle.x) <= 14 && Math.abs(point.y - handle.y) <= 14);
  }

  function pointInCrop(point) {
    const c = state.crop;
    return point.x >= c.x && point.x <= c.x + c.w && point.y >= c.y && point.y <= c.y + c.h;
  }

  function clampCrop() {
    const min = 80;
    state.crop.w = Math.max(min, Math.min(canvas.width, state.crop.w));
    state.crop.h = Math.max(min, Math.min(canvas.height, state.crop.h));
    state.crop.x = Math.max(0, Math.min(canvas.width - state.crop.w, state.crop.x));
    state.crop.y = Math.max(0, Math.min(canvas.height - state.crop.h, state.crop.y));
  }

  function resizeCrop(handle, dx, dy) {
    const c = state.crop;
    if (handle.includes("w")) {
      c.x += dx;
      c.w -= dx;
    }
    if (handle.includes("e")) {
      c.w += dx;
    }
    if (handle.includes("n")) {
      c.y += dy;
      c.h -= dy;
    }
    if (handle.includes("s")) {
      c.h += dy;
    }
    clampCrop();
  }

  function setMode(mode) {
    state.mode = mode;
    $("#moveMode").toggleClass("active", mode === "move");
    $("#cropMode").toggleClass("active", mode === "crop");
  }

  function nudge(direction) {
    const amount = 8;
    const target = state.mode === "crop" ? state.crop : state;
    if (direction === "left") target[state.mode === "crop" ? "x" : "imageX"] -= amount;
    if (direction === "right") target[state.mode === "crop" ? "x" : "imageX"] += amount;
    if (direction === "up") target[state.mode === "crop" ? "y" : "imageY"] -= amount;
    if (direction === "down") target[state.mode === "crop" ? "y" : "imageY"] += amount;
    if (state.mode === "crop") clampCrop();
    draw();
  }

  function exportAvatar() {
    if (!state.image) return;

    const size = Number($("#exportSize").val());
    const output = document.createElement("canvas");
    output.width = size;
    output.height = size;
    const out = output.getContext("2d");
    const crop = state.crop;

    const sx = (crop.x - state.imageX) / state.scale;
    const sy = (crop.y - state.imageY) / state.scale;
    const sw = crop.w / state.scale;
    const sh = crop.h / state.scale;

    out.clearRect(0, 0, size, size);
    out.save();
    out.beginPath();
    out.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    out.clip();
    out.drawImage(state.image, sx, sy, sw, sh, 0, 0, size, size);
    out.restore();

    const link = document.createElement("a");
    link.download = `${state.filename}-circle.png`;
    link.href = output.toDataURL("image/png");
    link.click();
  }

  $("#photoInput").on("change", function () {
    const file = this.files && this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        state.image = img;
        state.filename = file.name.replace(/\.[^.]+$/, "") || "avatar";
        resetForImage();
        $download.prop("disabled", false);
        draw();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  $("#moveMode").on("click", () => setMode("move"));
  $("#cropMode").on("click", () => setMode("crop"));
  $("[data-nudge]").on("click", function () {
    if (state.image) nudge($(this).data("nudge"));
  });

  $("#centerImage").on("click", function () {
    if (!state.image) return;
    state.imageX = state.crop.x + (state.crop.w - state.image.width * state.scale) / 2;
    state.imageY = state.crop.y + (state.crop.h - state.image.height * state.scale) / 2;
    draw();
  });

  $zoom.on("input", function () {
    if (!state.image) return;
    const nextScale = Number(this.value);
    const circle = getCircleFromCrop();
    const imagePointX = (circle.x - state.imageX) / state.scale;
    const imagePointY = (circle.y - state.imageY) / state.scale;
    state.scale = nextScale;
    state.imageX = circle.x - imagePointX * state.scale;
    state.imageY = circle.y - imagePointY * state.scale;
    draw();
  });

  $("#resetEditor").on("click", function () {
    if (!state.image) {
      draw();
      return;
    }
    resetForImage();
    draw();
  });

  $("#downloadPng").on("click", exportAvatar);

  $("#avatarCanvas").on("mousedown touchstart", function (event) {
    if (!state.image) return;
    event.preventDefault();
    const point = canvasPoint(event);
    const handle = hitHandle(point);

    if (state.mode === "crop" && handle) {
      state.drag = { type: "resize", handle: handle.name, last: point };
    } else if (state.mode === "crop" && pointInCrop(point)) {
      state.drag = { type: "crop", last: point };
    } else {
      state.drag = { type: "image", last: point };
    }
  });

  $(window).on("mousemove touchmove", function (event) {
    if (!state.drag) return;
    event.preventDefault();
    const point = canvasPoint(event);
    const dx = point.x - state.drag.last.x;
    const dy = point.y - state.drag.last.y;

    if (state.drag.type === "image") {
      state.imageX += dx;
      state.imageY += dy;
    }
    if (state.drag.type === "crop") {
      state.crop.x += dx;
      state.crop.y += dy;
      clampCrop();
    }
    if (state.drag.type === "resize") {
      resizeCrop(state.drag.handle, dx, dy);
    }

    state.drag.last = point;
    draw();
  });

  $(window).on("mouseup touchend touchcancel", function () {
    state.drag = null;
  });

  draw();
});
