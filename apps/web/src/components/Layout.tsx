import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/design/Logo';
import { LocaleSwitcher } from '@/design/LocaleSwitcher';
import { GoldButton } from '@/design/GoldButton';
import { useAuth } from '@/store/auth';

export function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition hover:text-gold-700 ${
      isActive ? 'text-gold-700' : 'text-blush-600'
    }`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-gold-100 bg-ivory-50/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" onClick={() => setOpen(false)}>
            <Logo />
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <NavLink to="/" end className={navLinkClass}>
              {t('nav.home')}
            </NavLink>
            <NavLink to="/plan" className={navLinkClass}>
              {t('nav.plan')}
            </NavLink>
            {user && (
              <NavLink to="/account" className={navLinkClass}>
                {t('nav.account')}
              </NavLink>
            )}
            {user?.role === 'ADMIN' && (
              <NavLink to="/admin" className={navLinkClass}>
                {t('nav.admin')}
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            {user ? (
              <GoldButton size="sm" variant="outline" onClick={logout} className="hidden sm:inline-flex">
                {t('nav.logout')}
              </GoldButton>
            ) : (
              <Link to="/login" className="hidden sm:block">
                <GoldButton size="sm">{t('nav.login')}</GoldButton>
              </Link>
            )}
            <button
              className="grid h-9 w-9 place-items-center rounded-full border border-gold-200 text-gold-700 md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="menu"
            >
              ☰
            </button>
          </div>
        </div>

        {open && (
          <div className="animate-fade-up border-t border-gold-100 bg-ivory-50 px-4 py-3 md:hidden">
            <div className="flex flex-col gap-3">
              <NavLink to="/" end className={navLinkClass} onClick={() => setOpen(false)}>
                {t('nav.home')}
              </NavLink>
              <NavLink to="/plan" className={navLinkClass} onClick={() => setOpen(false)}>
                {t('nav.plan')}
              </NavLink>
              {user && (
                <NavLink to="/account" className={navLinkClass} onClick={() => setOpen(false)}>
                  {t('nav.account')}
                </NavLink>
              )}
              {user?.role === 'ADMIN' && (
                <NavLink to="/admin" className={navLinkClass} onClick={() => setOpen(false)}>
                  {t('nav.admin')}
                </NavLink>
              )}
              {user ? (
                <GoldButton size="sm" variant="outline" onClick={logout}>
                  {t('nav.logout')}
                </GoldButton>
              ) : (
                <Link to="/login" onClick={() => setOpen(false)}>
                  <GoldButton size="sm" className="w-full">
                    {t('nav.login')}
                  </GoldButton>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-16 border-t border-gold-100 bg-blush-900 text-ivory-100">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <h4 className="font-display text-xl font-bold text-gold-300">{t('brand.name')}</h4>
          <p className="mt-2 text-sm text-ivory-200/80">{t('home.servicesSubtitle')}</p>
        </div>
        <div className="text-sm text-ivory-200/80">
          <p className="mb-2 font-semibold text-ivory-100">{t('brand.tagline')}</p>
          <p>📍 سبيطلة، القصرين، تونس</p>
          <p>✉️ mahmoudkadri1456@gmail.com</p>
          <p dir="ltr">📞 +216 97 580 081</p>
        </div>
        <div className="flex items-end md:justify-end">
          <p className="text-xs text-ivory-200/60">© 2026 {t('brand.name')}. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
