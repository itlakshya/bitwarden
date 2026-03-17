import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  PencilIcon, 
  TrashIcon, 
  XMarkIcon, 
  ClipboardIcon, 
  PlusIcon, 
  MagnifyingGlassIcon, 
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { Fragment } from 'react';

interface Item {
  _id: string;
  key?: string;
  value?: string;
  name?: string;
  notes?: string;
  points?: number;
  links?: string[];
  images?: string[];
  createdAt: string;
  targetDate?: string;
  status?: 'ETS' | 'IN_PROGRESS' | 'COMPLETED';
}

interface Todo {
  _id: string;
  title: string;
  items: Item[];
  user: string;
  createdAt: string;
  targetDate?: string;
}

interface TodoDetailProps {
  todo: Todo;
  onUpdateTodo: (todo: Todo) => void;
}

export default function TodoDetail({ todo, onUpdateTodo }: TodoDetailProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [visibleValues, setVisibleValues] = useState<Record<string, boolean>>({});

  const toggleValueVisibility = (itemId: string) => {
    setVisibleValues(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleAddItem = () => {
    setCurrentItem(null);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEditItem = (item: Item) => {
    setCurrentItem(item);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDeleteItem = (item: Item) => {
    setItemToDelete(item);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteItem = () => {
    if (itemToDelete) {
      const updatedTodo = {
        ...todo,
        items: todo.items.filter((item) => item._id !== itemToDelete._id),
      };
      onUpdateTodo(updatedTodo);
      setItemToDelete(null);
      setIsDeleteConfirmOpen(false);
      toast.success('Item deleted successfully');
    }
  };

  const cancelDeleteItem = () => {
    setItemToDelete(null);
    setIsDeleteConfirmOpen(false);
  };

  const handleSubmitItem = (formData: Item) => {
    let updatedItems;
    if (isEditing && currentItem) {
      updatedItems = todo.items.map((item) =>
        item._id === currentItem._id ? { ...item, ...formData } : item
      );
    } else {
      updatedItems = [...todo.items, formData];
    }

    onUpdateTodo({
      ...todo,
      items: updatedItems,
    });
    setIsModalOpen(false);
  };

  const filteredItems = todo.items.filter(item =>
  (item.key?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.value?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tighter">
            <span className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
              {todo.title}
            </span>
          </h1>
          <div className="flex items-center space-x-4 text-xs font-medium text-slate-600 uppercase tracking-wider">
            <span>Created {new Date(todo.createdAt).toLocaleDateString()}</span>
            <span>•</span>
            <span className="text-yellow-500/80">{todo.items.length} {todo.items.length === 1 ? 'item' : 'items'}</span>
          </div>
        </div>
        <button
          onClick={handleAddItem}
          className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-2.5 text-sm font-bold text-[#09090b] hover:opacity-90 transition-all shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:scale-[1.02] active:scale-[0.98]"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Item
        </button>
      </div>

      <div className="relative group">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-yellow-600 transition-colors" />
        <input
          type="text"
          placeholder="Search items by key or value..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-yellow-500/40 focus:border-yellow-500/40 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-widest border-r border-slate-200">Key</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-widest border-r border-slate-200">Value</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-widest">Actions</th>
              </tr>
              <tr className="h-0.5 bg-gradient-to-r from-yellow-500/30 via-transparent to-amber-500/30">
                <th colSpan={3}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.map((item) => (
                <tr key={item._id} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 border-r border-slate-200">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-slate-900 truncate max-w-[200px]" title={item.key}>
                        {item.key || '-'}
                      </span>
                      {item.key && (
                        <button
                          onClick={() => copyToClipboard(item.key!)}
                          className="p-1 text-slate-500 hover:text-yellow-600 transition-colors"
                          title="Copy key"
                        >
                          <ClipboardIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 border-r border-slate-200">
                    <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono text-slate-500 group-hover:text-slate-900 transition-colors truncate max-w-[300px]" title={visibleValues[item._id] ? item.value : undefined}>
                        {visibleValues[item._id] ? (item.value || '-') : '••••••••'}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => toggleValueVisibility(item._id)}
                          className="p-1 text-slate-500 hover:text-yellow-600 transition-colors"
                          title={visibleValues[item._id] ? "Hide value" : "Show value"}
                        >
                          {visibleValues[item._id] ? (
                            <EyeSlashIcon className="h-3.5 w-3.5" />
                          ) : (
                            <EyeIcon className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {item.value && (
                          <button
                            onClick={() => copyToClipboard(item.value!)}
                            className="p-1 text-slate-500 hover:text-yellow-600 transition-colors"
                            title="Copy value"
                          >
                            <ClipboardIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-500/10 rounded-lg transition-all"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="p-4 bg-slate-50 rounded-full border border-slate-200">
                        <PlusIcon className="h-8 w-8 text-slate-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900">
                          {searchQuery ? 'No items found.' : 'No items yet.'}
                        </p>
                        <p className="text-xs text-slate-600">
                          {searchQuery ? 'Try adjusting your search query.' : 'Click "Add Item" to populate this project.'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md bg-white rounded-xl p-8 border border-slate-200 shadow-2xl">
                  <div className="mb-6">
                    <Dialog.Title as="h3" className="text-2xl font-semibold tracking-tight text-slate-900">
                      {isEditing ? 'Edit Item' : 'Add Item'}
                    </Dialog.Title>
                    <p className="text-sm text-slate-600 mt-1">
                      {isEditing ? 'Modify your item details below' : 'Store a new key-value pair in this project'}
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const data: Item = {
                        _id: currentItem?._id || `temp_${Math.random().toString(36).substr(2, 9)}`,
                        key: formData.get('key') as string,
                        value: formData.get('value') as string,
                        createdAt: currentItem?.createdAt || new Date().toISOString(),
                      };
                      handleSubmitItem(data);
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none text-slate-900">Key</label>
                      <input
                        type="text"
                        name="key"
                        defaultValue={currentItem?.key || ''}
                        required
                        placeholder="e.g. API_URL, Primary Color"
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-yellow-500/40"
                      />
                    </div>
                    <div className="space-y-2">
                    <label className="text-sm font-medium leading-none text-slate-900">Value</label>
                      <textarea
                        name="value"
                        defaultValue={currentItem?.value || ''}
                        required
                        placeholder="e.g. https://api.example.com, #3b82f6"
                        className="flex min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-yellow-500/40 resize-none"
                      />
                    </div>
                    <div className="flex justify-end space-x-3 pt-6">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-200 bg-white hover:bg-slate-50 h-10 px-4 py-2"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 h-10 px-4 py-2"
                      >
                        {isEditing ? 'Save Changes' : 'Add Item'}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Transition appear show={isDeleteConfirmOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={cancelDeleteItem}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md bg-white rounded-xl p-8 border border-slate-200 shadow-2xl text-left">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-500/10">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-500" aria-hidden="true" />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-xl font-semibold text-slate-900">
                        Delete Item
                      </Dialog.Title>
                      <p className="text-sm text-slate-600 mt-1">This action cannot be undone.</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-8">
                    Are you sure you want to delete this item? It will be removed from <span className="text-slate-900 font-medium">{todo.title}</span>.
                  </p>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={cancelDeleteItem}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-200 bg-white hover:bg-slate-50 h-10 px-4 py-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteItem}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-red-500 text-white hover:bg-red-600 h-10 px-4 py-2 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

