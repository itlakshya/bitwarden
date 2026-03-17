"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";

import SidePanel from "@/components/SidePanel";
import TodoDetail from "@/components/TodoDetail";

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
  status?: "ETS" | "IN_PROGRESS" | "COMPLETED";
}

interface Todo {
  _id: string;
  title: string;
  items: Item[];
  user: string;
  createdAt: string;
  targetDate?: string;
}

export default function DashboardClient() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    const handleOpenSidebar = (event: CustomEvent) => {
      setIsSidePanelOpen(event.detail.isOpen);
    };

    window.addEventListener("openSidebar", handleOpenSidebar as EventListener);

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener(
        "openSidebar",
        handleOpenSidebar as EventListener
      );
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("sidebarToggle", {
        detail: { isOpen: isSidePanelOpen },
      })
    );
  }, [isSidePanelOpen]);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("/api/todos");
      setTodos(response.data);
    } catch {
      toast.error("Failed to fetch todos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTodo = async (title: string, targetDate?: string) => {
    try {
      const response = await axios.post("/api/todos", {
        title,
        items: [],
        targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
      });
      setTodos([response.data, ...todos]);
      setSelectedTodo(response.data);
      toast.success("Todo created successfully");
    } catch {
      toast.error("Failed to create todo");
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      await axios.delete(`/api/todos/${id}`);
      setTodos(todos.filter((todo) => todo._id !== id));
      if (selectedTodo?._id === id) {
        setSelectedTodo(null);
      }
      toast.success("Todo deleted successfully");
    } catch {
      toast.error("Failed to delete todo");
    }
  };

  const handleUpdateTodo = async (updatedTodo: Todo) => {
    try {
      const response = await axios.put(
        `/api/todos/${updatedTodo._id}`,
        updatedTodo
      );

      if (response.data) {
        setTodos(
          todos.map((todo) =>
            todo._id === updatedTodo._id ? response.data : todo
          )
        );
        setSelectedTodo(response.data);
        toast.success("Todo updated successfully");
      }
    } catch (error: any) {
      console.error("Error updating todo:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to update todo";
      toast.error(errorMessage);

      if (selectedTodo) {
        setSelectedTodo({ ...selectedTodo });
      }
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div data-aos="fade-right" data-aos-duration="800">
        <SidePanel
          todos={todos}
          onTodoClick={(todo: Todo) => {
            setSelectedTodo(todo);
            if (isMobile) {
              setIsSidePanelOpen(false);
            }
          }}
          onCreateTodo={handleCreateTodo}
          onDeleteTodo={handleDeleteTodo}
          onUpdateTodo={handleUpdateTodo}
          isMobile={isMobile}
          isOpen={isSidePanelOpen}
          setIsOpen={setIsSidePanelOpen}
          isLoading={isLoading}
        />
      </div>
      <div
        className="flex-1 overflow-auto transition-all duration-300 ease-in-out bg-slate-50"
        data-aos="fade-left"
        data-aos-delay="200"
      >
        {selectedTodo ? (
          <TodoDetail todo={selectedTodo} onUpdateTodo={handleUpdateTodo} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 p-8">
            <div
              className="max-w-md text-center p-12 rounded-2xl bg-white shadow-2xl border border-slate-200"
              data-aos="zoom-in"
              data-aos-delay="400"
            >
              <div className="w-20 h-20 mx-auto mb-8 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200">
                <img
                  src="/window.svg"
                  alt="Todo"
                  className="w-10 h-10 opacity-60"
                />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">
                No Project Selected
              </h2>
              <p className="text-sm leading-relaxed text-slate-500">
                {todos.length > 0
                  ? "Select a project from the sidebar or create a new one to begin managing your tasks."
                  : "Start by creating your first project from the sidebar to organize your workflow."}
              </p>
            </div>
          </div>
        )}
      </div>
      <Toaster
        position="top-center"
        toastOptions={{
          className:
            "!bg-white !text-slate-900 !border !border-slate-200 !rounded-lg !text-sm",
          duration: 3000,
        }}
      />
    </div>
  );
}
