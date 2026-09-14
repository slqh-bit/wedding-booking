import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiRequestError } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { GoldButton } from '@/design/GoldButton';
import { Logo } from '@/design/Logo';
import { OrnamentDivider } from '@/design/Ornament';
import { AuthField } from './auth/AuthField';

export function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/account';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiRequestError ? t('auth.invalid') : t('common.error'));
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
        <OrnamentDivider>{t('auth.loginTitle')}</OrnamentDivider>
        <form onSubmit={onSubmit} className="space-y-4">
          <AuthField
            label={t('auth.email')}
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <AuthField
            label={t('auth.password')}
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
          />
          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
          <GoldButton type="submit" size="lg" className="w-full" loading={loading}>
            {t('auth.loginBtn')}
          </GoldButton>
        </form>
        <p className="mt-5 text-center text-sm text-blush-500">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-gold-700 hover:underline">
            {t('auth.createOne')}
          </Link>
        </p>
      </div>
    </div>
  );
}
