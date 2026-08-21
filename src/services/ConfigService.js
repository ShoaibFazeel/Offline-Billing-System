// Config Service to manage application-wide settings
class ConfigService {
    constructor() {
        const localTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
        this.config = {
            locale: "en-GB",
            timezone: localTz || "UTC",
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
                        const localTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
                        this.config = {
                            ...this.config,
                            locale: config.locale || "en-GB",
                            timezone: config.timezone || localTz || "UTC",
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

    formatIsoDate(date) {
        try {
            const d = date instanceof Date ? date : new Date(date)
            return new Intl.DateTimeFormat("en-CA", { timeZone: this.config.timezone }).format(d)
        } catch (error) {
            console.error("Error formatting ISO date:", error)
            return ""
        }
    }

    getTodayIsoDate() {
        return this.formatIsoDate(new Date())
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
            const options = this.getDateOptions(extraOptions)
            let timeStr = d.toLocaleTimeString(this.config.locale, options)

            // If this is a 12-hour clock (either explicitly requested or resolved by default)
            const is12Hour = options.hour12 === true ||
                             (new Intl.DateTimeFormat(this.config.locale, { hour: 'numeric', ...options }).resolvedOptions().hour12 === true);

            if (is12Hour) {
                // Replace leading 0: or 00: (or preceded by space) with 12:
                timeStr = timeStr.replace(/(^|[\s])00?(:)/g, (match, p1, p2) => p1 + "12" + p2)
            }
            return timeStr
        } catch (error) {
            console.error("Error formatting time:", error)
            return "Invalid Time"
        }
    }
}

const configService = new ConfigService()
export default configService
