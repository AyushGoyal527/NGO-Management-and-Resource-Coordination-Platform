import { Link } from 'react-router-dom';
import { useAuth, homePath } from '../../context/AuthContext';

export default function Unauthorized({ notFound }) {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-semibold text-brand-600">{notFound ? '404' : '403'}</p>
      <h1 className="mt-3 text-xl font-semibold">{notFound ? 'Page not found' : 'You do not have access to this page'}</h1>
      <p className="mt-1 text-slate-500">{notFound ? 'The page may have moved or never existed.' : 'Ask an administrator if you think you should.'}</p>
      <Link to={user ? homePath(user.role) : '/'} className="btn-primary mt-6">Go back</Link>
    </div>
  );
}
