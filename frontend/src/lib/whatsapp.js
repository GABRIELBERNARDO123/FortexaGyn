/** Modelos explícitos: estes textos apenas abrem uma conversa para revisão e envio manual. */
export const WHATSAPP_TEMPLATES = Object.freeze({
  student_contact: {
    purpose: 'Contato geral com aluno',
    recipient: 'student',
    title: 'Enviar mensagem para aluno',
    render: ({ recipientName, gymName }) =>
      `Olá, ${clean(recipientName, 'tudo bem?')}! Aqui é da ${clean(gymName, 'Fit Pro')}. Gostaríamos de conversar com você. Quando for conveniente, pode nos responder por aqui.`,
  },
  coach_contact: {
    purpose: 'Contato geral com professor',
    recipient: 'coach',
    title: 'Enviar mensagem para professor',
    render: ({ recipientName, gymName }) =>
      `Olá, ${clean(recipientName, 'tudo bem?')}! Aqui é da ${clean(gymName, 'Fit Pro')}. Gostaríamos de alinhar algumas informações profissionais com você. Quando puder, responda por aqui.`,
  },
});

function clean(value, fallback) {
  const text = typeof value === 'string' ? value.replace(/[\r\n\u0000-\u001f]/g, ' ').trim() : '';
  return text ? text.slice(0, 120) : fallback;
}

/** Normaliza número brasileiro (com DDD) ou número internacional explicitado com +/00. */
export function normalizeWhatsAppPhone(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw || !/^[+\d\s().-]+$/.test(raw) || (raw.match(/\+/g) || []).length > 1 || (raw.includes('+') && !raw.startsWith('+'))) return null;

  const explicitInternational = raw.startsWith('+') || raw.startsWith('00');
  let digits = raw.replace(/\D/g, '');
  if (raw.startsWith('00')) digits = digits.slice(2);

  if (!explicitInternational) {
    if (/^[1-9]\d{9,10}$/.test(digits)) digits = `55${digits}`;
    else if (!/^55[1-9]\d{9,10}$/.test(digits)) return null;
  }

  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  if (digits.startsWith('55') && !/^55[1-9]\d{9,10}$/.test(digits)) return null;
  return digits;
}

export function maskWhatsAppPhone(value) {
  const digits = normalizeWhatsAppPhone(value);
  if (!digits) return 'Telefone inválido';
  return `+${digits.slice(0, -4).replace(/\d/g, '•')}${digits.slice(-4)}`;
}

export function buildWhatsAppMessage(templateId, variables = {}) {
  const template = WHATSAPP_TEMPLATES[templateId];
  if (!template) throw new Error('Modelo de mensagem desconhecido.');
  return template.render(variables);
}

/** Cria somente uma URL wa.me; não envia a mensagem. */
export function buildWhatsAppUrl(phone, message) {
  const digits = normalizeWhatsAppPhone(phone);
  if (!digits || typeof message !== 'string' || !message.trim() || message.length > 2000) return null;
  const url = new URL(`https://wa.me/${digits}`);
  url.searchParams.set('text', message);
  return url.toString();
}
