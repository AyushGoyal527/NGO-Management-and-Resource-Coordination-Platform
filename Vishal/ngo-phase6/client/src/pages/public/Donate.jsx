import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { CheckCircle2, Copy } from 'lucide-react';
import { usePageTitle, useSite } from '../../context/SiteContext';
import { Field } from '../auth/AuthShell';
import { Spinner } from '../../components/ui';
import { PageTop, Wrap } from '../../components/site';
import { errorMessage } from '../../services/api';
import { publicApi } from '../../services/websiteApi';
import { inr } from '../../utils/format';

const TYPES = [['money', 'Money'], ['food', 'Food'], ['clothes', 'Clothes'], ['books', 'Books'], ['medicine', 'Medicine'], ['equipment', 'Equipment'], ['other', 'Something else']];
const QUICK = [500, 1000, 2500, 5000];

const copy = async (text) => { try { await navigator.clipboard.writeText(text); toast.success('Copied'); } catch { toast.error('Could not copy. Select the text and copy it by hand.'); } };

function Result({ result, org }) {
  const pay = result.payment;
  return (
    <div role="status" className="max-w-2xl space-y-6">
      <div className="rounded-xl bg-brand-50 p-8">
        <CheckCircle2 className="h-10 w-10 text-brand-600" aria-hidden="true" />
        <h2 className="mt-3 font-display text-2xl font-semibold text-ink">We have your inquiry</h2>
        <p className="mt-2 text-slate-700">Your reference number is <strong className="font-mono text-lg">{result.reference}</strong>. Please keep it. {pay ? 'Quote it in the payment note so we can match your payment.' : `Someone from ${org || 'our team'} will contact you to arrange the donation.`}</p>
      </div>
      {pay && (
        <div className="rounded-xl border border-slate-200 p-6">
          <h3 className="font-display text-xl font-semibold text-ink">How to pay</h3>
          {pay.details.length ? (
            <dl className="mt-3 divide-y divide-slate-100">
              {pay.details.map((d) => (
                <div key={d.label} className="flex items-center justify-between gap-3 py-2.5"><dt className="text-sm text-slate-500">{d.label}</dt>
                  <dd className="flex items-center gap-2 font-medium text-slate-900"><span className="break-all">{d.value}</span><button type="button" onClick={() => copy(d.value)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Copy className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Copy {d.label}</span></button></dd></div>
              ))}
            </dl>
          ) : <p className="mt-2 text-slate-600">We will send you payment details by email or phone.</p>}
          {pay.instructions && <p className="mt-4 whitespace-pre-line text-slate-700">{pay.instructions}</p>}
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">This page does not take payments. Your donation is recorded, and your receipt issued, only after we receive the money.</p>
        </div>
      )}
    </div>
  );
}

export default function Donate() {
  usePageTitle('Donate');
  const { site } = useSite();
  const cta = site?.sections?.cta;
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({ defaultValues: { donationType: 'money', anonymous: false } });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const type = watch('donationType');
  const amount = Number(watch('amount')) || 0;

  const onSubmit = async (v) => {
    setError('');
    const body = { name: v.name, email: v.email, phone: v.phone, donationType: v.donationType, anonymous: v.anonymous, purpose: v.purpose, message: v.message };
    if (v.donationType === 'money') body.amount = Number(v.amount);
    try { setResult(await publicApi.donationInquiry(body)); window.scrollTo(0, 0); } catch (e) { setError(errorMessage(e)); }
  };

  return (
    <>
      <PageTop title={cta?.donateTitle || 'Donate'} intro={site?.donateIntro || cta?.donateText || 'Tell us what you would like to give and how to reach you. We will confirm every detail with you.'} />
      <Wrap className="py-10 sm:py-14">
        {result ? <Result result={result} org={site?.organization?.name} /> : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid max-w-2xl gap-5" aria-label="Donation inquiry">
            <fieldset><legend className="label">What would you like to give?</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {TYPES.map(([v, text]) => <label key={v} className="inline-flex cursor-pointer items-center rounded-full border border-slate-300 px-4 py-1.5 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600"><input type="radio" value={v} className="sr-only" {...register('donationType')} />{text}</label>)}
              </div>
            </fieldset>
            {type === 'money' && (
              <div>
                <Field label="Amount in rupees" error={errors.amount?.message}><input className="input" type="number" inputMode="decimal" min="1" step="any" {...register('amount', { required: 'Enter the amount you plan to give', min: { value: 1, message: 'The amount must be more than 0' }, max: { value: 10000000, message: 'Please contact us for gifts above ₹1,00,00,000' } })} /></Field>
                <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Quick amounts">
                  {QUICK.map((q) => <button type="button" key={q} aria-pressed={amount === q} onClick={() => setValue('amount', q, { shouldValidate: true })} className={`rounded-full border px-3 py-1 text-sm ${amount === q ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>{inr(q)}</button>)}
                </div>
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Your name" error={errors.name?.message}><input className="input" autoComplete="name" {...register('name', { required: 'Please enter your name', minLength: { value: 2, message: 'Use at least 2 characters' } })} /></Field>
              <Field label="Email" error={errors.email?.message}><input className="input" type="email" autoComplete="email" {...register('email', { validate: (v, all) => (!v && !all.phone ? 'Give an email or a phone number' : !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email address') })} /></Field>
              <Field label="Phone" error={errors.phone?.message}><input className="input" type="tel" autoComplete="tel" {...register('phone', { pattern: { value: /^[0-9+()\-\s]{7,20}$/, message: 'Enter a valid phone number' } })} /></Field>
              <Field label="Purpose (optional)"><input className="input" placeholder="For example, the food drive" maxLength={120} {...register('purpose')} /></Field>
            </div>
            <Field label="Message (optional)" error={errors.message?.message}><textarea className="input" rows={3} {...register('message', { maxLength: { value: 1000, message: 'Use at most 1000 characters' } })} /></Field>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="h-4 w-4 accent-brand-600" {...register('anonymous')} />Keep my name out of public thanks and reports</label>
            {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <p className="text-sm text-slate-500">This sends us an inquiry. It does not charge you anything.</p>
            <div><button className="btn bg-sun-500 px-6 py-3 text-base font-semibold text-ink hover:bg-sun-400" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />}Send inquiry</button></div>
          </form>
        )}
      </Wrap>
    </>
  );
}
