import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthShell, { Field } from "./AuthShell";
import { homePath, useAuth } from "../../context/AuthContext";
import { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  if (user) return <Navigate to={homePath(user.role)} replace />;

  const onSubmit = async ({ email, password }) => {
    setError("");
    try {
      const u = await login(email, password);
      const from = location.state?.from?.pathname;
      // Send people back where they were only if their role owns that area.
      navigate(
        from && from.startsWith(`/${u.role}`) ? from : homePath(u.role),
        { replace: true },
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <AuthShell
      title="Log in"
      subtitle="Use the account your administrator created for you."
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
        <Field label="Email" error={errors.email?.message}>
          <input
            type="email"
            autoComplete="email"
            className="input"
            {...register("email", { required: "Email is required" })}
          />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input
            type="password"
            autoComplete="current-password"
            className="input"
            {...register("password", { required: "Password is required" })}
          />
        </Field>
        <div className="text-right text-sm">
          <Link
            to="/forgot-password"
            className="text-brand-700 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="h-4 w-4" />}Log in
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        New volunteer?{" "}
        <Link
          to="/register"
          className="font-medium text-brand-700 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
