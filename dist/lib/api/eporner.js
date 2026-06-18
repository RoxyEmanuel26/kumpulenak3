"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpornerAPI = void 0;
exports.repairMojibake = repairMojibake;
exports.cleanEpornerText = cleanEpornerText;
const axios_1 = __importDefault(require("axios"));
const BASE_URL = "https://www.eporner.com/api/v2/video";
function repairMojibake(str) {
    if (!str)
        return str;
    // Regex to match valid UTF-8 sequences interpreted as ISO-8859-1/CP1252 characters
    const utf8Regex = /[\u00C2-\u00DF][\u0080-\u00BF]|[\u00E0-\u00EF][\u0080-\u00BF]{2}|[\u00F0-\u00F4][\u0080-\u00BF]{3}/g;
    return str.replace(utf8Regex, (match) => {
        try {
            return Buffer.from(match, 'binary').toString('utf8');
        }
        catch (_a) {
            return match;
        }
    });
}
function cleanEpornerText(str) {
    if (!str)
        return str;
    const repaired = repairMojibake(str);
    // Remove zero-width space (\u200b), zero-width non-joiner (\u200c), zero-width joiner (\u200d), left-to-right mark (\u200e), right-to-left mark (\u200f), byte order mark (\ufeff)
    return repaired.replace(/[\u200b-\u200d\u200e\u200f\ufeff]/g, '');
}
function cleanVideoData(video) {
    if (!video)
        return video;
    return Object.assign(Object.assign({}, video), { title: cleanEpornerText(video.title), keywords: cleanEpornerText(video.keywords) });
}
exports.EpornerAPI = {
    async search(params = {}) {
        const { data } = await axios_1.default.get(`${BASE_URL}/search/`, {
            params: Object.assign({ format: "json", per_page: 100, order: "latest" }, params),
        });
        if (data && Array.isArray(data.videos)) {
            data.videos = data.videos.map(cleanVideoData);
        }
        return data;
    },
    async getById(id) {
        try {
            const { data } = await axios_1.default.get(`${BASE_URL}/id/`, {
                params: { id, format: "json" },
            });
            return (data && !Array.isArray(data) && data.id) ? cleanVideoData(data) : null;
        }
        catch (_a) {
            return null;
        }
    },
    async getRemoved() {
        const { data } = await axios_1.default.get(`${BASE_URL}/removed/`, {
            params: { format: "json" },
            responseType: "text",
        });
        return data;
    },
};
