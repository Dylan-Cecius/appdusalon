import TodoList from '@/components/TodoList';
import MainLayout from '@/components/MainLayout';

const TodoPage = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Organisation</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">To-do</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Centralisez les tâches à faire au salon et gardez les priorités visibles.
          </p>
        </div>
        <div className="v2-panel p-1 sm:p-2">
          <TodoList />
        </div>
      </div>
    </MainLayout>
  );
};

export default TodoPage;
