import { Link, Route, Routes } from 'react-router';
import { GuestOnly, HomeRedirect, RequireAuth } from './components/RouteGuards';
import SpaceBackdrop from './components/SpaceBackdrop';
import { EmptyState } from './components/ui';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminApplications from './pages/admin/AdminApplications';
import AdminCourses from './pages/admin/AdminCourses';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import AdminStudents from './pages/admin/AdminStudents';
import CourseBuilder from './pages/admin/CourseBuilder';
import LessonEditor from './pages/admin/LessonEditor';
import StudentStats from './pages/admin/StudentStats';
import ApplyPage from './pages/ApplyPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import LoginPage from './pages/LoginPage';
import CourseMap from './pages/student/CourseMap';
import LeaguePage from './pages/student/LeaguePage';
import LearnHome from './pages/student/LearnHome';
import LessonPlayer from './pages/student/LessonPlayer';
import PracticePage from './pages/student/PracticePage';
import ProfilePage from './pages/student/ProfilePage';
import StudentLayout from './pages/student/StudentLayout';

function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <EmptyState title="This page wandered off" mood="sad">
        <Link to="/" className="btn btn-primary">
          Go home
        </Link>
      </EmptyState>
    </div>
  );
}

export default function App() {
  return (
    <>
      <SpaceBackdrop />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/apply" element={<GuestOnly><ApplyPage /></GuestOnly>} />
        <Route path="/change-password" element={<RequireAuth roles={['student', 'admin']}><ChangePasswordPage /></RequireAuth>} />

        {/* Admins can open the student side too, to preview courses */}
        <Route element={<RequireAuth roles={['student', 'admin']}><StudentLayout /></RequireAuth>}>
          <Route path="/learn" element={<LearnHome />} />
          <Route path="/learn/courses/:courseId" element={<CourseMap />} />
          <Route path="/learn/league" element={<LeaguePage />} />
          <Route path="/learn/profile" element={<ProfilePage />} />
        </Route>
        {/* Full-screen, no header */}
        <Route path="/learn/lessons/:lessonId" element={<RequireAuth roles={['student', 'admin']}><LessonPlayer /></RequireAuth>} />
        <Route path="/learn/practice" element={<RequireAuth roles={['student', 'admin']}><PracticePage /></RequireAuth>} />

        <Route path="/admin" element={<RequireAuth roles={['admin']}><AdminLayout /></RequireAuth>}>
          <Route index element={<AdminDashboard />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="courses/:courseId" element={<CourseBuilder />} />
          <Route path="lessons/:lessonId" element={<LessonEditor />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="students/:studentId" element={<StudentStats />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="applications" element={<AdminApplications />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
