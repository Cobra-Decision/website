import {
  RotateCcwIcon,
  RotateCwIcon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "./icons";

export function ImageCropEditor() {
  return (
    <div
      class="form-control sm:col-span-2 space-y-2"
      x-data={`{
        rawFile: null,
        previewSrc: '',
        imgNaturalW: 0,
        imgNaturalH: 0,
        cropAspect: '16/9',
        rotation: 0,
        flipH: 1,
        flipV: 1,
        zoom: 0,
        offsetX: 0,
        offsetY: 0,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        isEditing: false,

        get isRtl() {
          return document.documentElement.dir === 'rtl';
        },

        get computedZoom() {
          const num = Number(this.zoom) || 0;
          return 1 + (num / 100) * 2;
        },

        move(dx, dy) {
          // Adjust dx for RTL if dir is RTL so arrow left/right is physically correct
          const dirMult = this.isRtl ? -1 : 1;
          this.offsetX += dx * dirMult;
          this.offsetY += dy;
        },

        align(preset) {
          const is90 = Math.abs(this.rotation % 180) === 90;
          const currentW = is90 ? this.imgNaturalH : this.imgNaturalW;
          const currentH = is90 ? this.imgNaturalW : this.imgNaturalH;
          const previewBox = document.getElementById('image-crop-viewport');
          const boxW = previewBox ? previewBox.clientWidth : 400;
          const boxH = previewBox ? previewBox.clientHeight : 225;

          const fitScale = Math.min(boxW / (currentW || boxW), boxH / (currentH || boxH)) * this.computedZoom;
          const scaledW = currentW * fitScale;
          const scaledH = currentH * fitScale;

          if (preset === 'center') {
            this.offsetX = 0;
            this.offsetY = 0;
          } else if (preset === 'top') {
            this.offsetY = (scaledH - boxH) / 2;
          } else if (preset === 'bottom') {
            this.offsetY = -(scaledH - boxH) / 2;
          } else if (preset === 'left') {
            this.offsetX = (scaledW - boxW) / 2;
          } else if (preset === 'right') {
            this.offsetX = -(scaledW - boxW) / 2;
          }
        },

        stepZoom(val) {
          const current = Number(this.zoom) || 0;
          this.zoom = Math.min(100, Math.max(0, current + val));
        },

        onFileChange(e) {
          const file = e.target.files?.[0];
          if (!file) return;
          this.rawFile = file;
          const reader = new FileReader();
          reader.onload = (evt) => {
            this.previewSrc = evt.target.result;
            const tempImg = new Image();
            tempImg.onload = () => {
              this.imgNaturalW = tempImg.naturalWidth;
              this.imgNaturalH = tempImg.naturalHeight;
              this.isEditing = true;
              this.rotation = 0;
              this.flipH = 1;
              this.flipV = 1;
              this.zoom = 0;
              this.offsetX = 0;
              this.offsetY = 0;
            };
            tempImg.src = evt.target.result;
          };
          reader.readAsDataURL(file);
        },

        rotate(deg) {
          this.rotation = (this.rotation + deg) % 360;
        },

        toggleFlipH() {
          this.flipH = this.flipH * -1;
        },

        toggleFlipV() {
          this.flipV = this.flipV * -1;
        },

        startDrag(e) {
          this.isDragging = true;
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          this.dragStartX = clientX - this.offsetX;
          this.dragStartY = clientY - this.offsetY;
        },

        onDrag(e) {
          if (!this.isDragging) return;
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          this.offsetX = clientX - this.dragStartX;
          this.offsetY = clientY - this.dragStartY;
        },

        stopDrag() {
          this.isDragging = false;
        },

        resetTransform() {
          this.rotation = 0;
          this.flipH = 1;
          this.flipV = 1;
          this.zoom = 0;
          this.offsetX = 0;
          this.offsetY = 0;
        },

        applyEdit() {
          if (!this.previewSrc) return;
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let w = img.naturalWidth;
            let h = img.naturalHeight;

            let targetW = w;
            let targetH = h;
            if (this.cropAspect === '16/9') {
              targetW = 1280;
              targetH = 720;
            } else if (this.cropAspect === '1/1') {
              targetW = 800;
              targetH = 800;
            }

            canvas.width = targetW;
            canvas.height = targetH;

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, targetW, targetH);

            ctx.save();
            const previewBox = document.getElementById('image-crop-viewport');
            const previewW = previewBox ? previewBox.clientWidth : 320;
            const previewH = previewBox ? previewBox.clientHeight : 180;
            const scaleFactor = targetW / previewW;
            const effectiveZoom = 1 + ((Number(this.zoom) || 0) / 100) * 2;

            ctx.translate(targetW / 2 + this.offsetX * scaleFactor, targetH / 2 + this.offsetY * scaleFactor);
            ctx.rotate((this.rotation * Math.PI) / 180);
            ctx.scale(this.flipH * effectiveZoom, this.flipV * effectiveZoom);

            const is90 = Math.abs(this.rotation % 180) === 90;
            const rotW = is90 ? h : w;
            const rotH = is90 ? w : h;
            const fitScale = Math.min(targetW / rotW, targetH / rotH);
            const drawW = w * fitScale;
            const drawH = h * fitScale;
            ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.restore();

            canvas.toBlob((blob) => {
              if (!blob) return;
              const editedFile = new File([blob], this.rawFile?.name || 'edited_image.webp', { type: 'image/webp' });
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(editedFile);
              const input = document.getElementById('meet-image-file-input');
              if (input) input.files = dataTransfer.files;
              this.previewSrc = canvas.toDataURL('image/webp');
              this.isEditing = false;
            }, 'image/webp', 0.92);
          };
          img.src = this.previewSrc;
        }
      }`}
    >
      <label class="label-text font-medium">Upload Image / Cover (PNG, JPG, WebP - max 5MB)</label>
      <input
        id="meet-image-file-input"
        class="file-input file-input-bordered w-full"
        name="image_file"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        x-on:change="onFileChange($event)"
      />

      {/* Unified Mobile & Desktop Crop & Transform Editor */}
      <template x-if="isEditing">
        <div class="rounded-2xl border border-primary/40 bg-base-200 p-4 space-y-4 mt-2 select-none">
          {/* Header Controls */}
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-300 pb-3">
            <span class="text-xs font-bold text-primary">Crop & Adjust Position</span>
            <div class="flex items-center gap-1">
              <button type="button" class="btn btn-xs btn-outline gap-1" x-on:click="rotate(-90)" title="Rotate Left">
                <RotateCcwIcon class="h-3.5 w-3.5" /> 90°
              </button>
              <button type="button" class="btn btn-xs btn-outline gap-1" x-on:click="rotate(90)" title="Rotate Right">
                <RotateCwIcon class="h-3.5 w-3.5" /> 90°
              </button>
              <button type="button" class="btn btn-xs btn-outline p-1.5" x-on:click="toggleFlipH()" title="Flip Horizontal">
                <FlipHorizontalIcon class="h-3.5 w-3.5" />
              </button>
              <button type="button" class="btn btn-xs btn-outline p-1.5" x-on:click="toggleFlipV()" title="Flip Vertical">
                <FlipVerticalIcon class="h-3.5 w-3.5" />
              </button>
              <button type="button" class="btn btn-xs btn-ghost text-error" x-on:click="resetTransform()">Reset</button>
            </div>
          </div>

          {/* Aspect Ratio & Zoom Toolbar */}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div class="flex items-center gap-2">
              <span class="font-medium text-base-content/70">Frame:</span>
              <label class="cursor-pointer label gap-1 py-0">
                <input type="radio" name="crop_mode" value="16/9" x-model="cropAspect" class="radio radio-primary radio-xs" />
                <span class="label-text text-xs font-semibold">16:9 Banner</span>
              </label>
              <label class="cursor-pointer label gap-1 py-0">
                <input type="radio" name="crop_mode" value="1/1" x-model="cropAspect" class="radio radio-primary radio-xs" />
                <span class="label-text text-xs">1:1 Square</span>
              </label>
            </div>

            <div class="flex items-center gap-2">
              <span class="font-medium text-base-content/70">Zoom:</span>
              <button type="button" class="btn btn-xs btn-outline p-1" x-on:click="stepZoom(-1)" title="Zoom Out">
                <ZoomOutIcon class="h-3.5 w-3.5" />
              </button>
              <input type="range" min="0" max="100" step="1" x-model="zoom" x-on:input="zoom = Number($event.target.value)" class="range range-primary range-xs flex-1" />
              <button type="button" class="btn btn-xs btn-outline p-1" x-on:click="stepZoom(1)" title="Zoom In">
                <ZoomInIcon class="h-3.5 w-3.5" />
              </button>
              <span class="text-xs w-8 text-right" x-text="(Number(zoom) || 0) + '%'"></span>
            </div>
          </div>

          {/* Quick Alignments & Direction Pad (Fully responsive & touch friendly) */}
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl bg-base-100 p-2.5 border border-base-300">
            {/* Alignment Buttons */}
            <div class="flex flex-wrap items-center gap-1">
              <span class="text-xs font-semibold text-base-content/70 mr-1">Align:</span>
              <button type="button" class="btn btn-xs btn-outline" x-on:click="align('center')">Center</button>
              <button type="button" class="btn btn-xs btn-outline" x-on:click="align('top')">Top</button>
              <button type="button" class="btn btn-xs btn-outline" x-on:click="align('bottom')">Bottom</button>
              <button type="button" class="btn btn-xs btn-outline" x-on:click="align('left')">Left</button>
              <button type="button" class="btn btn-xs btn-outline" x-on:click="align('right')">Right</button>
            </div>

            {/* Direction Arrows */}
            <div class="flex items-center gap-1 self-end sm:self-auto" dir="ltr">
              <button type="button" class="btn btn-xs btn-outline w-7 h-7 p-0 flex items-center justify-center" x-on:click="move(5, 0)" title="Move Left">
                <ChevronLeftIcon class="h-3.5 w-3.5" />
              </button>
              <button type="button" class="btn btn-xs btn-outline w-7 h-7 p-0 flex items-center justify-center" x-on:click="move(0, 5)" title="Move Up">
                <ChevronUpIcon class="h-3.5 w-3.5" />
              </button>
              <button type="button" class="btn btn-xs btn-outline w-7 h-7 p-0 flex items-center justify-center" x-on:click="move(0, -5)" title="Move Down">
                <ChevronDownIcon class="h-3.5 w-3.5" />
              </button>
              <button type="button" class="btn btn-xs btn-outline w-7 h-7 p-0 flex items-center justify-center" x-on:click="move(-5, 0)" title="Move Right">
                <ChevronRightIcon class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Viewport Box (Touch + Drag) */}
          <div class="flex justify-center bg-base-300 rounded-xl p-3 overflow-hidden">
            <div
              id="image-crop-viewport"
              class="relative overflow-hidden rounded-lg bg-neutral border-2 border-dashed border-primary/70 cursor-grab active:cursor-grabbing flex items-center justify-center touch-none"
              x-bind:style="cropAspect === '16/9' ? 'width: 100%; max-width: 440px; aspect-ratio: 16/9;' : 'width: 260px; height: 260px;'"
              x-on:mousedown="startDrag($event)"
              x-on:mousemove="onDrag($event)"
              x-on:mouseup="stopDrag()"
              x-on:mouseleave="stopDrag()"
              x-on:touchstart="startDrag($event)"
              x-on:touchmove="onDrag($event)"
              x-on:touchend="stopDrag()"
            >
              <img
                x-bind:src="previewSrc"
                class="max-h-full max-w-full object-contain pointer-events-none transition-transform duration-75"
                x-bind:style="`transform: translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg) scale(${flipH * computedZoom}, ${flipV * computedZoom});`"
                alt="Crop target"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div class="flex items-center justify-between border-t border-base-300 pt-3">
            <span class="text-xs text-base-content/60">Touch & drag image to reposition</span>
            <div class="flex gap-2">
              <button type="button" class="btn btn-sm btn-ghost" x-on:click="isEditing = false">Cancel</button>
              <button type="button" class="btn btn-sm btn-primary" x-on:click="applyEdit()">Apply & Save Crop</button>
            </div>
          </div>
        </div>
      </template>
    </div>
  );
}
