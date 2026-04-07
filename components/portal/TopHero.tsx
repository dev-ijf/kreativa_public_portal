"use client";

import type { ReactNode } from 'react';
import { BookOpen, Globe, GraduationCap, Microscope, Palette } from 'lucide-react';

type Props = {
  heightClassName?: string;
  children?: ReactNode;
};

export function TopHero({ heightClassName = 'h-[260px]', children }: Props) {
  return (
    <div className="relative">
      <div
        className={[
          'bg-primary w-full rounded-b-[2.5rem] absolute top-0 left-0 z-0 overflow-hidden',
          heightClassName,
        ].join(' ')}
      >
        <div className="absolute top-2 -left-4 text-white opacity-5 -rotate-12">
          <BookOpen size={80} />
        </div>
        <div className="absolute top-12 right-4 text-white opacity-5 rotate-12">
          <GraduationCap size={100} />
        </div>
        <div className="absolute top-32 left-1/4 text-white opacity-5 rotate-45">
          <Microscope size={72} />
        </div>
        <div className="absolute top-8 left-1/2 text-white opacity-5 -rotate-12">
          <Globe size={64} />
        </div>
        <div className="absolute bottom-4 right-1/3 text-white opacity-5 -rotate-45">
          <Palette size={60} />
        </div>
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}

