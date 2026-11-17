import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckCircle2 } from 'lucide-react';
import { usePageTitle, useSite } from '../../context/SiteContext';
import { Field } from '../auth/AuthShell';
import { Spinner } from '../../components/ui';
import { PageTop, Wrap } from '../../components/site';
import { errorMessage } from '../../services/api';
import { publicApi } from '../../services/websiteApi';

const SKILLS = ['Teaching', 'Cooking', 'Driving', 'First aid', 'Photography', 'Fundraising', 'Social media', 'Counselling'];

export default function Volunteer() {
  usePageTitle('Volunteer');
  const { site } = useSite();
  const cta = site?.sections?.cta;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { skills: [], other: '' } });
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (v) => {
    setError('');
    const skills = [...(Array.isArray(v.skills) ? v.skills : v.skills ? [v.skills] : []), ...v.other.split(',').map((s) => s.trim()).filter(Boolean)].slice(0, 10);
    try { await publicApi.applyVolunteer({ name: v.name, email: v.email, phone: v.phone, skills, availability: v.availability, message: v.message, website: v.website }); setDone(true); window.scrollTo(0, 0); }
    catch (e) { setError(errorMessage(e)); }
  };

  return (
    <>
      <PageTop title={cta?.volunteerTitle || 'Volunteer with us'} intro={cta?.volunteerText || 'Tell us a little about yourself and when you are free. A member of our team will get back to you.'} />
      <Wrap className="py-10 sm:py-14">
        {done ? (
          <div role="status" className="max-w-xl rounded-xl bg-brand-50 p-8">
            <CheckCircle2 className="h-10 w-10 text-brand-600" aria-hidden="true" />
            <h2 className="mt-3 font-display text-2xl font-semibold text-ink">Thank you for applying</h2>
            <p className="mt-2 text-slate-700">We have your details. Someone from the team will contact you by email or phone, usually within a week.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid max-w-2xl gap-5" aria-label="Volunteer application">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name" error={errors.name?.message}><input className="input" autoComplete="name" {...register('name', { required: 'Please enter your name', minLength: { value: 2, message: 'Use at least 2 characters' }, maxLength: { value: 80, message: 'Use at most 80 characters' } })} /></Field>
              <Field label="Email" error={errors.email?.message}><input className="input" type="email" autoComplete="email" {...register('email', { required: 'Please enter your email', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' } })} /></Field>
              <Field label="Phone (optional)" error={errors.phone?.message}><input className="input" type="tel" autoComplete="tel" {...register('phone', { pattern: { value: /^[0-9+()\-\s]{7,20}$/, message: 'Enter a valid phone number' } })} /></Field>
              <Field label="When are you free?" error={errors.availability?.message}><input className="input" placeholder="Weekends, evenings…" {...register('availability', { maxLength: { value: 200, message: 'Use at most 200 characters' } })} /></Field>
            </div>
            <fieldset><legend className="label">What can you help with?</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {SKILLS.map((s) => <label key={s} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600"><input type="checkbox" value={s} className="h-4 w-4 accent-brand-600" {...register('skills')} />{s}</label>)}
              </div>
            </fieldset>
            <Field label="Other skills (separate with commas)"><input className="input" {...register('other')} /></Field>
            <Field label="Anything else you would like us to know?" error={errors.message?.message}><textarea className="input" rows={4} {...register('message', { maxLength: { value: 1000, message: 'Use at most 1000 characters' } })} /></Field>
            {/* Hidden from people. Bots that fill it in are quietly ignored by the server. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" {...register('website')} /></label></div>
            {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div><button className="btn-primary px-6 py-3 text-base" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />}Send application</button></div>
          </form>
        )}
      </Wrap>
    </>
  );
}
