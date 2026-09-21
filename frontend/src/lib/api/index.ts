export { ApiClient, apiClient, type RequestOptions } from './api-client'
export { CONFIG_PATH, fetchSecrets } from './config'
export {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  moveDocument,
  renameDocument,
  renameDocumentPath,
  updateDocumentContent,
} from './documents'
export {
  EDITOR_CONFIG_PATH,
  fetchEditorConfig,
  updateEditorConfigDarkTheme,
  updateEditorConfigFormatOnSave,
  updateEditorConfigVimMotion,
} from './editor-config'
export { createVault, deleteVault, listVaults, renameVault } from './vaults'
