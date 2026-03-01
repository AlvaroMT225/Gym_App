// ==================== Auth ====================
export {
  signUp,
  signIn,
  signOut,
  getSession,
  getUser,
  resetPasswordRequest,
  updatePassword,
} from './auth'

// ==================== Profiles ====================
export {
  getProfile,
  updateProfile,
  getAthleteStats,
  getAthleteAchievements,
  getGymMembers,
  getMembership,
  getDashboard,
  getNotifications,
  markNotificationRead,
} from './profiles'

// ==================== Workouts ====================
export {
  startSession,
  completeSession,
  getRecentSessions,
  getSessionById,
  addSet,
  updateSet,
  deleteSet,
  getRoutines,
  getRoutineById,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  addExerciseToRoutine,
  removeExerciseFromRoutine,
  getPersonalRecords,
  getProgressData,
  getWeeklyVolume,
  getMonthlySessionCount,
} from './workouts'

// ==================== Machines ====================
export {
  getMachines,
  getMachineById,
  getMachineByQrCode,
  updateMachineStatus,
  getTutorialsByMachine,
  getTutorialProgress,
  updateTutorialProgress,
  getExercises,
  getExerciseById,
  recordQrScan,
  getGymRankings,
  getActiveChallenges,
} from './machines'
