import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthShell, { Field, passwordRules } from './AuthShell';
import api, { errorMessage } from '../../services/api';
import { Spinner } from '../../components/ui';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async ({ password }) => {
    setError('');
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      toast.success('Password updated. Log in with your new password');
      navigate('/login', { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <AuthShell title="Choose a new password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}{' '}<Link to="/forgot-password" className="underline">Request a new link</Link></div>}
        <Field label="New password" error={errors.password?.message}><input type="password" autoComplete="new-password" className="input" {...register('password', passwordRules)} /></Field>
        <Field label="Confirm password" error={errors.confirm?.message}>
          <input type="password" autoComplete="new-password" className="input" {...register('confirm', { validate: (v) => v === watch('password') || 'Passwords do not match' })} />
        </Field>
        <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />}Update password</button>
      </form>
    </AuthShell>
  );
}
