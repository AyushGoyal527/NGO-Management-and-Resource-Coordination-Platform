import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import AuthShell, { Field, passwordRules } from "./AuthShell";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui";

export default function Register() {
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    setError("");
    try {
      await api.post("/auth/register", values);
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  if (done) {
    return (
      <AuthShell title="Account created">
        <p className="text-sm text-slate-600">
          An administrator needs to approve your account before you can log in.
          You will be able to sign in once that is done.
        </p>
        <Link to="/login" className="btn-primary mt-6 w-full">
          Back to log in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Sign up as a volunteer. An admin approves new accounts."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        <Field label="Full name" error={errors.name?.message}>
          <input
            className="input"
            {...register("name", { required: "Name is required" })}
          />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input
            type="email"
            className="input"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^\S+@\S+\.\S+$/,
                message: "Enter a valid email",
              },
            })}
          />
        </Field>
        <Field label="Phone (optional)">
          <input className="input" {...register("phone")} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input
            type="password"
            autoComplete="new-password"
            className="input"
            {...register("password", passwordRules)}
          />
        </Field>
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="h-4 w-4" />}Create account
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-brand-700 hover:underline"
        >
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
