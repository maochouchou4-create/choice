export const isSettingsOpen = ref(false);

export function openSettings() {
  isSettingsOpen.value = true;
}

export function closeSettings() {
  isSettingsOpen.value = false;
}
