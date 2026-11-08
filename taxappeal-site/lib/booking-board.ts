// Booking → Briefing (README): for one meetings row the portal made, one Briefing request card for the coordinator (key
// briefing-request:<meeting id>) and, only when that card is new, a call-booked comment on the owner's Sign up card, so
// repeated passes write nothing more. The board mirror calls it; the portal's booking reply never waits on the board.
import { cards, addCard, addComment, type Card } from './naive-board';

export type BookedMeeting = { id: string; slot: string | null; address: string | null; case_id: string | null; status: string | null; notes: string | null };
// address: the case's county-roll address, for the card title (else the meeting's own address)
export type BookingOwner = { email: string; address?: string | null };

const line = (body: string, k: string) => body.split('\n').find((l) => l.startsWith(k + ':'))?.slice(k.length + 1).trim().toLowerCase();

// The owner's Sign up card names them on its email: (website) or from: (mail) line; the one naming this case wins.
export function signupCard(board: Card[], email: string, caseId: string) {
  const mine = board.filter((k) => k.title.startsWith('Sign up ·') && [line(k.body ?? '', 'email'), line(k.body ?? '', 'from')].includes(email));
  return mine.find((k) => line(k.body ?? '', 'case_id') === caseId.toLowerCase()) ?? mine[0] ?? null;
}

// board: the mirror's page of the whole board, so it is not read again; omitted, it is read here (~5 s). Throws on a board error.
export async function signalBooking(m: BookedMeeting, owner: BookingOwner, board?: Card[]): Promise<'skipped' | 'exists' | 'created'> {
  // Only rows api/portal-action.ts wrote (the picker's requested ones, the calendar's "booked via"), not seeded or desk rows;
  // the deck is about a home, so a general question asks for none, and a cancelled or past call needs none.
  const portal = m.status === 'requested' || (m.status === 'confirmed' && (m.notes ?? '').startsWith('booked via '));
  if (!portal || !m.case_id || (m.slot && new Date(m.slot).getTime() < Date.now())) return 'skipped';
  const email = owner.email.toLowerCase(), url = process.env.BOOKING_URL?.trim() || 'none';
  const when = m.slot ? new Date(m.slot).toISOString() : 'time in calendar';
  const signup = signupCard(board ?? (await cards()), email, m.case_id);
  const { created } = await addCard({
    title: `Briefing request · ${(owner.address ?? m.address ?? '').toUpperCase()} · ${m.case_id}`, status: 'todo', assignee: 'coordinator', key: `briefing-request:${m.id}`,
    body: [`case_id: ${m.case_id}`, `signup_card: ${signup?.id ?? 'none'}`, 'source: website', `to: ${email}`, 'reply_to_message: none', `booking_url: ${url}`,
      `presenter_email: ${process.env.PRESENTER_EMAIL?.trim() || 'none'}`, `requested_slot: ${when}`, 'deck_version: build', 'update_only: no'].join('\n'),
  });
  if (created && signup) await addComment(signup.id, `call-booked · ${when} · ${m.id} · ${m.address ?? 'none'} · ${m.case_id} · via portal · booking ${url}`);
  return created ? 'created' : 'exists';
}
