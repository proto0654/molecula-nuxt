import type { ContactAcfRow, ThemeOptionsAcf } from '~/types/wp';
import type { Contact, ContactIcon, ContactPage } from '~/types/wp';
import { emptyToNull, stripHtmlToPlain } from '~/domain/wp';

const ICON_EXACT: Record<string, ContactIcon> = {
  telegram: 'telegram',
  'bx:bxltelegram': 'telegram',
  'bxl-telegram': 'telegram',
  phone: 'phone',
  tel: 'phone',
  'mdi:cellphone-iphone': 'phone',
  cellphone: 'phone',
  vk: 'vk',
  'mdi:vk': 'vk',
  vkontakte: 'vk',
  whatsapp: 'whatsapp',
  email: 'email',
  mail: 'email',
  mailto: 'email',
  'mdi:email-outline': 'email',
  instagram: 'instagram',
  github: 'github',
  facebook: 'facebook',
  link: 'link',
};

function normalizeIcon(raw: string | false | undefined): ContactIcon {
  const key = emptyToNull(typeof raw === 'string' ? raw : null);
  if (!key) return 'link';
  const lower = key.toLowerCase().trim();
  const exact = ICON_EXACT[lower];
  if (exact) return exact;
  if (lower.includes('telegram')) return 'telegram';
  if (lower.includes('whatsapp')) return 'whatsapp';
  if (lower.includes('instagram')) return 'instagram';
  if (lower.includes('github')) return 'github';
  if (lower.includes('facebook')) return 'facebook';
  if (lower.includes('email') || lower.includes('mail')) return 'email';
  if (lower.includes('vk')) return 'vk';
  if (lower.includes('phone') || lower.includes('cellphone') || lower.includes('tel')) {
    return 'phone';
  }
  return 'link';
}

function normalizeTarget(raw: string | false | undefined): '_self' | '_blank' {
  return raw === '_blank' ? '_blank' : '_self';
}

function normalizeContactRow(row: ContactAcfRow): Contact | null {
  const label = emptyToNull(row.label);
  const url = emptyToNull(row.url);
  if (!label || !url) return null;

  return {
    label,
    url,
    icon: normalizeIcon(row.icon),
    target: normalizeTarget(row.target),
    showInSocial: Boolean(row.show_in_socialbar),
  };
}

function normalizeContactRows(rows: ThemeOptionsAcf['weblaba_contacts']): Contact[] {
  if (!rows || rows === false || !Array.isArray(rows)) return [];
  const contacts: Contact[] = [];
  for (const row of rows) {
    const contact = normalizeContactRow(row);
    if (contact) contacts.push(contact);
  }
  return contacts;
}

/**
 * Raw ACF options → ContactPage. RU fields only; EN keys stay on the raw type.
 * Empty / false repeater → []. No PHP Telegram+phone fallback.
 */
export function normalizeContactPage(acf: ThemeOptionsAcf | undefined): ContactPage {
  return {
    title: emptyToNull(acf?.contact_popup_title),
    text: emptyToNull(acf?.contact_popup_text),
    contacts: normalizeContactRows(acf?.weblaba_contacts),
  };
}

export function contactExcerptPlain(page: ContactPage): string | null {
  return stripHtmlToPlain(page.text);
}
