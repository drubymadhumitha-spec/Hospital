import { useState } from 'react';
import { 
  Plus, Edit, Trash2, AlertTriangle, Pill, Package, Factory, Tag, 
  TrendingUp, Clock, FileText, Search 
} from 'lucide-react';
import { useApi, apiPost, apiPut, apiDelete } from '@/react-app/hooks/useApi';
import { Medicine } from '@/shared/types';
import Modal from '@/react-app/components/Modal';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';

export default function Medicines() {
  // Use the updated useApi hook with Supabase
  const { data: medicines, loading, refetch } = useApi<Medicine[]>('medicines');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manufacturer: '',
    category: '',
    stock_quantity: '',
    unit_price: '',
    expiry_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        description: formData.description || null,
        manufacturer: formData.manufacturer || null,
        category: formData.category || null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
        expiry_date: formData.expiry_date || null,
      };

      if (editingMedicine) {
        await apiPut('medicines', editingMedicine.id, data);
      } else {
        await apiPost('medicines', data);
      }
      
      setIsModalOpen(false);
      setEditingMedicine(null);
      resetForm();
      refetch();
    } catch (error) {
      console.error('Error saving medicine:', error);
      alert('Failed to save medicine. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      manufacturer: '',
      category: '',
      stock_quantity: '',
      unit_price: '',
      expiry_date: '',
    });
  };

  const handleEdit = (medicine: Medicine) => {
    setEditingMedicine(medicine);
    setFormData({
      name: medicine.name,
      description: medicine.description || '',
      manufacturer: medicine.manufacturer || '',
      category: medicine.category || '',
      stock_quantity: medicine.stock_quantity.toString(),
      unit_price: medicine.unit_price?.toString() || '',
      expiry_date: medicine.expiry_date || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this medicine?')) {
      try {
        await apiDelete('medicines', id);
        refetch();
      } catch (error) {
        console.error('Error deleting medicine:', error);
        alert('Failed to delete medicine. Please try again.');
      }
    }
  };

  // Format Indian Rupee
  const formatIndianCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const days = Math.floor((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 30 && days >= 0;
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Antibiotic': 'from-blue-500 to-cyan-500',
      'Painkiller': 'from-red-500 to-pink-500',
      'Antiviral': 'from-green-500 to-emerald-500',
      'Antifungal': 'from-purple-500 to-indigo-500',
      'Cardiovascular': 'from-rose-500 to-red-500',
      'Diabetes': 'from-amber-500 to-orange-500',
      'Respiratory': 'from-cyan-500 to-blue-500',
      'Gastrointestinal': 'from-emerald-500 to-green-500',
      'Vitamin': 'from-yellow-500 to-amber-500',
      'General': 'from-gray-500 to-slate-500',
    };
    return colors[category] || 'from-gray-500 to-slate-500';
  };

  // Filter medicines based on search query and category
  const filteredMedicines = medicines?.filter(medicine => {
    const matchesSearch = searchQuery === '' || 
      medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      medicine.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      medicine.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === '' || medicine.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }) || [];

  // Calculate medicine statistics
  const medicineStats = {
    total: medicines?.length || 0,
    lowStock: medicines?.filter(m => m.stock_quantity < 10).length || 0,
    expiringSoon: medicines?.filter(m => {
      if (!m.expiry_date) return false;
      const days = Math.floor((new Date(m.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days <= 30 && days >= 0;
    }).length || 0,
    totalValue: medicines?.reduce((sum, m) => sum + (m.stock_quantity * (m.unit_price || 0)), 0) || 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading medicine inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 p-4 md:p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Medicine Inventory
              </span>
            </h1>
            <p className="text-gray-600 text-lg">Manage medicine stock, pricing, and expiry tracking</p>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Medicine
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Medicines</p>
                <p className="text-2xl font-bold text-gray-900">{medicineStats.total}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg">
                <Pill className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-red-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900">{medicineStats.lowStock}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-red-100 to-rose-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Expiring Soon</p>
                <p className="text-2xl font-bold text-gray-900">{medicineStats.expiringSoon}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatIndianCurrency(medicineStats.totalValue)}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-emerald-100 to-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
        <div className="p-6 border-b border-blue-50 bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Medicine Stock</h2>
              <p className="text-sm text-gray-600">Manage all medicines with real-time stock tracking</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search medicines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white w-full md:w-64"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              </div>
              <select
                className="px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="Antibiotic">Antibiotics</option>
                <option value="Painkiller">Painkillers</option>
                <option value="Antiviral">Antivirals</option>
                <option value="Antifungal">Antifungal</option>
                <option value="Cardiovascular">Cardiovascular</option>
                <option value="Diabetes">Diabetes</option>
                <option value="Respiratory">Respiratory</option>
                <option value="Gastrointestinal">Gastrointestinal</option>
                <option value="Vitamin">Vitamins</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {filteredMedicines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-blue-50">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Medicine</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Category</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Manufacturer</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Stock Status</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Price</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Expiry</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {filteredMedicines.map((medicine) => (
                    <tr key={medicine.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <div className={`w-12 h-12 rounded-full ${medicine.stock_quantity < 10 ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-cyan-500'} flex items-center justify-center`}>
                              <Pill className="w-6 h-6 text-white" />
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-lg">{medicine.name}</div>
                            <div className="text-sm text-gray-600">
                              {medicine.description ? medicine.description.substring(0, 50) + '...' : 'No description'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {medicine.category ? (
                          <div className="flex items-center">
                            <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${getCategoryColor(medicine.category)} text-white font-medium shadow-sm flex items-center gap-2`}>
                              <Tag className="w-4 h-4" />
                              {medicine.category}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Not categorized</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {medicine.manufacturer ? (
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <Factory className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="font-medium text-gray-900">{medicine.manufacturer}</div>
                          </div>
                        ) : (
                          <div className="text-gray-400 italic">Not specified</div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-500" />
                            <div>
                              <div className={`font-bold text-lg ${medicine.stock_quantity < 10 ? 'text-red-600' : 'text-green-600'}`}>
                                {medicine.stock_quantity} units
                              </div>
                              {medicine.stock_quantity < 10 && (
                                <div className="flex items-center gap-1 text-sm text-red-600">
                                  <AlertTriangle className="w-3 h-3" />
                                  Low stock alert
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {medicine.unit_price ? (
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-emerald-50 rounded-lg">
                              <div className="w-5 h-5 text-emerald-600 font-bold">₹</div>
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-lg">{formatIndianCurrency(medicine.unit_price)}</div>
                              <div className="text-xs text-gray-500">per unit</div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-400 italic">Not set</div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {!medicine.expiry_date ? (
                          <div className="text-gray-400 italic">Not set</div>
                        ) : (
                          (() => {
                            const expired = isExpired(medicine.expiry_date);
                            const expiringSoon = isExpiringSoon(medicine.expiry_date);
                            
                            return (
                              <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-lg ${expired ? 'bg-red-50' : expiringSoon ? 'bg-orange-50' : 'bg-green-50'}`}>
                                  <Clock className={`w-5 h-5 ${expired ? 'text-red-600' : expiringSoon ? 'text-orange-600' : 'text-green-600'}`} />
                                </div>
                                <div>
                                  <div className={`font-bold ${expired ? 'text-red-600' : expiringSoon ? 'text-orange-600' : 'text-gray-900'}`}>
                                    {new Date(medicine.expiry_date).toLocaleDateString()}
                                  </div>
                                  <div className={`text-xs ${expired ? 'text-red-600' : expiringSoon ? 'text-orange-600' : 'text-gray-500'}`}>
                                    {expired && 'Expired'}
                                    {expiringSoon && !expired && 'Expiring soon'}
                                    {!expired && !expiringSoon && 'Valid'}
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(medicine)}
                            className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 text-blue-600 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                            title="Edit medicine"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(medicine.id)}
                            className="p-3 bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 text-red-600 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                            title="Delete medicine"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center">
                <Pill className="w-12 h-12 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {searchQuery || selectedCategory ? 'No matching medicines found' : 'No Medicines Found'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || selectedCategory ? 'Try a different search or filter' : 'Add your first medicine to start managing inventory'}
              </p>
              <Button 
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Medicine
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMedicine(null);
          resetForm();
        }}
        title={editingMedicine ? 'Edit Medicine Details' : 'Add New Medicine'}
        className="max-w-3xl"
      >
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-t-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
              <Pill className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Medicine Information</h3>
              <p className="text-sm text-gray-600">Fill in the medicine details below</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Pill className="w-4 h-4 text-blue-500" />
                Medicine Name *
              </label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter medicine name"
              />
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Tag className="w-4 h-4 text-purple-500" />
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2.5 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
              >
                <option value="">Select Category</option>
                <option value="Antibiotic">Antibiotic</option>
                <option value="Painkiller">Painkiller</option>
                <option value="Antiviral">Antiviral</option>
                <option value="Antifungal">Antifungal</option>
                <option value="Cardiovascular">Cardiovascular</option>
                <option value="Diabetes">Diabetes</option>
                <option value="Respiratory">Respiratory</option>
                <option value="Gastrointestinal">Gastrointestinal</option>
                <option value="Vitamin">Vitamin</option>
                <option value="General">General</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Factory className="w-4 h-4 text-cyan-500" />
                Manufacturer
              </label>
              <Input
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Medicine manufacturer"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Package className="w-4 h-4 text-green-500" />
                Stock Quantity *
              </label>
              <Input
                type="number"
                required
                min="0"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                className="bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Number of units"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <div className="w-4 h-4 text-emerald-500 font-bold">₹</div>
                Unit Price
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                className="bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Price per unit"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Clock className="w-4 h-4 text-red-500" />
                Expiry Date
              </label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <FileText className="w-4 h-4 text-gray-500" />
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
              placeholder="Medicine description, usage instructions, side effects..."
            />
          </div>

          <div className="flex gap-4 pt-6 border-t border-blue-100">
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Pill className="w-5 h-5 mr-2" />
              {editingMedicine ? 'Update Medicine' : 'Add to Inventory'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditingMedicine(null);
                resetForm();
              }}
              className="py-3 rounded-xl border border-blue-200 hover:border-blue-300"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}