import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Boxes, CalendarDays, CheckCircle2, Clock, HandHeart, HeartHandshake, ListChecks, Package, School, Soup, Users, UserCheck, Wallet, Briefcase, Hourglass,
} from 'lucide-react';
import { EmptyState, Skeleton } from './ui';
import { inr, num, shortDate } from '../utils/format';

export { inr, num, shortDate, longDate } from '../utils/format';


const icons = {
  totalVolunteers: Users, activeVolunteers: UserCheck, totalStudents: School, totalBeneficiaries: HeartHandshake,
  totalDonations: Wallet, foodDistributed: Soup, availableResources: Boxes, pendingTasks: Hourglass, completedTasks: CheckCircle2,
  upcomingEvents: CalendarDays, assignedVolunteers: Users, activeTasks: ListChecks, assignedStudents: School,
  assignedBeneficiaries: HeartHandshake, managedResources: Package, todaysTasks: Clock, assignedTasks: Briefcase, volunteerHours: HandHeart,
  donationsReceived: HandHeart, averageGift: Wallet, awaitingDonations: Hourglass,
};

export function Widget({ widget }) {
  const Icon = icons[widget.key] || ListChecks;
  const value = widget.format === 'currency' ? inr(widget.value) : num(widget.value);
  return (
    <div className="card flex items-start gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{widget.label}</p>
        <p className="mt-0.5 truncate text-2xl font-semibold text-slate-900">{value}</p>
        {widget.hint && <p className="mt-0.5 text-xs text-slate-500">{widget.hint}</p>}
      </div>
    </div>
  );
}

export function WidgetGrid({ widgets, loading, count = 8 }) {
  if (loading) return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{[...Array(count)].map((_, i) => <Skeleton key={i} className="h-[88px]" />)}</div>;
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{widgets.map((w) => <Widget key={w.key} widget={w} />)}</div>;
}

export function Panel({ title, subtitle, children, className = '' }) {
  return (
    <section className={`card p-4 ${className}`}>
      <h2 className="font-medium text-slate-900">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

const COLORS = ['#17805f', '#e0a526', '#3b82c4', '#c4573b', '#7c5cc4', '#64748b'];
const axis = { fontSize: 12, fill: '#64748b' };
const tip = { contentStyle: { borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 } };

function ChartBox({ data, children, height = 240 }) {
  if (!data || data.length === 0 || data.every((d) => Object.values(d).filter((v) => typeof v === 'number').every((v) => v === 0))) {
    return <EmptyState title="No data yet" hint="This chart fills in as records are added." />;
  }
  return <div style={{ height }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}

export const TrendChart = ({ data, xKey, yKey, money }) => (
  <ChartBox data={data}>
    <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#17805f" stopOpacity={0.25} /><stop offset="100%" stopColor="#17805f" stopOpacity={0} /></linearGradient></defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
      <XAxis dataKey={xKey} tick={axis} tickLine={false} axisLine={false} />
      <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={money ? (v) => (v >= 1000 ? `${v / 1000}k` : v) : undefined} />
      <Tooltip {...tip} formatter={(v) => (money ? inr(v) : num(v))} />
      <Area type="monotone" dataKey={yKey} stroke="#17805f" strokeWidth={2} fill="url(#g)" />
    </AreaChart>
  </ChartBox>
);

export const BarsChart = ({ data, xKey, yKey, color = '#17805f' }) => (
  <ChartBox data={data}>
    <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
      <XAxis dataKey={xKey} tick={axis} tickLine={false} axisLine={false} interval={0} />
      <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
      <Tooltip {...tip} cursor={{ fill: '#f1f5f9' }} />
      <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={44} />
    </BarChart>
  </ChartBox>
);

export const DonutChart = ({ data }) => (
  <ChartBox data={data}>
    <PieChart>
      <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
      </Pie>
      <Tooltip {...tip} />
      <Legend iconType="circle" wrapperStyle={{ fontSize: 12, textTransform: 'capitalize' }} />
    </PieChart>
  </ChartBox>
);

export const statusLabel = { assigned: 'Assigned', accepted: 'Accepted', inProgress: 'In progress', completed: 'Completed', cancelled: 'Cancelled' };
const priorityStyle = { low: 'bg-slate-100 text-slate-600', medium: 'bg-sky-50 text-sky-700', high: 'bg-amber-50 text-amber-700', urgent: 'bg-red-50 text-red-700' };

export const TaskList = ({ tasks, empty }) => {
  if (!tasks?.length) return <EmptyState title={empty.title} hint={empty.hint} />;
  const now = new Date();
  return (
    <ul className="divide-y divide-slate-100">
      {tasks.map((t) => {
        const overdue = t.dueDate && new Date(t.dueDate) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return (
          <li key={t._id} className="flex items-start justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{t.title}</p>
              <p className="text-xs text-slate-500">
                {t.assignedUser?.name && `${t.assignedUser.name} · `}
                {t.dueDate ? <span className={overdue ? 'font-medium text-red-600' : ''}>{overdue ? 'Overdue, was due ' : 'Due '}{shortDate(t.dueDate)}</span> : 'No due date'}
                {t.status && ` · ${statusLabel[t.status]}`}
              </p>
            </div>
            {t.priority && <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${priorityStyle[t.priority]}`}>{t.priority}</span>}
          </li>
        );
      })}
    </ul>
  );
};

export const EventList = ({ events, empty }) => {
  if (!events?.length) return <EmptyState title={empty.title} hint={empty.hint} />;
  return (
    <ul className="divide-y divide-slate-100">
      {events.map((e) => (
        <li key={e._id} className="flex items-center gap-3 py-2.5">
          <div className="w-12 shrink-0 rounded-lg bg-brand-50 py-1 text-center text-brand-700">
            <p className="text-lg font-semibold leading-none">{new Date(e.date).getDate()}</p>
            <p className="text-xs">{new Date(e.date).toLocaleString('en-IN', { month: 'short' })}</p>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{e.name}</p>
            <p className="truncate text-xs text-slate-500">{[e.startTime && (e.endTime ? `${e.startTime}–${e.endTime}` : e.startTime), e.location].filter(Boolean).join(' · ')}</p>
          </div>
        </li>
      ))}
    </ul>
  );
};

