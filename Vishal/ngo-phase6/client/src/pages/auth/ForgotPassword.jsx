import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import AuthShell, { Field } from './AuthShell';
import api, { errorMessage } from '../../services/api';
import { Spinner } from '../../components/ui';

export default function ForgotPassword() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async ({ email }) => {
    setError('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setResult(data);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we will send a reset link.">
      {result ? (
        <div className="space-y-4 text-sm text-slate-600">
          <p>{result.message}.</p>
          {result.data?.devResetUrl && (
            <p className="rounded-lg bg-amber-50 p-3 text-amber-800">
              Development mode: email is not set up yet, so use this link directly:{' '}
              <a className="break-all font-medium underline" href={result.data.devResetUrl}>{result.data.devResetUrl}</a>
            </p>
          )}
          <Link to="/login" className="btn-secondary w-full">Back to log in</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {error && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <Field label="Email" error={errors.email?.message}><input type="email" className="input" {...register('email', { required: 'Email is required' })} /></Field>
          <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />}Send reset link</button>
          <p className="text-center text-sm"><Link to="/login" className="text-brand-700 hover:underline">Back to log in</Link></p>
        </form>
      )}
    </AuthShell>
  );
}
