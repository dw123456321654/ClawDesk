import { invoke } from '@tauri-apps/api/core'
import { useTaskStore, type Task } from '@/stores/task'

/**
 * 检查点管理器
 * 
 * 设计原则：
 * 1. 不自动保存，由 AI 在关键节点主动调用
 * 2. 步骤完成时保存
 * 3. 任务完成时保存
 * 4. 任务失败时保存
 */
export class CheckpointManager {
  private static instance: CheckpointManager | null = null
  private taskStore: ReturnType<typeof useTaskStore> | null = null
  
  private constructor() {}
  
  static getInstance(): CheckpointManager {
    if (!CheckpointManager.instance) {
      CheckpointManager.instance = new CheckpointManager()
    }
    return CheckpointManager.instance
  }
  
  private getStore() {
    if (!this.taskStore) {
      this.taskStore = useTaskStore()
    }
    return this.taskStore
  }
  
  // ========== AI 调用接口 ==========
  
  /**
   * 检查是否有未完成任务（AI 开始开发前调用）
   * 
   * @param projectPath 项目路径
   * @returns 未完成任务信息，或 null
   * 
   * @example
   * const unfinished = checkpointManager.checkUnfinishedTask('D:/Projects/MyApp')
   * if (unfinished) {
   *   // 弹出恢复提示
   * }
   */
  checkUnfinishedTask(projectPath?: string): Task | null {
    const store = this.getStore()
    return store.checkForUnfinishedTask(projectPath)
  }
  
  /**
   * 创建新任务
   * 
   * @param description 任务描述
   * @param steps 步骤列表
   * @param projectPath 项目路径
   * 
   * @example
   * checkpointManager.createTask(
   *   '开发用户登录功能',
   *   [
   *     { step: 1, title: '创建登录页面' },
   *     { step: 2, title: '实现登录逻辑' },
   *     { step: 3, title: '添加表单验证' }
   *   ],
   *   'D:/Projects/MyApp'
   * )
   */
  createTask(
    description: string,
    steps: { step: number; title: string }[],
    projectPath?: string,
    projectName?: string
  ): Task {
    const store = this.getStore()
    const task = store.createTask(description, steps.length, projectPath, projectName)
    store.initTaskSteps(task.taskId, steps)
    store.startTask(task.taskId)
    return task
  }
  
  /**
   * 开始步骤
   */
  startStep(taskId: string, stepNumber: number) {
    const store = this.getStore()
    store.startStep(taskId, stepNumber)
  }
  
  /**
   * 完成步骤并保存检查点（关键方法）
   * 
   * @param taskId 任务ID
   * @param stepNumber 步骤号
   * @param outputs 输出文件列表
   * @param summary 步骤总结
   * 
   * @example
   * checkpointManager.completeStep(
   *   'task-xxx',
   *   1,
   *   ['src/pages/Login.vue', 'src/api/auth.ts'],
   *   '创建登录页面，实现基本布局和表单'
   * )
   */
  completeStep(
    taskId: string,
    stepNumber: number,
    outputs: string[] = [],
    summary?: string
  ) {
    const store = this.getStore()
    store.completeStep(taskId, stepNumber, outputs, summary)
    
    // 同时保存到项目目录（如果提供了项目路径）
    const task = store.getTaskById(taskId)
    if (task?.projectPath) {
      this.saveToProject(task).catch(e => {
        console.error('保存检查点到项目目录失败:', e)
      })
    }
  }
  
  /**
   * 完成任务
   */
  completeTask(taskId: string) {
    const store = this.getStore()
    store.completeTask(taskId)
    
    // 保存到项目目录
    const task = store.getTaskById(taskId)
    if (task?.projectPath) {
      this.saveToProject(task).catch(e => {
        console.error('保存检查点到项目目录失败:', e)
      })
    }
  }
  
  /**
   * 任务失败
   */
  failTask(taskId: string, reason?: string) {
    const store = this.getStore()
    store.failTask(taskId, reason)
  }
  
  /**
   * 放弃任务
   */
  abandonTask(taskId: string) {
    const store = this.getStore()
    store.abandonTask(taskId)
  }
  
  /**
   * 更新任务上下文（技术栈、决策等）
   */
  updateContext(
    taskId: string,
    context: {
      techStack?: string[]
      decisions?: string[]
      nextStep?: {
        step: number
        title: string
        tasks: string[]
      }
    }
  ) {
    const store = this.getStore()
    store.updateContext(taskId, context)
  }
  
  // ========== 文件持久化 ==========
  
  /**
   * 保存检查点到项目目录
   */
  async saveToProject(task: Task): Promise<string> {
    if (!task.projectPath) {
      throw new Error('任务没有关联项目路径')
    }
    
    const taskData = this.taskToFileFormat(task)
    
    try {
      const result = await invoke<string>('save_task_checkpoint', {
        projectPath: task.projectPath,
        taskData
      })
      return result
    } catch (e) {
      console.error('保存任务检查点失败:', e)
      throw e
    }
  }
  
  /**
   * 从项目目录加载检查点
   */
  async loadFromProject(projectPath: string): Promise<Task | null> {
    try {
      const result = await invoke<TaskFileFormat | null>('load_task_checkpoint', {
        projectPath
      })
      
      if (result) {
        return this.fileToTaskFormat(result)
      }
      return null
    } catch (e) {
      console.error('加载任务检查点失败:', e)
      return null
    }
  }
  
  // ========== 格式转换 ==========
  
  private taskToFileFormat(task: Task): TaskFileFormat {
    return {
      version: '1.0.0',
      projectPath: task.projectPath || '',
      projectName: task.projectName || 'Unknown',
      task: {
        taskId: task.taskId,
        description: task.taskDescription,
        status: task.status,
        currentStep: task.completedSteps,
        totalSteps: task.totalSteps,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        checkpoints: task.checkpoints.map(c => ({
          step: c.step,
          title: c.title,
          status: c.status,
          completedAt: c.completedAt,
          summary: c.summary
        }))
      },
      context: {
        techStack: task.context?.techStack || [],
        decisions: task.context?.decisions || [],
        nextStep: task.context?.nextStep
      }
    }
  }
  
  private fileToTaskFormat(file: TaskFileFormat): Task {
    return {
      taskId: file.task.taskId,
      taskDescription: file.task.description,
      status: file.task.status as Task['status'],
      totalSteps: file.task.totalSteps,
      completedSteps: file.task.currentStep,
      checkpoints: file.task.checkpoints.map(c => ({
        step: c.step,
        title: c.title,
        status: c.status as 'pending' | 'in_progress' | 'completed',
        completedAt: c.completedAt,
        outputs: [],
        summary: c.summary
      })),
      createdAt: file.task.createdAt,
      updatedAt: file.task.updatedAt,
      projectPath: file.projectPath,
      projectName: file.projectName,
      context: {
        techStack: file.context?.techStack || [],
        decisions: file.context?.decisions || [],
        nextStep: file.context?.nextStep
      }
    }
  }
}

// ========== 类型定义 ==========

interface TaskFileFormat {
  version: string
  projectPath: string
  projectName: string
  task: {
    taskId: string
    description: string
    status: string
    currentStep: number
    totalSteps: number
    createdAt: string
    updatedAt: string
    checkpoints: Array<{
      step: number
      title: string
      status: string
      completedAt?: string
      summary?: string
    }>
  }
  context: {
    techStack: string[]
    decisions: string[]
    nextStep?: {
      step: number
      title: string
      tasks: string[]
    }
  }
}

// 导出单例
export const checkpointManager = CheckpointManager.getInstance()

// 导出便捷方法供 AI 调用
export const {
  checkUnfinishedTask,
  createTask,
  startStep,
  completeStep,
  completeTask,
  failTask,
  abandonTask,
  updateContext
} = checkpointManager
