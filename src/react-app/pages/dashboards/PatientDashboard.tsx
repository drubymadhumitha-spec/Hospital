// src/react-app/pages/dashboards/PatientDashboard.tsx
export default function PatientDashboard() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Patient Dashboard</h1>
        <p className="text-gray-600">Your Health Management Portal</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Stats Cards */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-2xl font-bold mb-2">2:30 PM</div>
          <div className="text-sm opacity-90">Next Appointment</div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-2xl font-bold mb-2">3</div>
          <div className="text-sm opacity-90">Active Prescriptions</div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-2xl font-bold mb-2">$150</div>
          <div className="text-sm opacity-90">Pending Payments</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Upcoming Appointments</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <div className="font-medium">Today, 2:30 PM</div>
                <div className="text-sm text-gray-600">Dr. Smith - Cardiology</div>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                Confirmed
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Tomorrow, 10:00 AM</div>
                <div className="text-sm text-gray-600">Dr. Johnson - General Checkup</div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                Scheduled
              </span>
            </div>
          </div>
        </div>
        
        {/* Health Summary */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Health Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Blood Pressure</span>
              <span className="font-medium text-green-600">120/80</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Last Checkup</span>
              <span className="font-medium">2 weeks ago</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Next Follow-up</span>
              <span className="font-medium">In 1 month</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
            Book Appointment
          </button>
          <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
            View Records
          </button>
          <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
            Prescriptions
          </button>
          <button className="p-4 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
            Make Payment
          </button>
        </div>
      </div>
    </div>
  );
}