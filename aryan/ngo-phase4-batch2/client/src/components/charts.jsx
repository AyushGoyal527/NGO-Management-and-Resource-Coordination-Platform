import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Skeleton } from './ui';

export const COLORS = ['#17805f', '#2f8fb5', '#e0a030', '#7a6fd0', '#d8574a', '#8a99a8'];
const axis = { fontSize: 12, fill: '#64748b' };

export function ChartCard({ title, subtitle, loading, empty, children }) {
  return (
    <section className="card p-4">
      <h2 className="font-medium text-slate-900">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-3 h-60">
        {loading ? <Skeleton className="h-full w-full" />
          : empty ? <div className="flex h-full items-center justify-center text-sm text-slate-400">No data yet</div>
            : <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>}
      </div>
    </section>
  );
}

const hasValues = (data, keys) => !!data?.some((d) => keys.some((k) => d[k] > 0));

export function LineCard({ title, subtitle, data, xKey = 'label', series, loading, format }) {
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} empty={!loading && !hasValues(data, series.map((s) => s.key))}>
      <LineChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey={xKey} tick={axis} tickLine={false} axisLine={false} />
        <YAxis tick={axis} tickLine={false} axisLine={false} width={48} tickFormatter={format} />
        <Tooltip formatter={(v) => (format ? format(v) : v)} />
        {series.length > 1 && <Legend />}
        {series.map((s, i) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={COLORS[i]} strokeWidth={2.5} dot={{ r: 3 }} />)}
      </LineChart>
    </ChartCard>
  );
}

export function BarCard({ title, subtitle, data, xKey = 'name', series, loading }) {
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} empty={!loading && !hasValues(data, series.map((s) => s.key))}>
      <BarChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey={xKey} tick={axis} tickLine={false} axisLine={false} interval={0} />
        <YAxis tick={axis} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
        <Tooltip cursor={{ fill: '#f1f5f9' }} />
        {series.length > 1 && <Legend />}
        {series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.name} fill={COLORS[i]} radius={[4, 4, 0, 0]} />)}
      </BarChart>
    </ChartCard>
  );
}

export function DonutCard({ title, subtitle, data, loading }) {
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} empty={!loading && !hasValues(data, ['value'])}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, textTransform: 'capitalize' }} />
      </PieChart>
    </ChartCard>
  );
}
