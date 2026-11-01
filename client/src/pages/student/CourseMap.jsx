import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarClock, Check, Lock, Star } from 'lucide-react';
import CohortBoard from '../../components/CohortBoard';
import Mascot from '../../components/Mascot';
import { ErrorState, PageLoader, ProgressBar } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import { courseGlow, darken, formatDate, percent, timeUntil } from '../../lib/format';

// Horizontal offsets (px) that make the lesson path wind left and right
const PATH_OFFSETS = [0, 44, 70, 44, 0, -44, -70, -44];

function LessonNode({ lesson, index, color, selected, onSelect }) {
  const styles = {
    completed: { backgroundColor: '#FBBF24', boxShadow: `0 6px 0 ${darken('#FBBF24')}, 0 0 24px #FBBF2466` },
    available: { backgroundColor: color, boxShadow: `0 6px 0 ${darken(color)}, 0 0 32px ${color}aa` },
    locked: { backgroundColor: 'rgb(255 255 255 / 0.08)', boxShadow: '0 6px 0 rgb(255 255 255 / 0.04)', border: '1px solid rgb(255 255 255 / 0.1)' },
  };
  const Icon = { completed: Check, available: Star, locked: Lock }[lesson.state];

  return (
    <div className="relative flex flex-col items-center" style={{ transform: `translateX(${PATH_OFFSETS[index % PATH_OFFSETS.length]}px)` }}>
      {lesson.state === 'available' && !selected && (
        <span
          className="absolute -top-10 animate-float rounded-xl glass-strong px-3 py-1 text-xs font-black tracking-wide uppercase"
          style={{ color }}
        >
          Start
        </span>
      )}
      <button
        onClick={onSelect}
        aria-label={`${lesson.title} (${lesson.state})`}
        className="flex size-[72px] cursor-pointer items-center justify-center rounded-full transition active:translate-y-1 active:shadow-none!"
        style={styles[lesson.state]}
      >
        <Icon
          className={`size-8 ${lesson.state === 'locked' ? 'text-slate-500' : 'text-white'}`}
          fill={lesson.state === 'available' ? 'currentColor' : 'none'}
          strokeWidth={3}
        />
      </button>
    </div>
  );
}

function LessonPopover({ lesson, color, waiting }) {
  const navigate = useNavigate();
  return (
    <div className="mt-4 w-72 rounded-3xl p-4 text-white" style={lesson.state === 'locked' ? { backgroundColor: 'rgb(148 163 184 / 0.18)', border: '1px solid rgb(255 255 255 / 0.12)' } : { backgroundColor: color, boxShadow: `0 0 32px ${color}66` }}>
      <h3 className="text-lg font-black">{lesson.title}</h3>
      {lesson.state === 'locked' ? (
        <p className="font-semibold text-white/90">
          {waiting ? 'Unlocks when your cohort starts.' : 'Finish the lessons before this one to unlock it.'}
        </p>
      ) : (
        <>
          <p className="mb-3 font-semibold text-white/90">
            +{lesson.xp} XP · {lesson.exerciseCount} exercise{lesson.exerciseCount === 1 ? '' : 's'}
          </p>
          <button className="btn w-full bg-white shadow-[0_4px_0_rgba(0,0,0,0.15)] active:shadow-none" style={{ color }} onClick={() => navigate(`/learn/lessons/${lesson._id}`)} autoFocus>
            {lesson.state === 'completed' ? 'Practise again' : 'Start lesson'}
          </button>
        </>
      )}
    </div>
  );
}

export default function CourseMap() {
  const { courseId } = useParams();
  const { data, loading, error, reload } = useFetch(`/learn/courses/${courseId}`);
  const [selectedId, setSelectedId] = useState(null);

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { course, cohort, modules, completed, total } = data;
  const waiting = cohort && !cohort.started;

  return (
    <div className="pb-16">
      <div className="mb-8 rounded-3xl p-5 text-white" style={courseGlow(course.color, 6)}>
        <Link to="/learn" className="mb-3 inline-flex items-center gap-1 text-sm font-extrabold text-white/80 uppercase hover:text-white">
          <ArrowLeft className="size-4" /> All courses
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{course.emoji}</span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black">{course.title}</h1>
            <p className="font-semibold text-white/80">
              {completed} of {total} lessons complete
            </p>
          </div>
        </div>
        <ProgressBar value={percent(completed, total)} color="#fff" className="mt-4 h-3 bg-black/15" />
      </div>

      {waiting && (
        <div className="card mb-8 flex items-center gap-4">
          <Mascot size={72} className="shrink-0 animate-float" />
          <div>
            <p className="flex items-center gap-2 text-lg font-black">
              <CalendarClock className="size-5 text-neon-400" /> Starts in {timeUntil(cohort.startDate)}
            </p>
            <p className="font-semibold text-slate-400">
              {cohort.name} kicks off on {formatDate(cohort.startDate)}. Lessons unlock then. Get ready!
            </p>
          </div>
        </div>
      )}
      {cohort && <CohortBoard courseId={course._id} color={course.color} />}

      {modules.map((mod, moduleIndex) => (
        <section key={mod._id} className="mb-10">
          <div className="glass mb-10 rounded-2xl px-4 py-3">
            <p className="text-xs font-black tracking-wider text-slate-400 uppercase">Module {moduleIndex + 1}</p>
            <h2 className="text-lg font-black">{mod.title}</h2>
          </div>
          {mod.lessons.length === 0 ? (
            <p className="text-center font-semibold text-slate-400">Lessons coming soon</p>
          ) : (
            <div className="flex flex-col items-center gap-8">
              {mod.lessons.map((lesson, index) => (
                <div key={lesson._id} className="flex flex-col items-center">
                  <LessonNode
                    lesson={lesson}
                    index={index}
                    color={course.color}
                    selected={selectedId === lesson._id}
                    onSelect={() => setSelectedId(selectedId === lesson._id ? null : lesson._id)}
                  />
                  {selectedId === lesson._id && <LessonPopover lesson={lesson} color={course.color} waiting={waiting} />}
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
