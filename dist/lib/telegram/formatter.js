"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatVideoMessage = formatVideoMessage;
function formatVideoMessage(video, template) {
    const tagList = video.tags.map(t => `#${t.tag.name.replace(/[^a-zA-Z0-9]/g, '')}`).slice(0, 5).join(" ");
    if (template) {
        return template
            .replace(/{{title}}/g, escapeMarkdownV2(video.title))
            .replace(/{{duration}}/g, escapeMarkdownV2(video.lengthMin || "N/A"))
            .replace(/{{rating}}/g, escapeMarkdownV2(video.rate || "N/A"))
            .replace(/{{views}}/g, escapeMarkdownV2(video.views.toString()))
            .replace(/{{tags}}/g, escapeMarkdownV2(tagList));
    }
    return `
🎬 *${escapeMarkdownV2(video.title)}*

⏱ *Duration:* ${escapeMarkdownV2(video.lengthMin || "N/A")}
⭐ *Rating:* ${escapeMarkdownV2(video.rate || "N/A")}
👁 *Views:* ${video.views}

🏷 ${escapeMarkdownV2(tagList)}
`;
}
function escapeMarkdownV2(text) {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}
