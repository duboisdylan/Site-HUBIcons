import localforage from "localforage";

localforage.config({
  name: "iconhub",
  storeName: "icons",
});

export async function getAllIcons() {
  const keys = await localforage.keys();
  const icons = [];
  for (const k of keys) {
    const icon = await localforage.getItem(k);
    if (icon) icons.push(icon);
  }
  return icons.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveIcon(icon) {
  await localforage.setItem(icon.id, icon);
}

export async function deleteIcon(id) {
  await localforage.removeItem(id);
}

export async function clearIcons() {
  await localforage.clear();
}