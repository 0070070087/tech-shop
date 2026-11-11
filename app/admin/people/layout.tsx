"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/people/customers", label: "Customers" },
  // more tabs here
];

export default function PeopleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <div className="border-b border-[#E6D9C5] bg-[#F4EDE2]">
        <div className="mx-auto flex max-w-5xl gap-2 px-6 pt-4">
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={
                  "rounded-t-lg border border-b-0 px-4 py-2 text-sm font-medium " +
                  (active
                    ? "border-[#E6D9C5] bg-white text-[#14213D]"
                    : "border-transparent text-[#14213D]/60 hover:text-[#14213D]")
                }
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </>
  );
}