export type WhatsAppTemplateId = 'student_contact' | 'coach_contact';
export type WhatsAppRecipientKind = 'student' | 'coach';
export interface WhatsAppTemplate {
  purpose: string;
  recipient: WhatsAppRecipientKind;
  title: string;
  render: (variables: { recipientName?: string | null; gymName?: string | null }) => string;
}
export const WHATSAPP_TEMPLATES: Readonly<Record<WhatsAppTemplateId, WhatsAppTemplate>>;
export function normalizeWhatsAppPhone(value: unknown): string | null;
export function maskWhatsAppPhone(value: unknown): string;
export function buildWhatsAppMessage(
  templateId: WhatsAppTemplateId,
  variables?: { recipientName?: string | null; gymName?: string | null },
): string;
export function buildWhatsAppUrl(phone: unknown, message: string): string | null;
