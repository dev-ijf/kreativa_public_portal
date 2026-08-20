'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, MessageSquare } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { useActiveChild, usePortalState } from '@/components/portal/state/PortalProvider';
import { linkifyToReact } from '@/lib/linkify';
import type { DailyReportMessage } from '@/lib/portal/daily-reports-shared';
import { clampTextareaNote, TEXTAREA_NOTE_MAX } from '@/lib/portal/textarea-limits';

type Ticket = {
  reportId: number;
  reportDate: string;
  ticketStatus: 'open' | 'closed';
  lastBody: string | null;
  lastAuthorRole: 'parent' | 'staff' | null;
  lastAt: string | null;
};

function formatDate(iso: string, lang: 'en' | 'id'): string {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${iso}T12:00:00`));
}

function formatMsgAt(iso: string | null, lang: 'en' | 'id'): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(lang === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MessagesPageClient() {
  const { lang } = usePortalState();
  const activeChild = useActiveChild();
  const studentId = activeChild?.id ?? null;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<DailyReportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);

  const loadTickets = useCallback(async (sid: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/messages/tickets?studentId=${sid}`, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!res.ok) {
        setError(lang === 'en' ? 'Could not load messages.' : 'Gagal memuat pesan.');
        setTickets([]);
        return;
      }
      const data = (await res.json()) as { tickets: Ticket[] };
      setTickets(data.tickets ?? []);
    } catch {
      setError(lang === 'en' ? 'Could not load messages.' : 'Gagal memuat pesan.');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    setSelected(null);
    setMessages([]);
    if (studentId == null) {
      setTickets([]);
      return;
    }
    void loadTickets(studentId);
  }, [studentId, loadTickets]);

  async function openTicket(t: Ticket) {
    if (studentId == null) return;
    setSelected(t);
    setDraft('');
    setThreadLoading(true);
    try {
      const res = await fetch(
        `/api/portal/daily-reports/day?studentId=${studentId}&date=${encodeURIComponent(t.reportDate)}`,
        { credentials: 'same-origin', cache: 'no-store' },
      );
      if (!res.ok) {
        setMessages([]);
        return;
      }
      const data = (await res.json()) as { report?: { messages?: DailyReportMessage[] } };
      setMessages(Array.isArray(data.report?.messages) ? data.report!.messages! : []);
    } catch {
      setMessages([]);
    } finally {
      setThreadLoading(false);
    }
  }

  async function sendReply() {
    if (studentId == null || !selected || !draft.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/portal/daily-reports/parent', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          date: selected.reportDate,
          parentMessage: clampTextareaNote(draft),
        }),
      });
      if (!res.ok) {
        setError(lang === 'en' ? 'Could not send.' : 'Gagal mengirim.');
        return;
      }
      const data = (await res.json()) as { patch?: { messages?: DailyReportMessage[] } };
      if (Array.isArray(data.patch?.messages)) {
        setMessages(data.patch!.messages!);
      }
      setDraft('');
      setSelected((prev) => (prev ? { ...prev, ticketStatus: 'open' } : prev));
      await loadTickets(studentId);
    } catch {
      setError(lang === 'en' ? 'Could not send.' : 'Gagal mengirim.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header
        title={lang === 'en' ? 'Messages from Home' : 'Pesan dari Rumah'}
        backHref={selected ? undefined : '/'}
      />
      <div className="px-4 pt-2">
        <ChildSelector />
      </div>

      {!studentId ? (
        <p className="px-4 py-8 text-sm text-slate-500 text-center">
          {lang === 'en' ? 'Select a student.' : 'Pilih siswa.'}
        </p>
      ) : selected ? (
        <div className="px-4 py-4 space-y-4">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="flex items-center gap-1 text-sm font-semibold text-primary"
          >
            <ChevronLeft size={16} />
            {lang === 'en' ? 'All conversations' : 'Semua percakapan'}
          </button>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-bold text-slate-800">{formatDate(selected.reportDate, lang)}</p>
              <p className="text-xs text-slate-400">
                {selected.ticketStatus === 'closed'
                  ? lang === 'en'
                    ? 'Closed — you can still reply to reopen'
                    : 'Ditutup — balas untuk membuka lagi'
                  : lang === 'en'
                    ? 'Open'
                    : 'Terbuka'}
              </p>
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
            {threadLoading ? (
              <p className="text-sm text-slate-400 text-center py-6">
                {lang === 'en' ? 'Loading…' : 'Memuat…'}
              </p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                {lang === 'en' ? 'No messages yet.' : 'Belum ada pesan.'}
              </p>
            ) : (
              messages.map((m) => {
                const isStaff = m.authorRole === 'staff';
                return (
                  <div
                    key={`${m.id}-${m.createdAt || 'x'}`}
                    className={`flex ${isStaff ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                        isStaff
                          ? 'bg-slate-100 text-slate-800'
                          : 'bg-primary text-white'
                      }`}
                    >
                      <p
                        className={`text-[10px] font-bold mb-0.5 ${
                          isStaff ? 'text-slate-400' : 'text-white/80'
                        }`}
                      >
                        {isStaff
                          ? lang === 'en'
                            ? 'Teacher'
                            : 'Guru'
                          : lang === 'en'
                            ? 'You'
                            : 'Anda'}
                        {m.createdAt ? ` · ${formatMsgAt(m.createdAt, lang)}` : ''}
                      </p>
                      <div className="whitespace-pre-wrap">
                        {linkifyToReact(
                          m.body,
                          isStaff
                            ? 'underline break-all text-sky-700'
                            : 'underline break-all text-white/95',
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <textarea
            value={draft}
            onChange={(e) => setDraft(clampTextareaNote(e.target.value))}
            rows={3}
            maxLength={TEXTAREA_NOTE_MAX}
            placeholder={
              lang === 'en' ? 'Write a reply…' : 'Tulis balasan…'
            }
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary resize-none"
          />
          <button
            type="button"
            disabled={sending || !draft.trim()}
            onClick={() => void sendReply()}
            className="w-full rounded-2xl bg-primary text-white font-semibold py-3 disabled:opacity-40"
          >
            {sending
              ? lang === 'en'
                ? 'Sending…'
                : 'Mengirim…'
              : lang === 'en'
                ? 'Send'
                : 'Kirim'}
          </button>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-8">
              {lang === 'en' ? 'Loading…' : 'Memuat…'}
            </p>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center text-slate-400 py-16 gap-2">
              <MessageSquare size={28} />
              <p className="text-sm text-center">
                {lang === 'en'
                  ? 'No conversations yet. Reply from a daily report to start one.'
                  : 'Belum ada percakapan. Mulai dari laporan harian untuk mengirim pesan.'}
              </p>
            </div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.reportId}
                type="button"
                onClick={() => void openTicket(t)}
                className="w-full text-left bg-white rounded-2xl border border-slate-100 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{formatDate(t.reportDate, lang)}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.lastBody || '—'}</p>
                  </div>
                  <span
                    className={[
                      'shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full',
                      t.ticketStatus === 'closed'
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-emerald-100 text-emerald-700',
                    ].join(' ')}
                  >
                    {t.ticketStatus === 'closed'
                      ? lang === 'en'
                        ? 'Closed'
                        : 'Ditutup'
                      : lang === 'en'
                        ? 'Open'
                        : 'Terbuka'}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
