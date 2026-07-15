"use client";

import { useState } from 'react';
import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { FileText, ExternalLink, BookOpen, GraduationCap } from 'lucide-react';
import type { TermReportListItem, SemesterReportListItem } from '@/lib/data/server/report-cards';

type Tab = 'term' | 'semester';

type Props = {
  termReports: TermReportListItem[];
  semesterReports: SemesterReportListItem[];
};

export function ReportPageClient({ termReports, semesterReports }: Props) {
  const { lang, activeChildId } = usePortalState();
  const [activeTab, setActiveTab] = useState<Tab>('term');

  const filteredTermReports = termReports.filter((r) => r.studentId === activeChildId);
  const filteredSemesterReports = semesterReports.filter((r) => r.studentId === activeChildId);

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={lang === 'en' ? 'Report Card' : 'Rapor'} backHref="/" />
      <ChildSelector />

      <div className="px-4">
        {/* Tabs */}
        <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-slate-100 mb-4">
          <button
            onClick={() => setActiveTab('term')}
            className={[
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
              activeTab === 'term'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            <BookOpen size={16} />
            {lang === 'en' ? 'Terms Report' : 'Rapor Term'}
          </button>
          <button
            onClick={() => setActiveTab('semester')}
            className={[
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
              activeTab === 'semester'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            <GraduationCap size={16} />
            {lang === 'en' ? 'Semester Report' : 'Rapor Semester'}
          </button>
        </div>

        {/* Content */}
        {activeTab === 'term' && (
          <TermReportList reports={filteredTermReports} lang={lang} />
        )}
        {activeTab === 'semester' && (
          <SemesterReportList reports={filteredSemesterReports} lang={lang} />
        )}
      </div>
    </div>
  );
}

function TermReportList({ reports, lang }: { reports: TermReportListItem[]; lang: string }) {
  if (reports.length === 0) {
    return <EmptyState lang={lang} type="term" />;
  }

  return (
    <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          title={report.termName}
          subtitle={`${report.className} · ${report.levelName}`}
          academicYear={report.academicYearName}
          date={report.publishedAt}
          href={`/api/portal/report/term/${report.id}/pdf`}
          lang={lang}
        />
      ))}
    </div>
  );
}

function SemesterReportList({ reports, lang }: { reports: SemesterReportListItem[]; lang: string }) {
  if (reports.length === 0) {
    return <EmptyState lang={lang} type="semester" />;
  }

  return (
    <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          title={`Semester ${report.semesterNumber}`}
          subtitle={`${report.className} · ${report.levelName}`}
          academicYear={report.academicYearName}
          date={report.publishedAt}
          href={`/api/portal/report/semester/${report.id}/pdf`}
          lang={lang}
        />
      ))}
    </div>
  );
}

function ReportCard({
  title,
  subtitle,
  academicYear,
  date,
  href,
  lang,
}: {
  title: string;
  subtitle: string;
  academicYear: string;
  date: string | null;
  href: string;
  lang: string;
}) {
  const formattedDate = date
    ? new Date(date).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-primary/30 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-slate-700 text-sm">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            <p className="text-xs text-slate-400 mt-0.5">{academicYear}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <ExternalLink size={14} className="text-slate-400 group-hover:text-primary transition-colors" />
          </div>
          {formattedDate && (
            <span className="text-[10px] text-slate-400">{formattedDate}</span>
          )}
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-50">
        <span className="text-xs font-medium text-primary/80 group-hover:text-primary transition-colors">
          {lang === 'en' ? 'View PDF' : 'Lihat PDF'} →
        </span>
      </div>
    </a>
  );
}

function EmptyState({ lang, type }: { lang: string; type: 'term' | 'semester' }) {
  const messages = {
    term: {
      en: 'No published term reports available yet.',
      id: 'Belum ada rapor term yang dipublikasikan.',
    },
    semester: {
      en: 'No published semester reports available yet.',
      id: 'Belum ada rapor semester yang dipublikasikan.',
    },
  };

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <FileText size={24} className="text-slate-400" />
      </div>
      <p className="text-sm text-slate-500">
        {messages[type][lang === 'id' ? 'id' : 'en']}
      </p>
    </div>
  );
}
