const safeStorage = (storage) => {
  if (!storage) {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    }
  }

  try {
    const testKey = '__storage_service_test__'
    storage.setItem(testKey, '1')
    storage.removeItem(testKey)
    return storage
  } catch (error) {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    }
  }
}

const localStorageWrapper = safeStorage(typeof window !== 'undefined' ? window.localStorage : null)
const sessionStorageWrapper = safeStorage(typeof window !== 'undefined' ? window.sessionStorage : null)

const storageService = {
  getLocalItem(key) {
    return localStorageWrapper.getItem(key)
  },
  setLocalItem(key, value) {
    localStorageWrapper.setItem(key, value)
  },
  removeLocalItem(key) {
    localStorageWrapper.removeItem(key)
  },
  clearLocalStorage() {
    localStorageWrapper.clear()
  },
  getSessionItem(key) {
    return sessionStorageWrapper.getItem(key)
  },
  setSessionItem(key, value) {
    sessionStorageWrapper.setItem(key, value)
  },
  removeSessionItem(key) {
    sessionStorageWrapper.removeItem(key)
  },
  clearSessionStorage() {
    sessionStorageWrapper.clear()
  },
}

export default storageService
