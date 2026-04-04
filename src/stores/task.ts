import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'abandoned'

export interface Checkpoint {
  step: number
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  completedAt?: string
  outputs: string[]
  summary?: string
}

export interface Task {
  taskId: string
  taskDescription: string
  status: TaskStatus
  totalSteps: number
  completedSteps: number
  checkpoints: Checkpoint[]
  createdAt: string
  updatedAt: string
  projectPath?: string
  projectName?: string
  // 任务上下文
  context?: {
    techStack?: string[]
    decisions?: string[]
    nextStep?: {
      step: number
      title: string
      tasks: string[]
    }
  }
}

const STORAGE_KEY = 'clawdesk-tasks'
const CURRENT_TASK_KEY = 'clawdesk-current-task'

export const useTaskStore = defineStore('task', () => {
  // 当前任务 ID
  const currentTaskId = ref<string | null>(loadCurrentTaskId())
  
  // 任务列表
  const tasks = ref<Task[]>(loadTasks())
  
  // 当前任务
  const currentTask = computed(() => {
    if (!currentTaskId.value) return null
    return tasks.value.find(t => t.taskId === currentTaskId.value) || null
  })
  
  // 进度百分比
  const progress = computed(() => {
    if (!currentTask.value) return 0
    return Math.round((currentTask.value.completedSteps / currentTask.value.totalSteps) * 100)
  })
  
  // ========== 任务生命周期方法 ==========
  
  /**
   * 创建新任务
   * @param description 任务描述
   * @param totalSteps 总步骤数
   * @param projectPath 项目路径（可选）
   */
  function createTask(
    description: string, 
    totalSteps: number, 
    projectPath?: string,
    projectName?: string
  ): Task {
    const task: Task = {
      taskId: `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      taskDescription: description,
      status: 'pending',
      totalSteps,
      completedSteps: 0,
      checkpoints: Array.from({ length: totalSteps }, (_, i) => ({
        step: i + 1,
        title: '',
        status: 'pending' as const,
        outputs: []
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectPath,
      projectName
    }
    
    tasks.value.push(task)
    saveToStorage() // 创建后立即保存
    return task
  }
  
  /**
   * 开始任务
   */
  function startTask(taskId: string): boolean {
    const task = tasks.value.find(t => t.taskId === taskId)
    if (task) {
      task.status = 'in_progress'
      task.updatedAt = new Date().toISOString()
      currentTaskId.value = taskId
      saveToStorage()
      return true
    }
    return false
  }
  
  /**
   * 初始化任务步骤（设置每个步骤的标题）
   */
  function initTaskSteps(taskId: string, steps: { step: number; title: string }[]) {
    const task = tasks.value.find(t => t.taskId === taskId)
    if (task) {
      steps.forEach(s => {
        const checkpoint = task.checkpoints.find(c => c.step === s.step)
        if (checkpoint) {
          checkpoint.title = s.title
        }
      })
      task.updatedAt = new Date().toISOString()
      saveToStorage()
    }
  }
  
  /**
   * 开始某个步骤
   */
  function startStep(taskId: string, stepNumber: number) {
    const task = tasks.value.find(t => t.taskId === taskId)
    if (task) {
      const checkpoint = task.checkpoints.find(c => c.step === stepNumber)
      if (checkpoint) {
        checkpoint.status = 'in_progress'
        task.updatedAt = new Date().toISOString()
        saveToStorage()
      }
    }
  }
  
  /**
   * 完成某个步骤（主动保存检查点）
   * @param taskId 任务ID
   * @param stepNumber 步骤号
   * @param outputs 输出文件列表
   * @param summary 步骤总结
   */
  function completeStep(
    taskId: string, 
    stepNumber: number, 
    outputs: string[] = [],
    summary?: string
  ) {
    const task = tasks.value.find(t => t.taskId === taskId)
    if (task) {
      const checkpoint = task.checkpoints.find(c => c.step === stepNumber)
      if (checkpoint) {
        checkpoint.status = 'completed'
        checkpoint.completedAt = new Date().toISOString()
        checkpoint.outputs = outputs
        checkpoint.summary = summary
      }
      task.completedSteps = task.checkpoints.filter(c => c.status === 'completed').length
      task.updatedAt = new Date().toISOString()
      saveToStorage() // 步骤完成后立即保存
    }
  }
  
  /**
   * 更新任务上下文
   */
  function updateContext(
    taskId: string,
    context: Partial<Task['context']>
  ) {
    const task = tasks.value.find(t => t.taskId === taskId)
    if (task) {
      task.context = { ...task.context, ...context }
      task.updatedAt = new Date().toISOString()
      saveToStorage()
    }
  }
  
  /**
   * 完成任务
   */
  function completeTask(taskId: string) {
    const task = tasks.value.find(t => t.taskId === taskId)
    if (task) {
      task.status = 'completed'
      task.updatedAt = new Date().toISOString()
      currentTaskId.value = null
      saveCurrentTaskId(null)
      saveToStorage() // 任务完成后立即保存
    }
  }
  
  /**
   * 标记任务失败
   */
  function failTask(taskId: string, reason?: string) {
    const task = tasks.value.find(t => t.taskId === taskId)
    if (task) {
      task.status = 'failed'
      task.updatedAt = new Date().toISOString()
      if (reason && task.context) {
        task.context.decisions = task.context.decisions || []
        task.context.decisions.push(`失败原因: ${reason}`)
      }
      saveToStorage()
    }
  }
  
  /**
   * 放弃任务
   */
  function abandonTask(taskId: string) {
    const task = tasks.value.find(t => t.taskId === taskId)
    if (task) {
      task.status = 'abandoned'
      task.updatedAt = new Date().toISOString()
      if (currentTaskId.value === taskId) {
        currentTaskId.value = null
        saveCurrentTaskId(null)
      }
      saveToStorage()
    }
  }
  
  // ========== 查询方法 ==========
  
  /**
   * 获取未完成任务（用于检查点恢复）
   */
  function getUnfinishedTasks(): Task[] {
    return tasks.value.filter(t => t.status === 'in_progress')
  }
  
  /**
   * 检查是否有未完成任务（供 AI 调用）
   * @param projectPath 项目路径（可选，用于筛选）
   */
  function checkForUnfinishedTask(projectPath?: string): Task | null {
    const unfinished = tasks.value.filter(t => 
      t.status === 'in_progress' &&
      (!projectPath || t.projectPath === projectPath)
    )
    
    // 返回最近更新的未完成任务
    if (unfinished.length > 0) {
      return unfinished.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0]
    }
    return null
  }
  
  /**
   * 按状态获取任务
   */
  function getTasksByStatus(status: TaskStatus): Task[] {
    return tasks.value.filter(t => t.status === status)
  }
  
  /**
   * 根据ID获取任务
   */
  function getTaskById(taskId: string): Task | undefined {
    return tasks.value.find(t => t.taskId === taskId)
  }
  
  // ========== 维护方法 ==========
  
  /**
   * 清理已完成任务（保留最近 N 个）
   */
  function cleanupCompletedTasks(keepCount: number = 20) {
    const completed = tasks.value
      .filter(t => t.status === 'completed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    
    if (completed.length > keepCount) {
      const toRemove = completed.slice(keepCount).map(t => t.taskId)
      tasks.value = tasks.value.filter(t => !toRemove.includes(t.taskId))
      saveToStorage()
    }
  }
  
  /**
   * 保存到 localStorage（手动调用）
   */
  function saveToStorage() {
    saveTasks(tasks.value)
    if (currentTaskId.value) {
      saveCurrentTaskId(currentTaskId.value)
    }
  }
  
  return {
    // 状态
    currentTaskId,
    currentTask,
    tasks,
    progress,
    
    // 生命周期
    createTask,
    startTask,
    initTaskSteps,
    startStep,
    completeStep,
    updateContext,
    completeTask,
    failTask,
    abandonTask,
    
    // 查询
    getUnfinishedTasks,
    checkForUnfinishedTask,
    getTasksByStatus,
    getTaskById,
    
    // 维护
    cleanupCompletedTasks,
    saveToStorage
  }
})

// ========== 辅助函数 ==========

function loadTasks(): Task[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved) as Task[]
    }
  } catch (e) {
    console.error('加载任务列表失败:', e)
  }
  return []
}

function saveTasks(tasks: Task[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  } catch (e) {
    console.error('保存任务列表失败:', e)
  }
}

function loadCurrentTaskId(): string | null {
  try {
    return localStorage.getItem(CURRENT_TASK_KEY)
  } catch (e) {
    console.error('加载当前任务 ID 失败:', e)
    return null
  }
}

function saveCurrentTaskId(taskId: string | null) {
  try {
    if (taskId) {
      localStorage.setItem(CURRENT_TASK_KEY, taskId)
    } else {
      localStorage.removeItem(CURRENT_TASK_KEY)
    }
  } catch (e) {
    console.error('保存当前任务 ID 失败:', e)
  }
}
