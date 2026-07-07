type CourseCardProps = {
  title: string;
  difficulty: string;
  lessons: number;
  progress: number;
  thumbnail: string;
};

export function CourseCard({ title, difficulty, lessons, progress, thumbnail }: CourseCardProps) {
  return (
    <div className="w-[180px] shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="relative aspect-[4/3]">
        <img src={thumbnail} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="p-3">
        <p className="mb-1 truncate text-sm font-semibold text-gray-900">{title}</p>
        <div className="mb-2 flex items-center gap-2 text-[11px] text-gray-500">
          <span className="rounded-md bg-gray-100 px-1.5 py-0.5">{difficulty}</span>
          <span>{lessons} lessons</span>
        </div>
        {progress > 0 && (
          <>
            <div className="mb-1 h-1 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-orange-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[11px] text-gray-500">{progress}% complete</p>
          </>
        )}
      </div>
    </div>
  );
}
