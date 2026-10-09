import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { useUIStore } from '../../store/useUIStore';
import { getSocket } from '../../lib/socket';
import api from '../../lib/api';
import { toast } from 'sonner';

export const KanbanBoard = ({ boardId, projectId, initialColumns = [], initialTasks = [] }) => {
  const { lastTaskMutation, notifyTaskMutation } = useUIStore();
  const [columns, setColumns] = useState(initialColumns);
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState(null);

  // Configure sensors with small distance activation so clicks still work seamlessly
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  useEffect(() => {
    setColumns(initialColumns);
    setTasks(initialTasks);
  }, [initialColumns, initialTasks]);

  // Synchronize any task mutations instantly
  useEffect(() => {
    if (!lastTaskMutation) return;
    const { type, task, taskId } = lastTaskMutation;

    if (type === 'created' && task) {
      const taskBoardId = typeof task.boardId === 'object' ? task.boardId._id : task.boardId;
      if (taskBoardId === boardId) {
        setTasks((prev) => {
          if (prev.some((t) => t._id === task._id)) return prev;
          return [...prev, task];
        });
      }
    } else if (type === 'deleted' && taskId) {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } else if (type === 'updated' && task) {
      setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)));
    }
  }, [lastTaskMutation, boardId]);

  // Real-time socket event listeners for the active board
  useEffect(() => {
    if (!boardId) return;

    const socket = getSocket();
    socket.emit('join:board', { boardId });

    const handleTaskCreated = ({ task }) => {
      setTasks((prev) => [...prev.filter((t) => t._id !== task._id), task]);
    };

    const handleTaskMoved = ({ task }) => {
      setTasks((prev) => {
        const without = prev.filter((t) => t._id !== task._id);
        return [...without, task].sort((a, b) => a.rank - b.rank);
      });
    };

    const handleTaskUpdated = ({ task }) => {
      setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)));
    };

    const handleTaskDeleted = ({ taskId }) => {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    };

    socket.on('task:created:v1', handleTaskCreated);
    socket.on('task:moved:v1', handleTaskMoved);
    socket.on('task:updated:v1', handleTaskUpdated);
    socket.on('task:deleted:v1', handleTaskDeleted);

    return () => {
      socket.emit('leave:board', { boardId });
      socket.off('task:created:v1', handleTaskCreated);
      socket.off('task:moved:v1', handleTaskMoved);
      socket.off('task:updated:v1', handleTaskUpdated);
      socket.off('task:deleted:v1', handleTaskDeleted);
    };
  }, [boardId]);

  const handleDragStart = (event) => {
    const { active } = event;
    const task = tasks.find((t) => t._id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTaskId = active.id;
    const overId = over.id;

    const currentTask = tasks.find((t) => t._id === activeTaskId);
    if (!currentTask) return;

    // Check if dropped directly onto a column or onto another card
    let targetColumnId = null;
    const isOverColumn = columns.some((c) => c._id === overId);

    if (isOverColumn) {
      targetColumnId = overId;
    } else {
      const overTask = tasks.find((t) => t._id === overId);
      if (overTask) {
        targetColumnId = overTask.columnId;
      }
    }

    if (!targetColumnId) return;

    // Target column's tasks (sorted by rank)
    const columnTasks = tasks
      .filter((t) => t.columnId === targetColumnId && t._id !== activeTaskId)
      .sort((a, b) => a.rank - b.rank);

    let prevRank = null;
    let nextRank = null;

    if (!isOverColumn) {
      const overTaskIndex = columnTasks.findIndex((t) => t._id === overId);
      if (overTaskIndex !== -1) {
        prevRank = columnTasks[overTaskIndex - 1]?.rank || null;
        nextRank = columnTasks[overTaskIndex]?.rank || null;
      }
    } else {
      // Dropped directly on column -> place at the end
      prevRank = columnTasks[columnTasks.length - 1]?.rank || null;
      nextRank = null;
    }

    // Snapshot for optimistic rollback
    const previousTasksState = [...tasks];

    // Optimistic client update
    const estimatedRank = prevRank != null && nextRank != null
      ? (prevRank + nextRank) / 2
      : prevRank != null
      ? prevRank + 1000
      : nextRank != null
      ? nextRank / 2
      : 1000;

    setTasks((prev) =>
      prev.map((t) =>
        t._id === activeTaskId ? { ...t, columnId: targetColumnId, rank: estimatedRank } : t
      )
    );

    // Send verified mutation to server
    try {
      const res = await api.post(`/tasks/${activeTaskId}/move`, {
        targetColumnId,
        prevRank,
        nextRank,
      });

      // Update with server authoritative rank
      const updatedTask = res.data.data;
      setTasks((prev) =>
        prev.map((t) => (t._id === updatedTask._id ? updatedTask : t))
      );
    } catch (err) {
      console.error('Failed to move task', err);
      // Rollback optimistic update
      setTasks(previousTasksState);
      toast.error('Failed to move task. Reverting changes.');
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-x-auto p-6 flex gap-6 items-start min-h-full">
        {columns.map((column) => {
          const colTasks = tasks
            .filter((t) => t.columnId === column._id)
            .sort((a, b) => a.rank - b.rank);

          return (
            <KanbanColumn
              key={column._id}
              column={column}
              tasks={colTasks}
              projectId={projectId}
              onTaskCreated={(newTask) => setTasks((prev) => [...prev, newTask])}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
};
