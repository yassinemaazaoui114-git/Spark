// Cross-tab "currently open folder" — the PWA kept activeFolderId in the
// single page's state; here the Folders tab owns it and the Record tab's
// save dialogs read it so new notes default into the open folder.

let activeFolderId: string | null = null

export function setActiveFolderId(id: string | null) {
  activeFolderId = id
}

export function getActiveFolderId(): string | null {
  return activeFolderId
}
