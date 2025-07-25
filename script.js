document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const projectSelector = document.getElementById('project-selector');
    const addProjectBtn = document.getElementById('add-project-btn');
    const editProjectBtn = document.getElementById('edit-project-btn');
    const deleteProjectBtn = document.getElementById('delete-project-btn');
    const copyAllTasksBtn = document.getElementById('copy-all-tasks-btn');
    const projectTitle = document.getElementById('project-title');
    const taskCount = document.getElementById('task-count');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.querySelector('.progress-container'); // Get container for ARIA
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    const filterButtons = document.getElementById('filter-buttons');
    const clearCompletedBtn = document.getElementById('clear-completed-btn');
    const emptyState = document.getElementById('empty-state');
    const announcer = document.querySelector('.sr-announcer'); // Announcer for SR

    // App State
    let state = JSON.parse(localStorage.getItem('taskAppState')) || {
        projects: { 'Default Project': [] },
        currentProjectId: 'Default Project'
    };
    let currentFilter = 'all';
    let draggedTaskId = null;

    // --- Accessibility Helper ---
    const announce = (message) => {
        announcer.textContent = message;
        // Clear after a delay so it can be re-announced if needed
        setTimeout(() => {
            announcer.textContent = '';
        }, 3000);
    };

    // --- Core Functions ---
    const saveState = () => {
        localStorage.setItem('taskAppState', JSON.stringify(state));
    };

    const updateNonTaskListUI = () => {
        updateHeader();
        updateProgressBar();
        checkEmptyState();
        const tasks = state.projects[state.currentProjectId] || [];
        copyAllTasksBtn.disabled = tasks.length === 0;
    };

    const updateUI = () => {
        renderProjects();
        renderTasks(); // Initial render
        updateNonTaskListUI();
        updateProjectActionButtons();
    };

    const updateProjectActionButtons = () => {
        const projectCount = Object.keys(state.projects).length;
        editProjectBtn.disabled = projectCount === 0;
        deleteProjectBtn.disabled = projectCount <= 1;
    };

    const checkEmptyState = () => {
        const tasks = state.projects[state.currentProjectId] || [];
        const shouldBeVisible = tasks.length === 0;
        emptyState.classList.toggle('hidden', !shouldBeVisible);
        taskList.style.display = shouldBeVisible ? 'none' : 'block';
    };

    // --- Project Management ---
    const renderProjects = () => {
        projectSelector.innerHTML = '';
        const currentProjectExists = state.currentProjectId in state.projects;
        if (!currentProjectExists && Object.keys(state.projects).length > 0) {
            state.currentProjectId = Object.keys(state.projects)[0];
        }
        for (const projectId in state.projects) {
            const option = document.createElement('option');
            option.value = projectId;
            option.textContent = projectId;
            if (projectId === state.currentProjectId) {
                option.selected = true;
            }
            projectSelector.appendChild(option);
        }
    };

    const addProject = () => {
        const projectName = prompt('Enter new project name:');
        if (projectName && !state.projects[projectName]) {
            state.projects[projectName] = [];
            state.currentProjectId = projectName;
            saveState();
            updateUI();
            announce(`Project "${projectName}" created and selected.`);
        } else if (state.projects[projectName]) {
            alert('A project with this name already exists.');
        }
    };
    
    const editProject = () => {
        const oldName = state.currentProjectId;
        const newName = prompt('Enter new project name:', oldName);
        if (!newName || newName.trim() === '' || newName === oldName) return;
        if (state.projects[newName]) {
            alert('A project with this name already exists.');
            return;
        }
        state.projects[newName] = state.projects[oldName];
        delete state.projects[oldName];
        state.currentProjectId = newName;
        saveState();
        updateUI();
        announce(`Project renamed to "${newName}".`);
    };
    
    const deleteProject = () => {
        if (Object.keys(state.projects).length <= 1) {
            alert("You cannot delete the last project.");
            return;
        }
        if (confirm(`Delete project "${state.currentProjectId}" and all its tasks?`)) {
            const deletedProjectName = state.currentProjectId;
            delete state.projects[state.currentProjectId];
            state.currentProjectId = Object.keys(state.projects)[0];
            saveState();
            updateUI();
            announce(`Project "${deletedProjectName}" deleted. Switched to project "${state.currentProjectId}".`);
        }
    };

    const switchProject = (projectId) => {
        state.currentProjectId = projectId;
        currentFilter = 'all'; // Reset filter on project switch
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });
        const allFilterBtn = document.querySelector('.filter-btn[data-filter="all"]');
        allFilterBtn.classList.add('active');
        allFilterBtn.setAttribute('aria-pressed', 'true');
        saveState();
        updateUI();
        announce(`Switched to project "${projectId}".`);
    };

    // --- Header & Progress ---
    const updateHeader = () => {
        const tasks = state.projects[state.currentProjectId] || [];
        projectTitle.textContent = state.currentProjectId || 'No Project Selected';
        taskCount.textContent = tasks.length === 1 ? `1 Task` : `${tasks.length} Tasks`;
    };

    const updateProgressBar = () => {
        const tasks = state.projects[state.currentProjectId] || [];
        const completedTasks = tasks.filter(task => task.completed).length;
        const totalTasks = tasks.length;
        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        progressBar.style.width = `${progress}%`;
        // Update ARIA attributes for progress bar
        progressContainer.setAttribute('aria-valuenow', Math.round(progress));
        progressContainer.setAttribute('aria-valuetext', `${Math.round(progress)}% complete`);
    };

    // --- Task Rendering ---
    const renderTasks = () => {
        taskList.innerHTML = '';
        let tasks = state.projects[state.currentProjectId] || [];

        const filteredTasks = tasks.filter(task => {
            if (currentFilter === 'active') return !task.completed;
            if (currentFilter === 'completed') return task.completed;
            return true;
        });

        checkEmptyState();

        filteredTasks.forEach(task => {
            const li = createTaskElement(task);
            taskList.appendChild(li);
        });
    };
    
    const createTaskElement = (task) => {
        const li = document.createElement('li');
        li.className = task.completed ? 'completed' : '';
        li.setAttribute('data-id', task.id);
        li.setAttribute('draggable', true);
        
        const isChecked = task.completed ? 'true' : 'false';
        const label = task.completed ? `Mark task '${task.text}' as incomplete` : `Mark task '${task.text}' as complete`;

        li.innerHTML = `
            <button class="task-checkbox" role="switch" aria-checked="${isChecked}" aria-label="${label}">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
            <span class="task-text">${task.text}</span>
            <input type="text" class="edit-input hidden" value="${task.text}">
            <div class="task-actions">
                <button class="action-btn edit-btn" aria-label="Edit Task: ${task.text}">${createIcon('edit')}</button>
                <button class="action-btn copy-btn" aria-label="Copy Task: ${task.text}">${createIcon('copy')}</button>
                <button class="action-btn delete-btn" aria-label="Delete Task: ${task.text}">${createIcon('delete')}</button>
            </div>
        `;

        li.querySelector('.task-checkbox').addEventListener('click', () => toggleComplete(task.id));
        li.querySelector('.edit-btn').addEventListener('click', () => editTask(li, task.id));
        li.querySelector('.copy-btn').addEventListener('click', (e) => copyTask(e, task.id));
        li.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));
        
        li.addEventListener('dragstart', (e) => {
            draggedTaskId = task.id;
            setTimeout(() => e.target.classList.add('dragging'), 0);
        });

        li.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
            draggedTaskId = null;
        });

        return li;
    };

    const createIcon = (type) => {
        const icons = {
            edit: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>',
            copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
            delete: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>',
            check: '<polyline points="20 6 9 17 4 12"></polyline>'
        };
        return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[type]}</svg>`;
    };
    
    const setProjectButtonIcons = () => {
        editProjectBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
        deleteProjectBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
        copyAllTasksBtn.innerHTML = createIcon('copy');
    };

    // --- Task Actions ---

    const addTask = (text) => {
        const newTask = { id: Date.now(), text, completed: false };
        state.projects[state.currentProjectId].unshift(newTask);
        saveState();

        const taskElement = createTaskElement(newTask);
        taskList.prepend(taskElement);
        updateNonTaskListUI();
        announce(`Task added: ${text}`);
    };

    const deleteTask = (taskId) => {
        const tasks = state.projects[state.currentProjectId];
        const taskToDelete = tasks.find(t => t.id === taskId);
        if (!taskToDelete) return;

        if (!confirm(`Are you sure you want to delete this task: "${taskToDelete.text}"?`)) return;

        state.projects[state.currentProjectId] = tasks.filter(t => t.id !== taskId);
        saveState();

        const taskElement = taskList.querySelector(`[data-id='${taskId}']`);
        if (taskElement) {
            taskElement.classList.add('removing');
            taskElement.addEventListener('animationend', () => {
                taskElement.remove();
                updateNonTaskListUI();
                announce(`Task "${taskToDelete.text}" deleted.`);
            });
        } else {
            updateNonTaskListUI();
            announce(`Task "${taskToDelete.text}" deleted.`);
        }
    };
    
    const copyTask = (event, taskId) => {
        const tasks = state.projects[state.currentProjectId];
        const taskToCopy = tasks.find(t => t.id === taskId);
        const copyButton = event.currentTarget;
        if (!taskToCopy || !navigator.clipboard) return;

        navigator.clipboard.writeText(taskToCopy.text).then(() => {
            copyButton.classList.add('copied');
            copyButton.innerHTML = createIcon('check');
            announce(`Task "${taskToCopy.text}" copied to clipboard.`);
            setTimeout(() => {
                copyButton.classList.remove('copied');
                copyButton.innerHTML = createIcon('copy');
            }, 1500);
        }).catch(err => console.error('Failed to copy text: ', err));
    };

    const toggleComplete = (taskId) => {
        const tasks = state.projects[state.currentProjectId];
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        task.completed = !task.completed;
        saveState();

        const taskElement = taskList.querySelector(`[data-id='${taskId}']`);
        if (taskElement) {
            taskElement.classList.toggle('completed', task.completed);
            
            const checkbox = taskElement.querySelector('.task-checkbox');
            checkbox.setAttribute('aria-checked', task.completed);
            const newLabel = task.completed ? `Mark task '${task.text}' as incomplete` : `Mark task '${task.text}' as complete`;
            checkbox.setAttribute('aria-label', newLabel);
            
            announce(`Task "${task.text}" marked as ${task.completed ? 'complete' : 'incomplete'}.`);

            const shouldHide = (currentFilter === 'active' && task.completed) || (currentFilter === 'completed' && !task.completed);

            if (shouldHide) {
                taskElement.classList.add('removing');
                taskElement.addEventListener('animationend', () => {
                    taskElement.style.display = 'none';
                });
            }
        }
        updateNonTaskListUI();
    };

    const editTask = (li, taskId) => {
        const taskTextSpan = li.querySelector('.task-text');
        const input = li.querySelector('.edit-input');
        const originalText = taskTextSpan.textContent;

        taskTextSpan.classList.add('hidden');
        input.classList.remove('hidden');
        input.focus();
        input.select();

        const saveEdit = () => {
            const newText = input.value.trim();
            
            input.classList.add('hidden');
            taskTextSpan.classList.remove('hidden');

            if (newText && newText !== originalText) {
                const tasks = state.projects[state.currentProjectId];
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    task.text = newText;
                    saveState();
                    taskTextSpan.textContent = newText;
                    announce(`Task edited to "${newText}".`);
                }
            } else {
                taskTextSpan.textContent = originalText;
            }
        };

        input.addEventListener('blur', saveEdit, { once: true });
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') {
                input.removeEventListener('blur', saveEdit);
                input.value = originalText;
                input.blur();
            }
        });
    };

    const clearCompleted = () => {
        const tasks = state.projects[state.currentProjectId];
        const completedTasks = tasks.filter(task => task.completed);
        if (completedTasks.length === 0) return;
        
        const completedCount = completedTasks.length;
        state.projects[state.currentProjectId] = tasks.filter(task => !task.completed);
        saveState();

        completedTasks.forEach(task => {
            const taskElement = taskList.querySelector(`[data-id='${task.id}']`);
            if (taskElement) {
                taskElement.classList.add('removing');
                taskElement.addEventListener('animationend', () => {
                    taskElement.remove();
                });
            }
        });
        updateNonTaskListUI();
        announce(`${completedCount} completed ${completedCount > 1 ? 'tasks' : 'task'} cleared.`);
    };

    const copyAllTasks = () => {
        const tasks = state.projects[state.currentProjectId] || [];
        if (tasks.length === 0 || !navigator.clipboard) return;

        const formattedTasks = tasks
            .map((task, index) => `${index + 1}. ${task.text}`)
            .join('\n\n');

        navigator.clipboard.writeText(formattedTasks).then(() => {
            copyAllTasksBtn.innerHTML = createIcon('check');
            copyAllTasksBtn.classList.add('copied');
            announce('All tasks copied to clipboard.');
            setTimeout(() => {
                copyAllTasksBtn.innerHTML = createIcon('copy');
                copyAllTasksBtn.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy all tasks: ', err);
            alert('Could not copy tasks to clipboard.');
        });
    };

    // --- Drag & Drop Logic ---
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    taskList.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(taskList, e.clientY);
        document.querySelectorAll('.drop-indicator').forEach(el => el.classList.remove('drop-indicator'));
        if (afterElement) {
            afterElement.classList.add('drop-indicator');
        }
    });
    
    taskList.addEventListener('dragleave', () => {
        document.querySelectorAll('.drop-indicator').forEach(el => el.classList.remove('drop-indicator'));
    });

    taskList.addEventListener('drop', e => {
        e.preventDefault();
        document.querySelectorAll('.drop-indicator').forEach(el => el.classList.remove('drop-indicator'));
        const draggedElement = document.querySelector('.dragging');
        if (!draggedElement) return;

        const afterElement = getDragAfterElement(taskList, e.clientY);
        if (afterElement == null) {
            taskList.appendChild(draggedElement);
        } else {
            taskList.insertBefore(draggedElement, afterElement);
        }

        const newOrderedIds = [...taskList.querySelectorAll('li')].map(li => parseInt(li.dataset.id));
        const taskMap = new Map(state.projects[state.currentProjectId].map(task => [task.id, task]));
        state.projects[state.currentProjectId] = newOrderedIds.map(id => taskMap.get(id));
        
        saveState();
    });

    // --- Event Listeners ---
    addProjectBtn.addEventListener('click', addProject);
    editProjectBtn.addEventListener('click', editProject);
    deleteProjectBtn.addEventListener('click', deleteProject);
    copyAllTasksBtn.addEventListener('click', copyAllTasks);
    projectSelector.addEventListener('change', (e) => switchProject(e.target.value));

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = taskInput.value.trim();
        if (text) { addTask(text); taskInput.value = ''; }
    });

    filterButtons.addEventListener('click', (e) => {
        const targetButton = e.target.closest('button');
        if (targetButton) {
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            });
            targetButton.classList.add('active');
            targetButton.setAttribute('aria-pressed', 'true');
            currentFilter = targetButton.dataset.filter;
            renderTasks();
            announce(`Showing ${currentFilter} tasks.`);
        }
    });

    clearCompletedBtn.addEventListener('click', clearCompleted);
    
    // --- Initial Load ---
    setProjectButtonIcons();
    updateUI();
});