<template>
  <div class="viewer-control" ref="rootRef">
    <button class="header-btn" :class="{ active: remoteEnabled }" @click="togglePopover">
      <span class="material-symbols-rounded">cast</span>
      Viewer
    </button>

    <div v-if="popoverOpen" class="viewer-popover">
      <div class="popover-title">Viewer Output</div>

      <!-- Local second-monitor player window -->
      <label class="toggle-row">
        <span class="toggle-label">
          <span class="material-symbols-rounded">desktop_windows</span>
          Player window
        </span>
        <input type="checkbox" :checked="playerWindowOpen" @change="onTogglePlayerWindow" />
      </label>

      <!-- Remote LAN browser viewer -->
      <label class="toggle-row">
        <span class="toggle-label">
          <span class="material-symbols-rounded">tablet_android</span>
          Remote viewer
        </span>
        <input type="checkbox" :checked="remoteEnabled" @change="onToggleRemote" />
      </label>

      <div v-if="remoteEnabled" class="remote-detail">
        <template v-if="primaryUrl">
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="Viewer URL QR code" class="qr" width="160" height="160" />
          <div class="url-text" title="Open this on the tablet browser">{{ primaryUrl }}</div>
          <div v-if="otherUrls.length" class="url-alt">
            also: {{ otherUrls.join(', ') }}
          </div>
        </template>
        <div v-else class="url-none">
          No LAN address found. Connect this machine to Wi-Fi/Ethernet.
        </div>
        <div class="warn">Anyone on this network can view — LAN only, no password.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import QRCode from 'qrcode';

const rootRef = ref<HTMLElement | null>(null);
const popoverOpen = ref(false);
const remoteEnabled = ref(false);
const playerWindowOpen = ref(false);
const urls = ref<string[]>([]);
const qrDataUrl = ref<string>('');

const primaryUrl = computed(() => urls.value[0] || '');
const otherUrls = computed(() => urls.value.slice(1));

const api = () => (import.meta.client ? window.electronAPI : null);

async function refreshStatus() {
  const status = await api()?.getRemoteViewerStatus();
  if (status) {
    remoteEnabled.value = status.enabled;
    urls.value = status.urls || [];
  }
  const pw = await api()?.getPlayerWindowStatus();
  if (pw) playerWindowOpen.value = pw.open;
}

async function togglePopover() {
  popoverOpen.value = !popoverOpen.value;
  if (popoverOpen.value) await refreshStatus();
}

async function onToggleRemote(e: Event) {
  const enabled = (e.target as HTMLInputElement).checked;
  const res = await api()?.setRemoteViewerEnabled(enabled);
  remoteEnabled.value = res?.enabled ?? enabled;
  if (remoteEnabled.value) await refreshStatus();
}

async function onTogglePlayerWindow(e: Event) {
  const open = (e.target as HTMLInputElement).checked;
  if (open) await api()?.openPlayerWindow();
  else await api()?.closePlayerWindow();
  // Status change also arrives via onPlayerWindowStatusChanged.
  playerWindowOpen.value = open;
}

// Regenerate the QR whenever the primary URL changes (client-side, no network).
watch(primaryUrl, async (url) => {
  if (!url) { qrDataUrl.value = ''; return; }
  try {
    qrDataUrl.value = await QRCode.toDataURL(url, { margin: 1, width: 160 });
  } catch {
    qrDataUrl.value = '';
  }
}, { immediate: true });

function onDocClick(e: MouseEvent) {
  if (popoverOpen.value && rootRef.value && !rootRef.value.contains(e.target as Node)) {
    popoverOpen.value = false;
  }
}

let detachStatus: (() => void) | undefined;
onMounted(() => {
  document.addEventListener('mousedown', onDocClick);
  api()?.onPlayerWindowStatusChanged((isOpen: boolean) => { playerWindowOpen.value = isOpen; });
  refreshStatus();
});
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick);
  detachStatus?.();
});
</script>

<style scoped>
.viewer-control {
  position: relative;
  display: inline-flex;
}

.header-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 13px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, 4px);
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}
.header-btn:hover { background-color: var(--color-surface-hover); }
.header-btn.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.header-btn .material-symbols-rounded { font-size: 18px; }

.viewer-popover {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 1000;
  width: 240px;
  padding: 12px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 8px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.popover-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}
.toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-primary);
}
.toggle-label .material-symbols-rounded { font-size: 18px; }

.remote-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--color-border);
}
.qr {
  align-self: center;
  background: #fff;
  padding: 6px;
  border-radius: var(--radius-sm, 4px);
}
.url-text {
  font-family: monospace;
  font-size: 12px;
  color: var(--color-text-primary);
  word-break: break-all;
  user-select: all;
}
.url-alt, .url-none {
  font-size: 11px;
  color: var(--color-text-secondary);
  word-break: break-all;
}
.warn {
  font-size: 11px;
  color: var(--color-state-queued, var(--color-text-secondary));
}
</style>
