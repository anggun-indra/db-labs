export interface CourseAdapter {
  getCourse(courseId: string): Promise<Record<string, unknown> | null>
  joinCourse(courseId: string, uid: string): Promise<void>
  leaveCourse(courseId: string, uid: string): Promise<void>
}

export function createCourseAdapter(): CourseAdapter | null {
  return {
    async getCourse(): Promise<Record<string, unknown> | null> { return null },
    async joinCourse(): Promise<void> {},
    async leaveCourse(): Promise<void> {}
  }
}

export function useCourseService(): CourseAdapter {
  return {
    getCourse: async () => null,
    joinCourse: async () => {},
    leaveCourse: async () => {}
  }
}

