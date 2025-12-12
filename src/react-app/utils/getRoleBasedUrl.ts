// // utils/getRoleBasedUrl.ts
// export function getRoleBasedUrl(role: string): string {
//   const roleUrls: Record<string, string> = {
//     admin: '/admin/dashboard',
//     doctor: '/doctor/dashboard',
//     receptionist: '/receptionist/dashboard',
//     patient: '/patient'
//   };
  
//   return roleUrls[role] || '/';
// }

// // Then in your ProtectedRoute component:
// import { getRoleBasedUrl } from '../utils/getRoleBasedUrl';

// // Replace the href in the button:
// <a
//   href={getRoleBasedUrl(user!.role)}
//   className="block w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
// >
//   Go to {user!.role === 'patient' ? 'Patient Portal' : `${user!.role.charAt(0).toUpperCase() + user!.role.slice(1)} Dashboard`}
// </a>