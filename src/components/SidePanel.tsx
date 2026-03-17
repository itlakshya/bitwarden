import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon, PencilIcon, TrashIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';

interface Item {
  _id: string;
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

interface SidePanelProps {
  todos: Todo[];
  onTodoClick: (todo: Todo) => void;
  onCreateTodo: (title: string, targetDate?: string) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateTodo: (todo: Todo) => void;
  isMobile: boolean;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isLoading?: boolean;
}

export default function SidePanel({
  todos,
  onTodoClick,
  onCreateTodo,
  onDeleteTodo,
  onUpdateTodo,
  isMobile,
  isOpen,
  setIsOpen,
  isLoading = false,
}: SidePanelProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoTargetDate, setNewTodoTargetDate] = useState('');
  const [todoToDelete, setTodoToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoTitle.trim()) {
      onCreateTodo(newTodoTitle, newTodoTargetDate);
      setNewTodoTitle('');
      setNewTodoTargetDate('');
      setIsCreateModalOpen(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setTodoToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (todoToDelete) {
      onDeleteTodo(todoToDelete);
      setTodoToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleEditClick = (todo: Todo) => {
    setEditingTodo(todo);
    setEditTitle(todo.title);
    setEditTargetDate(todo.targetDate ? new Date(todo.targetDate).toISOString().split('T')[0] : '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTodo && editTitle.trim()) {
      const updatedTodo = {
        ...editingTodo,
        title: editTitle.trim(),
        targetDate: editTargetDate ? new Date(editTargetDate).toISOString() : undefined
      };
      onUpdateTodo(updatedTodo);
      setIsEditModalOpen(false);
      setEditingTodo(null);
      setEditTitle('');
      setEditTargetDate('');
    }
  };

  const filteredTodos = todos.filter(todo =>
    todo.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const panel = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold tracking-tighter">
            <span className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
              Projects
            </span>
          </h2>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 p-2 text-[#09090b] hover:opacity-90 transition-all shadow-[0_0_15px_rgba(251,191,36,0.2)] hover:scale-110 active:scale-95"
            title="Create Project"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="relative group">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-yellow-600 transition-colors" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-yellow-500/40 transition-all"
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
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 space-y-4">
            <div className="relative">
              <div className="w-8 h-8 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
              <div className="absolute inset-0 w-8 h-8 border-2 border-transparent border-b-amber-300 rounded-full animate-spin-slow" />
            </div>
            <p className="text-xs font-medium text-slate-600 tracking-widest uppercase">Loading...</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredTodos.map((todo) => (
              <div 
                key={todo._id} 
                className="group relative flex items-center rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all px-4 py-3 cursor-pointer"
                onClick={() => onTodoClick(todo)}
              >
                <div className="flex-1 min-w-0 mr-2">
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-yellow-600 transition-colors truncate">
                    {todo.title}
                  </h3>
                  <p className="text-[10px] font-medium text-slate-500 mt-0.5 uppercase tracking-wider">
                    {new Date(todo.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(todo);
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-500/10 rounded-md transition-all"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(todo._id);
                    }}
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-500/10 rounded-md transition-all"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            
            {filteredTodos.length === 0 && !isLoading && (
              <div className="px-4 py-12 text-center">
                <div className="inline-flex p-3 rounded-full bg-slate-50 border border-slate-200 mb-3">
                  <MagnifyingGlassIcon className="h-5 w-5 text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-600">
                  {searchQuery ? 'No results found.' : 'No projects yet.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Transition.Root show={isOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={setIsOpen}>
            <Transition.Child
              as={Fragment}
              enter="ease-in-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in-out duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-hidden">
              <div className="absolute inset-0 overflow-hidden">
                <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full">
                  <Transition.Child
                    as={Fragment}
                    enter="transform transition ease-in-out duration-300"
                    enterFrom="-translate-x-full"
                    enterTo="translate-x-0"
                    leave="transform transition ease-in-out duration-300"
                    leaveFrom="translate-x-0"
                    leaveTo="-translate-x-full"
                  >
                    <Dialog.Panel className="pointer-events-auto w-screen max-w-xs">
                      <div className="flex h-full flex-col bg-white">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                          <Dialog.Title className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                            Menu
                          </Dialog.Title>
                          <button 
                            onClick={() => setIsOpen(false)}
                            className="p-2 text-slate-500 hover:text-slate-900 transition-colors"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          {panel}
                        </div>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </div>
          </Dialog>
        </Transition.Root>

        <CreateTodoModal 
          isOpen={isCreateModalOpen}
          setIsOpen={setIsCreateModalOpen}
          title={newTodoTitle}
          setTitle={setNewTodoTitle}
          targetDate={newTodoTargetDate}
          setTargetDate={setNewTodoTargetDate}
          onSubmit={handleCreateSubmit}
        />

        <EditTodoModal
          isOpen={isEditModalOpen}
          setIsOpen={setIsEditModalOpen}
          title={editTitle}
          setTitle={setEditTitle}
          targetDate={editTargetDate}
          setTargetDate={setEditTargetDate}
          onSubmit={handleEditSubmit}
        />

        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          setIsOpen={setIsDeleteModalOpen}
          onConfirm={handleConfirmDelete}
        />
      </>
    );
  }

  return (
    <>
      <div className="w-80 h-full flex flex-col">{panel}</div>
      
      <CreateTodoModal 
        isOpen={isCreateModalOpen}
        setIsOpen={setIsCreateModalOpen}
        title={newTodoTitle}
        setTitle={setNewTodoTitle}
        targetDate={newTodoTargetDate}
        setTargetDate={setNewTodoTargetDate}
        onSubmit={handleCreateSubmit}
      />

      <EditTodoModal
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
        title={editTitle}
        setTitle={setEditTitle}
        targetDate={editTargetDate}
        setTargetDate={setEditTargetDate}
        onSubmit={handleEditSubmit}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        setIsOpen={setIsDeleteModalOpen}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

function CreateTodoModal({
  isOpen,
  setIsOpen,
  title,
  setTitle,
  onSubmit
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  title: string;
  setTitle: (title: string) => void;
  targetDate: string;
  setTargetDate: (date: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={() => setIsOpen(false)}>
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
                    Create New Project
                  </Dialog.Title>
                  <p className="text-sm text-slate-600 mt-1">Organize your items into projects</p>
                </div>
                
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="todoTitle" className="text-sm font-medium leading-none text-slate-900">
                       Project Name
                    </label>
                    <input
                      type="text"
                      id="todoTitle"
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-yellow-500/40"
                      placeholder="e.g. Work Assets, Personal Clips"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-6">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-200 bg-white hover:bg-slate-50 h-10 px-4 py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 h-10 px-4 py-2"
                    >
                      Create
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function EditTodoModal({
  isOpen,
  setIsOpen,
  title,
  setTitle,
  onSubmit
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  title: string;
  setTitle: (title: string) => void;
  targetDate: string;
  setTargetDate: (date: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={() => setIsOpen(false)}>
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
          <div className="flex min-h-full items-center justify-center p-4 text-center">
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
                <div className="mb-6">
                  <Dialog.Title as="h3" className="text-2xl font-semibold tracking-tight text-slate-900">
                    Edit Project
                  </Dialog.Title>
                  <p className="text-sm text-slate-600 mt-1">Make changes to your project details</p>
                </div>
                
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="editTodoTitle" className="text-sm font-medium leading-none text-slate-900">
                      Project Name
                    </label>
                    <input
                      type="text"
                      id="editTodoTitle"
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-yellow-500/40"
                      placeholder="Enter project name"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-6">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-200 bg-white hover:bg-slate-50 h-10 px-4 py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 h-10 px-4 py-2"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function DeleteConfirmationModal({
  isOpen,
  setIsOpen,
  onConfirm
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={() => setIsOpen(false)}>
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
          <div className="flex min-h-full items-center justify-center p-4 text-center">
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
                      Delete Project
                    </Dialog.Title>
                    <p className="text-sm text-slate-600 mt-1">This action cannot be undone.</p>
                  </div>
                </div>
                
                <p className="text-sm text-slate-600 mb-8">
                  Are you sure you want to delete this project? All items inside will be permanently removed.
                </p>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-200 bg-white hover:bg-slate-50 h-10 px-4 py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-red-500 text-white hover:bg-red-600 h-10 px-4 py-2 transition-colors"
                    onClick={onConfirm}
                  >
                    Delete Project
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

