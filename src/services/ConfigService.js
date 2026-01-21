// Config Service to manage application-wide settings
class ConfigService {
    constructor() {
        this.config = {
            locale: "en-GB",
            timezone: "UTC",
        }
        this.initialized = false
        this.initializationPromise = null
    }

    async init() {
        if (this.initialized) return
        if (this.initializationPromise) return this.initializationPromise

        this.initializationPromise = (async () => {
            try {
                if (window.api && window.api.getAppConfig) {
                    const config = await window.api.getAppConfig()
                    if (config) {
                        this.config = {
                            ...this.config,
                            locale: config.locale || "en-GB",
                            timezone: config.timezone || "UTC",
                        }
                    }
                }
                this.initialized = true
            } catch (error) {
                console.error("Error initializing ConfigService:", error)
                // Fallback to defaults
                this.initialized = true
            } finally {
                this.initializationPromise = null
            }
        })()

        return this.initializationPromise
    }

    async getConfig() {
        if (!this.initialized) {
            await this.init()
        }
        return this.config
    }

    async updateConfig(newConfig) {
        try {
            if (window.api && window.api.updateAppConfig) {
                await window.api.updateAppConfig(newConfig)
                this.config = { ...this.config, ...newConfig }
                return true
            }
        } catch (error) {
            console.error("Error updating config:", error)
            return false
        }
    }

    getLocale() {
        return this.config.locale
    }

    getTimezone() {
        return this.config.timezone
    }

    getDateOptions(extraOptions = {}) {
        return {
            timeZone: this.config.timezone,
            ...extraOptions,
        }
    }

    formatDate(date, extraOptions = {}) {
        try {
            const d = date instanceof Date ? date : new Date(date)
            return d.toLocaleDateString(this.config.locale, this.getDateOptions(extraOptions))
        } catch (error) {
            console.error("Error formatting date:", error)
            return "Invalid Date"
        }
    }

    formatTime(date, extraOptions = {}) {
        try {
            const d = date instanceof Date ? date : new Date(date)
            return d.toLocaleTimeString(this.config.locale, this.getDateOptions(extraOptions))
        } catch (error) {
            console.error("Error formatting time:", error)
            return "Invalid Time"
        }
    }
}

const configService = new ConfigService()
export default configService
