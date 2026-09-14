import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { registerSchema } from '@hafalati/shared';
import { ApiRequestError } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { GoldButton } from '@/design/GoldButton';
import { Logo } from '@/design/Logo';
import { OrnamentDivider } from '@/design/Ornament';
import { AuthField } from './auth/AuthField';

export function Register() {
  const { t, i18n } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const parsed = registerSchema.safeParse({ ...form, locale: i18n.language });
    if (!parsed.success) {
      setError(t('common.error'));
      return;
    }
    setLoading(true);
    try {
      await register(parsed.data);
      navigate('/account', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === 'user_exists'
          ? 'البريد أو الهاتف مُسجّل مسبقاً'
          : t('common.error'),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="surface p-7">
        <div className="flex justify-center">
          <Logo />
        </div>
        <OrnamentDivider>{t('auth.registerTitle')}</OrnamentDivider>
        <form onSubmit={onSubmit} className="space-y-4">
          <AuthField label={t('auth.fullName')} value={form.fullName} onChange={set('fullName')} required />
          <AuthField
            label={t('auth.email')}
            type="email"
            value={form.email}
            onChange={set('email')}
            autoComplete="email"
            required
          />
          <AuthField
            label={t('auth.phone')}
            value={form.phone}
            onChange={set('phone')}
            dir="ltr"
            placeholder="+216 XX XXX XXX"
            autoComplete="tel"
            required
          />
          <AuthField
            label={t('auth.password')}
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
            required
          />
          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
          <GoldButton type="submit" size="lg" className="w-full" loading={loading}>
            {t('auth.registerBtn')}
          </GoldButton>
        </form>
        <p className="mt-5 text-center text-sm text-blush-500">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-gold-700 hover:underline">
            {t('auth.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
