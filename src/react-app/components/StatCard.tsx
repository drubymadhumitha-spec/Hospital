import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  gradient: string;
}

export default function StatCard({ title, value, icon: Icon, color, gradient }: StatCardProps) {
  return (
    <div className={`bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 overflow-hidden relative group`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity`}></div>
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );
}
