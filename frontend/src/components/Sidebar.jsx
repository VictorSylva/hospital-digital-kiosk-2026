import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Shield, Users, FileStack, Activity, Pill, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const Sidebar = ({ role }) => {
  const allItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'doctor', 'nurse', 'pharmacist', 'patient'] },
    { label: 'Admin', path: '/admin', icon: Shield, roles: ['admin'] },
    { label: 'Queue', path: '/queue', icon: Users, roles: ['admin', 'doctor', 'nurse', 'patient'] },
    { label: 'EHR records', path: '/ehr', icon: FileStack, roles: ['admin', 'doctor', 'nurse', 'patient'] },
    { label: 'Vitals', path: '/vitals', icon: Activity, roles: ['admin', 'doctor', 'nurse', 'patient'] },
    { label: 'Pharmacy', path: '/pharmacy', icon: Pill, roles: ['admin', 'doctor', 'pharmacist'] },
  ];

  const items = allItems.filter(item => item.roles.includes(role || 'patient'));

  return (
    <aside className="hidden md:flex flex-col w-64 h-[calc(100vh-4rem)] border-r border-slate-200 bg-white sticky top-16 shrink-0 z-10 transition-all">
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        <h3 className="px-4 text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Main Menu</h3>
        
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-blue-50 text-blue-700 font-semibold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={`${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`} />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="active-nav"
                    className="absolute left-0 w-1 h-8 bg-blue-600 rounded-r-full"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
      
      <div className="p-4 border-t border-slate-100">
        <NavLink
            to="/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
        >
          <Settings size={20} className="text-slate-400" />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
