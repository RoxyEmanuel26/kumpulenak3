import { Video, Tag } from "@prisma/client";

export function formatVideoMessage(video: Video & { tags: { tag: Tag }[] }, template?: string | null): string {
  const tagList = video.tags.map(t => `#${t.tag.name.replace(/[^a-zA-Z0-9]/g, '')}`).slice(0, 5).join(" ");
  
  if (template) {
    return template
      .replace(/{{title}}/g, escapeMarkdownV2(video.title))
      .replace(/{{duration}}/g, escapeMarkdownV2(video.duration || "N/A"))
      .replace(/{{rating}}/g, escapeMarkdownV2(video.rating || "N/A"))
      .replace(/{{views}}/g, escapeMarkdownV2(video.views.toString()))
      .replace(/{{tags}}/g, escapeMarkdownV2(tagList));
  }

  return `
🎬 *${escapeMarkdownV2(video.title)}*

⏱ *Duration:* ${escapeMarkdownV2(video.duration || "N/A")}
⭐ *Rating:* ${escapeMarkdownV2(video.rating || "N/A")}
👁 *Views:* ${video.views}

🏷 ${escapeMarkdownV2(tagList)}
`;
}

function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}
