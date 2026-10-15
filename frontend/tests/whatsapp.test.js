import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  maskWhatsAppPhone,
  normalizeWhatsAppPhone,
} from '../src/lib/whatsapp.js';

test('normalizes Brazilian numbers and preserves explicit international numbers', () => {
  assert.equal(normalizeWhatsAppPhone('(11) 98888-7777'), '5511988887777');
  assert.equal(normalizeWhatsAppPhone('+55 11 98888-7777'), '5511988887777');
  assert.equal(normalizeWhatsAppPhone('0055 11 98888-7777'), '5511988887777');
  assert.equal(normalizeWhatsAppPhone('+1 (415) 555-2671'), '14155552671');
});

test('rejects absent, malformed and ambiguous phones', () => {
  for (const phone of ['', null, 'telefone', '12345678', '55119888', '++5511988887777', '5511988887777abc']) {
    assert.equal(normalizeWhatsAppPhone(phone), null, String(phone));
  }
  assert.equal(maskWhatsAppPhone('não existe'), 'Telefone inválido');
});

test('creates contextual professional messages and safe URL-encoded drafts', () => {
  const original = buildWhatsAppMessage('student_contact', { recipientName: 'João Ávila', gymName: 'Fit Pro 💪' });
  assert.match(original, /João Ávila/);
  assert.match(original, /Fit Pro 💪/);
  assert.notEqual(original, buildWhatsAppMessage('coach_contact', { recipientName: 'João Ávila', gymName: 'Fit Pro 💪' }));

  const edited = 'Olá, João!\nTreino às 18h? 💪 & obrigado.';
  const url = buildWhatsAppUrl('(11) 98888-7777', edited);
  assert.ok(url);
  const parsed = new URL(url);
  assert.equal(parsed.origin, 'https://wa.me');
  assert.equal(parsed.pathname, '/5511988887777');
  assert.equal(parsed.searchParams.get('text'), edited);
  assert.equal(buildWhatsAppUrl('invalid', edited), null);
  assert.equal(buildWhatsAppUrl('(11) 98888-7777', '  '), null);
  assert.equal(buildWhatsAppUrl('(11) 98888-7777', 'x'.repeat(2001)), null);
});
