class TodoApp {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentTab = 'current';
        this.isRendering = false;
        this.lastRenderTime = 0;
        this.initEventListeners();
        this.render();
        
        // 초기 탭 설정 (즉시 실행)
        this.switchTab(this.currentTab);
        
        // 초기 로드 시 completed 섹션 확실히 숨기기
        const completedSection = document.querySelector('.tasks-grid .section[data-tab-group="completed all"]');
        if (completedSection) {
            completedSection.style.display = 'none';
        }
    }

    initEventListeners() {
        // DOM 요소가 로드되었는지 확인
        const addBtn = document.getElementById('addBtn');
        const taskInput = document.getElementById('taskInput');
        
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addTask());
        }
        
        if (taskInput) {
            taskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addTask();
            });
        }

        // 탭 버튼 이벤트 리스너
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            if (button.dataset.tab) {
                button.removeEventListener('click', this.tabClickHandler);
                button.addEventListener('click', this.tabClickHandler.bind(this));
            }
        });

        // 토글 리스너
        ['doNowToggle', 'doLaterToggle', 'delegateToggle', 'postponeToggle', 'completedToggle'].forEach(toggleId => {
            this.addToggleListener(toggleId, toggleId.replace('Toggle', 'Section'));
        });

        // 이벤트 위임을 사용한 이벤트 리스너
        document.addEventListener('change', (e) => {
            if (e.target.classList && e.target.classList.contains('task-checkbox')) {
                const taskId = parseInt(e.target.id.replace('checkbox-', ''));
                if (!isNaN(taskId)) this.toggleTask(taskId);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList) {
                if (e.target.classList.contains('edit-btn')) {
                    const taskId = parseInt(e.target.id.replace('edit-', ''));
                    if (!isNaN(taskId)) this.editTask(taskId);
                } else if (e.target.classList.contains('delete-btn')) {
                    const taskId = parseInt(e.target.id.replace('delete-', ''));
                    if (!isNaN(taskId)) this.deleteTask(taskId);
                } else if (e.target.classList.contains('save-btn')) {
                    const taskId = parseInt(e.target.id.replace('save-', ''));
                    if (!isNaN(taskId)) this.saveEdit(taskId);
                } else if (e.target.classList.contains('cancel-btn')) {
                    const taskId = parseInt(e.target.id.replace('cancel-', ''));
                    if (!isNaN(taskId)) this.cancelEdit(taskId);
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.classList && e.target.classList.contains('edit-input')) {
                const taskId = parseInt(e.target.id.replace('edit-input-', ''));
                if (!isNaN(taskId)) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.saveEdit(taskId);
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        this.cancelEdit(taskId);
                    }
                }
            }
        });
    }

    // 탭 클릭 핸들러를 별도 메서드로 분리
    tabClickHandler(event) {
        // 클릭된 요소나 그 상위 요소에서 data-tab을 찾기
        let target = event.target;
        let tabName = null;
        
        // 클릭된 요소부터 상위로 올라가면서 data-tab을 찾기
        while (target && !tabName) {
            tabName = target.dataset?.tab;
            if (!tabName) {
                target = target.parentElement;
            }
        }
        
        if (tabName) {
            this.switchTab(tabName);
        }
    }

    addToggleListener(toggleId, contentId) {
        const toggle = document.getElementById(toggleId);
        const content = document.getElementById(contentId);
        
        if (toggle && content && toggle.classList && content.classList) {
            toggle.addEventListener('click', () => {
                toggle.classList.toggle('collapsed');
                content.classList.toggle('collapsed');
            });
        }
    }

    switchTab(tabName) {
        if (this.currentTab === tabName) return;
        
        this.currentTab = tabName;
        
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            if (button && button.classList) {
                button.classList.remove('active');
            }
        });
        
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab && activeTab.classList) {
            activeTab.classList.add('active');
        }

        // 탭에 따라 적절한 섹션들 표시/숨김
        const gridSections = document.querySelectorAll('.tasks-grid .section');
        const completedSection = document.querySelector('.tasks-grid .section[data-tab-group="completed all"]');
        
        if (tabName === 'completed') {
            // 완료된 일 탭: tasks-grid 숨기고 completed 섹션만 표시
            gridSections.forEach(section => {
                section.style.display = 'none';
            });
            if (completedSection) {
                completedSection.style.display = 'block';
            }
            this.renderCompletedTasks();
        } else if (tabName === 'all') {
            // 총 할 일 탭: 모든 섹션 표시
            gridSections.forEach(section => {
                section.style.display = 'block';
            });
            if (completedSection) {
                completedSection.style.display = 'block';
            }
            this.render();
        } else {
            // 현재 할 일 탭: tasks-grid만 표시, completed 섹션 숨김
            gridSections.forEach(section => {
                section.style.display = 'block';
            });
            if (completedSection) {
                completedSection.style.display = 'none';
            }
            this.render();
        }
    }

    getTaskCategory(priority, urgency) {
        const p = parseInt(priority) || 3;
        const u = parseInt(urgency) || 3;
        
        if (p >= 3 && u >= 4) return 'doNow';
        if (p >= 3 && u <= 3) return 'doLater';
        if (p <= 2 && u >= 4) return 'delegate';
        return 'postpone';
    }

    addTask() {
        const taskInput = document.getElementById('taskInput');
        const prioritySelect = document.getElementById('prioritySelect');
        const urgencySelect = document.getElementById('urgencySelect');

        if (!taskInput || !prioritySelect || !urgencySelect) {
            console.error('필수 입력 요소를 찾을 수 없습니다.');
            return;
        }

        const text = taskInput.value.trim();
        if (!text) {
            alert('할 일을 입력해주세요.');
            return;
        }

        const priority = prioritySelect.value || '3';
        const urgency = urgencySelect.value || '3';
        
        const task = {
            id: Date.now(),
            text: text,
            priority: priority,
            urgency: urgency,
            category: this.getTaskCategory(priority, urgency),
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.push(task);
        this.saveTasks();
        this.render();

        taskInput.value = '';
        taskInput.focus();
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            
            if (task.completed) {
                task.completedAt = new Date().toISOString();
            } else {
                task.completedAt = null;
                task.category = this.getTaskCategory(task.priority, task.urgency);
            }
            
            this.saveTasks();
            this.render();
        }
    }

    deleteTask(id) {
        if (confirm('이 작업을 삭제하시겠습니까?')) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveTasks();
            this.render();
        }
    }

    editTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;
        
        task.isEditing = true;
        this.render();
        
        // 포커스 설정을 즉시 실행
        const input = document.getElementById(`edit-input-${id}`);
        if (input) {
            input.focus();
            input.select();
        }
    }

    saveEdit(id) {
        const input = document.getElementById(`edit-input-${id}`);
        const prioritySelect = document.getElementById(`edit-priority-${id}`);
        const urgencySelect = document.getElementById(`edit-urgency-${id}`);
        
        if (!input || !prioritySelect || !urgencySelect) {
            console.error('편집 요소를 찾을 수 없습니다:', { input: !!input, prioritySelect: !!prioritySelect, urgencySelect: !!urgencySelect, inputId: `edit-input-${id}`, priorityId: `edit-priority-${id}`, urgencyId: `edit-urgency-${id}` });
            return;
        }
        
        const newText = input.value.trim();
        if (!newText) {
            alert('할 일 내용을 입력해주세요.');
            return;
        }
        
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;
        
        const priority = prioritySelect.value;
        const urgency = urgencySelect.value;
        
        task.text = newText;
        task.priority = priority;
        task.urgency = urgency;
        task.category = this.getTaskCategory(priority, urgency);
        task.isEditing = false;
        
        this.saveTasks();
        this.render();
    }

    cancelEdit(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;
        
        task.isEditing = false;
        this.render();
    }

    loadTasks() {
        const stored = localStorage.getItem('todoTasks');
        if (!stored) return [];
        
        try {
            const tasks = JSON.parse(stored);
            
            return tasks.map(task => {
                if (typeof task.priority === 'string' && !/^[1-5]$/.test(task.priority)) {
                    switch (task.priority) {
                        case 'low': task.priority = '2'; break;
                        case 'medium': task.priority = '3'; break;
                        case 'high': task.priority = '4'; break;
                        default: task.priority = '3'; break;
                    }
                }
                
                if (!task.urgency) {
                    task.urgency = '3';
                } else if (typeof task.urgency === 'string' && !/^[1-5]$/.test(task.urgency)) {
                    task.urgency = '3';
                }
                
                const validCategories = ['doNow', 'doLater', 'delegate', 'postpone'];
                if (!task.category || !validCategories.includes(task.category)) {
                    task.category = this.getTaskCategory(task.priority, task.urgency);
                }
                
                delete task.date;
                return task;
            });
        } catch (error) {
            console.error('작업 데이터 로드 중 오류:', error);
            return [];
        }
    }

    saveTasks() {
        try {
            localStorage.setItem('todoTasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('작업 데이터 저장 중 오류:', error);
        }
    }

    render() {
        // 렌더링 중복 방지 및 시간 제한
        const now = Date.now();
        if (this.isRendering || (now - this.lastRenderTime < 100)) {
            return;
        }
        
        this.isRendering = true;
        this.lastRenderTime = now;
        
        try {
            // 즉시 실행으로 변경 (requestAnimationFrame 제거)
            this.renderTaskList('doNow', 'doNowTasks');
            this.renderTaskList('doLater', 'doLaterTasks');
            this.renderTaskList('delegate', 'delegateTasks');
            this.renderTaskList('postpone', 'postponeTasks');
            this.renderCompletedTasks();
            this.updateStats();
            
            this.isRendering = false;
        } catch (error) {
            console.error('렌더링 중 오류:', error);
            this.isRendering = false;
        }
    }

    renderTaskList(categoryType, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`컨테이너를 찾을 수 없습니다: ${containerId}`);
            return;
        }
        
        const tasks = this.tasks.filter(t => t.category === categoryType && !t.completed);

        if (tasks.length === 0) {
            const emptyMessages = {
                'doNow': '긴급하고 중요한 일이 없습니다.',
                'doLater': '중요하지만 급하지 않은 일이 없습니다.',
                'delegate': '급하지만 덜 중요한 일이 없습니다.',
                'postpone': '덜 중요하고 급하지 않은 일이 없습니다.'
            };
            container.innerHTML = `<li class="empty-state">${emptyMessages[categoryType]}</li>`;
            return;
        }

        container.innerHTML = tasks
            .sort((a, b) => {
                const priorityDiff = parseInt(b.priority) - parseInt(a.priority);
                if (priorityDiff !== 0) return priorityDiff;
                return parseInt(b.urgency || '3') - parseInt(a.urgency || '3');
            })
            .map((task, index) => this.createTaskHTML(task, index === 0))
            .join('');
    }

    renderCompletedTasks() {
        const container = document.getElementById('completedTasksList');
        if (!container) return;

        const completedTasks = this.tasks.filter(t => t.completed);

        if (completedTasks.length === 0) {
            container.innerHTML = '<li class="empty-state">완료된 일이 없습니다.</li>';
            return;
        }

        const htmlContent = completedTasks
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
            .map((task, index) => this.createTaskHTML(task, index === 0))
            .join('');
        
        container.innerHTML = htmlContent;
    }

    createTaskHTML(task, showLabels = false) {
        const priorityClass = `priority-${task.priority}`;
        const urgencyClass = `urgency-${task.urgency || '3'}`;
        const completedClass = task.completed ? 'completed' : '';
        
        if (task.isEditing) {
            return `
                <li class="task-item editing ${completedClass}">
                    <input type="checkbox" class="task-checkbox" id="checkbox-${task.id}" ${task.completed ? 'checked' : ''}>
                    <div class="task-content">
                        <div class="edit-row">
                            <input type="text" class="edit-input" id="edit-input-${task.id}" value="${task.text}" maxlength="100" placeholder="할 일을 입력하세요...">
                            <div class="edit-controls">
                                <div class="edit-controls-left">
                                    <div class="edit-field">
                                        <span class="edit-label">중요도</span>
                                        <select class="edit-select" id="edit-priority-${task.id}">
                                            <option value="1" ${task.priority === '1' ? 'selected' : ''}>🔵 매우 낮음</option>
                                            <option value="2" ${task.priority === '2' ? 'selected' : ''}>🟢 낮음</option>
                                            <option value="3" ${task.priority === '3' ? 'selected' : ''}>🟡 보통</option>
                                            <option value="4" ${task.priority === '4' ? 'selected' : ''}>🟠 높음</option>
                                            <option value="5" ${task.priority === '5' ? 'selected' : ''}>🔴 매우 높음</option>
                                        </select>
                                    </div>
                                    <div class="edit-field">
                                        <span class="edit-label">시급도</span>
                                        <select class="edit-select" id="edit-urgency-${task.id}">
                                            <option value="1" ${task.urgency === '1' ? 'selected' : ''}>🔵 매우 낮음</option>
                                            <option value="2" ${task.urgency === '2' ? 'selected' : ''}>🟢 낮음</option>
                                            <option value="3" ${task.urgency === '3' ? 'selected' : ''}>🟡 보통</option>
                                            <option value="4" ${task.urgency === '4' ? 'selected' : ''}>🟠 높음</option>
                                            <option value="5" ${task.urgency === '5' ? 'selected' : ''}>🔴 매우 높음</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="button-group">
                        <button class="save-btn" id="save-${task.id}">💾 저장</button>
                        <button class="cancel-btn" id="cancel-${task.id}">❌ 취소</button>
                    </div>
                </li>
            `;
        } else {
            return `
                <li class="task-item ${completedClass}">
                    <input type="checkbox" class="task-checkbox" id="checkbox-${task.id}" ${task.completed ? 'checked' : ''}>
                    <div class="task-content">
                        <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
                        <div class="indicators-group">
                            <div class="indicator-item">
                                <span class="indicator-label ${showLabels ? '' : 'invisible'}">중요도</span>
                                <span class="priority-indicator ${priorityClass}">${task.priority}</span>
                            </div>
                            <div class="indicator-item">
                                <span class="indicator-label ${showLabels ? '' : 'invisible'}">시급도</span>
                                <span class="urgency-indicator ${urgencyClass}">${task.urgency || '3'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="button-group">
                        <button class="edit-btn" id="edit-${task.id}">✏️ 수정</button>
                        <button class="delete-btn" id="delete-${task.id}">🗑️ 삭제</button>
                    </div>
                </li>
            `;
        }
    }

    updateStats() {
        const allTasks = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = allTasks - completed;

        const totalTasksEl = document.getElementById('totalTasks');
        const completedTasksEl = document.getElementById('completedTasks');
        const pendingTasksEl = document.getElementById('pendingTasks');

        if (totalTasksEl) totalTasksEl.textContent = pending;
        if (completedTasksEl) completedTasksEl.textContent = completed;
        if (pendingTasksEl) pendingTasksEl.textContent = allTasks;
    }
}

// DOM이 완전히 로드된 후에 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    try {
        new TodoApp();
    } catch (error) {
        console.error('앱 초기화 중 오류:', error);
    }
}); 