import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './TaskDashboard.css';

const TaskDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    taskType: '',
    workflowStage: '',
    search: ''
  });
  const [selectedTask, setSelectedTask] = useState(null);
  const [view, setView] = useState('all-tasks'); // Changed default to 'all-tasks' to show all tasks
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    fetchTasks();
    fetchStatistics();
  }, [filters, view]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '/tasks';
      if (view === 'my-tasks') {
        endpoint = '/tasks/my-tasks';
      }

      const params = { ...filters };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);

      const response = await api.get(endpoint, { params });
      console.log('Tasks fetched:', response.data);
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError(error.response?.data?.message || 'Failed to load tasks. Please try again.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/tasks/statistics');
      console.log('Statistics fetched:', response.data);
      setStatistics(response.data.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      // Don't show error for statistics, just log it
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleStartTask = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/start`);
      fetchTasks();
      alert('Task started successfully!');
    } catch (error) {
      console.error('Error starting task:', error);
      alert('Failed to start task');
    }
  };

  const handleCompleteTask = async (taskId) => {
    const notes = prompt('Enter completion notes (optional):');
    try {
      await api.post(`/tasks/${taskId}/complete`, { notes });
      fetchTasks();
      alert('Task completed successfully!');
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Failed to complete task');
    }
  };

  const handleHoldTask = async (taskId) => {
    const reason = prompt('Enter reason for holding the task:');
    if (!reason) return;
    
    try {
      await api.post(`/tasks/${taskId}/hold`, { reason });
      fetchTasks();
      alert('Task put on hold');
    } catch (error) {
      console.error('Error holding task:', error);
      alert('Failed to hold task');
    }
  };

  const handleResumeTask = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/resume`);
      fetchTasks();
      alert('Task resumed successfully!');
    } catch (error) {
      console.error('Error resuming task:', error);
      alert('Failed to resume task');
    }
  };

  const handleUpdateProgress = async (taskId, progress) => {
    try {
      await api.put(`/tasks/${taskId}/progress`, { progressPercentage: progress });
      fetchTasks();
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      'PENDING': 'badge-secondary',
      'READY': 'badge-info',
      'ASSIGNED': 'badge-primary',
      'IN_PROGRESS': 'badge-warning',
      'COMPLETED': 'badge-success',
      'ON_HOLD': 'badge-danger',
      'BLOCKED': 'badge-dark',
      'FAILED': 'badge-danger'
    };
    return statusClasses[status] || 'badge-secondary';
  };

  const getPriorityBadgeClass = (priority) => {
    const priorityClasses = {
      'LOW': 'badge-secondary',
      'MEDIUM': 'badge-info',
      'HIGH': 'badge-warning',
      'URGENT': 'badge-danger'
    };
    return priorityClasses[priority] || 'badge-secondary';
  };

  const isTaskOverdue = (task) => {
    return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
  };

  return (
    <div className="task-dashboard">
      <div className="dashboard-header">
        <h1>Task Management Dashboard</h1>
        <div className="view-selector">
          <button 
            className={view === 'my-tasks' ? 'active' : ''}
            onClick={() => setView('my-tasks')}
          >
            My Tasks
          </button>
          <button 
            className={view === 'all-tasks' ? 'active' : ''}
            onClick={() => setView('all-tasks')}
          >
            All Tasks
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="statistics-row">
        <div className="stat-card">
          <h3>{statistics?.summary?.total || 0}</h3>
          <p>Total Tasks</p>
        </div>
        <div className="stat-card stat-warning">
          <h3>{statistics?.summary?.inProgress || 0}</h3>
          <p>In Progress</p>
        </div>
        <div className="stat-card stat-success">
          <h3>{statistics?.summary?.completed || 0}</h3>
          <p>Completed</p>
        </div>
        <div className="stat-card stat-danger">
          <h3>{statistics?.summary?.overdue || 0}</h3>
          <p>Overdue</p>
        </div>
        <div className="stat-card stat-info">
          <h3>{statistics?.summary?.completionRate || 0}%</h3>
          <p>Completion Rate</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <input
          type="text"
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="search-input"
        />

        <select 
          value={filters.status} 
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="READY">Ready</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="ON_HOLD">On Hold</option>
        </select>

        <select 
          value={filters.priority} 
          onChange={(e) => handleFilterChange('priority', e.target.value)}
          className="filter-select"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>

        <select 
          value={filters.workflowStage} 
          onChange={(e) => handleFilterChange('workflowStage', e.target.value)}
          className="filter-select"
        >
          <option value="">All Stages</option>
          <option value="PRE_PRODUCTION">Pre-Production</option>
          <option value="PRODUCTION">Production</option>
          <option value="POST_PRODUCTION">Post-Production</option>
          <option value="QUALITY_ASSURANCE">Quality Assurance</option>
          <option value="DISPATCH">Dispatch</option>
        </select>

        <button onClick={fetchTasks} className="btn-refresh">
          Refresh
        </button>
      </div>

      {/* Task List */}
      <div className="tasks-section">
        {loading ? (
          <div className="loading">Loading tasks...</div>
        ) : error ? (
          <div className="error-message" style={{ padding: '2rem', textAlign: 'center', color: '#dc3545', backgroundColor: '#f8d7da', borderRadius: '8px', border: '1px solid #f5c6cb' }}>
            <h3>⚠️ Error Loading Tasks</h3>
            <p>{error}</p>
            <button onClick={fetchTasks} className="btn-refresh" style={{ marginTop: '1rem' }}>
              Try Again
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="no-tasks" style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px dashed #dee2e6' }}>
            <h3>📋 No Tasks Found</h3>
            <p style={{ color: '#6c757d', marginTop: '1rem', marginBottom: '1.5rem' }}>
              {view === 'my-tasks' 
                ? 'You don\'t have any tasks assigned yet.' 
                : 'No tasks have been created yet.'}
            </p>
            <div style={{ backgroundColor: '#e7f3ff', padding: '1.5rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid #b3d9ff' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>💡 How to Create Tasks:</h4>
              <p style={{ fontSize: '0.875rem', color: '#004085' }}>
                Tasks are automatically created when you <strong>approve a quotation</strong> with the 
                <code style={{ padding: '0.2rem 0.4rem', backgroundColor: '#cfe2ff', borderRadius: '4px', margin: '0 0.25rem' }}>autoConvertToOrder</code> 
                flag enabled. Go to the <strong>Quotations</strong> page and approve a quotation to see tasks appear here!
              </p>
            </div>
          </div>
        ) : (
          <div className="task-grid">
            {tasks.map(task => (
              <div 
                key={task._id} 
                className={`task-card ${isTaskOverdue(task) ? 'overdue' : ''}`}
                onClick={() => setSelectedTask(task)}
              >
                <div className="task-header">
                  <div className="task-number">{task.taskNumber}</div>
                  <div className="task-badges">
                    <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                      {task.status}
                    </span>
                    <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>

                <h3 className="task-title">{task.title}</h3>
                
                {task.description && (
                  <p className="task-description">{task.description.substring(0, 100)}...</p>
                )}

                <div className="task-meta">
                  {task.order && (
                    <div className="meta-item">
                      <strong>Order:</strong> {task.order.orderNumber}
                    </div>
                  )}
                  {task.assignedTo && (
                    <div className="meta-item">
                      <strong>Assigned To:</strong> {task.assignedTo.firstName} {task.assignedTo.lastName}
                    </div>
                  )}
                  {task.dueDate && (
                    <div className="meta-item">
                      <strong>Due:</strong> {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {task.progressPercentage > 0 && (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${task.progressPercentage}%` }}
                    >
                      {task.progressPercentage}%
                    </div>
                  </div>
                )}

                <div className="task-actions">
                  {task.status === 'ASSIGNED' || task.status === 'READY' ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleStartTask(task._id); }}
                      className="btn btn-primary btn-sm"
                    >
                      Start
                    </button>
                  ) : null}

                  {task.status === 'IN_PROGRESS' ? (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleCompleteTask(task._id); }}
                        className="btn btn-success btn-sm"
                      >
                        Complete
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleHoldTask(task._id); }}
                        className="btn btn-warning btn-sm"
                      >
                        Hold
                      </button>
                    </>
                  ) : null}

                  {task.status === 'ON_HOLD' ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleResumeTask(task._id); }}
                      className="btn btn-info btn-sm"
                    >
                      Resume
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTask.taskNumber} - {selectedTask.title}</h2>
              <button onClick={() => setSelectedTask(null)} className="modal-close">×</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-row">
                <strong>Status:</strong>
                <span className={`badge ${getStatusBadgeClass(selectedTask.status)}`}>
                  {selectedTask.status}
                </span>
              </div>

              <div className="detail-row">
                <strong>Priority:</strong>
                <span className={`badge ${getPriorityBadgeClass(selectedTask.priority)}`}>
                  {selectedTask.priority}
                </span>
              </div>

              {selectedTask.description && (
                <div className="detail-row">
                  <strong>Description:</strong>
                  <p>{selectedTask.description}</p>
                </div>
              )}

              {selectedTask.order && (
                <div className="detail-row">
                  <strong>Order:</strong> {selectedTask.order.orderNumber}
                </div>
              )}

              {selectedTask.assignedTo && (
                <div className="detail-row">
                  <strong>Assigned To:</strong> {selectedTask.assignedTo.firstName} {selectedTask.assignedTo.lastName}
                </div>
              )}

              {selectedTask.requiredMachine && (
                <div className="detail-row">
                  <strong>Machine Required:</strong> {selectedTask.requiredMachine.machineName}
                </div>
              )}

              <div className="detail-row">
                <strong>Estimated Duration:</strong> {selectedTask.estimatedDurationMinutes} minutes
              </div>

              {selectedTask.actualDurationMinutes && (
                <div className="detail-row">
                  <strong>Actual Duration:</strong> {selectedTask.actualDurationMinutes} minutes
                </div>
              )}

              {selectedTask.dueDate && (
                <div className="detail-row">
                  <strong>Due Date:</strong> {new Date(selectedTask.dueDate).toLocaleString()}
                </div>
              )}

              {selectedTask.progressPercentage > 0 && (
                <div className="detail-row">
                  <strong>Progress:</strong>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${selectedTask.progressPercentage}%` }}
                    >
                      {selectedTask.progressPercentage}%
                    </div>
                  </div>
                  {selectedTask.status === 'IN_PROGRESS' && (
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={selectedTask.progressPercentage}
                      onChange={(e) => handleUpdateProgress(selectedTask._id, parseInt(e.target.value))}
                      className="progress-slider"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDashboard;
