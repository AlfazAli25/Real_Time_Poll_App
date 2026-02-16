import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function PollChart({ options }) {
  const data = options.map((option) => ({
    name: option.text,
    votes: option.votes,
    percentage: option.percentage
  }));

  return (
    <div className="mt-5">
      <h3 className="text-sm font-medium text-slate-200">Live results</h3>
      <div className="mt-2 h-[290px] w-full rounded-xl border border-slate-700/60 bg-slate-900/65 p-2">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
            <XAxis dataKey="name" interval={0} angle={-8} textAnchor="end" height={60} stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
            <YAxis allowDecimals={false} stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
            <Tooltip formatter={(value, name) => [value, name === 'votes' ? 'Votes' : 'Percentage']} />
            <Bar dataKey="votes" fill="#4f8cff" radius={[6, 6, 0, 0]} animationDuration={700} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
